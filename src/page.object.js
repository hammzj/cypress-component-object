import ElementCollection from './element.collection';
import {isNil} from "lodash";
import {clone} from "./utils";

/**
 * A page object is an extension of an ElementCollection that allows associating a URL with a custom path.
 * A page can represent a collection of nested ComponentObjects, individual element selectors without a component
 * object, or both.
 */
export default class PageObject extends ElementCollection {
    static #PATH_REPLACEMENT_REGEX = /(?<pathVariable>:\w+)/g;

    #baseUrl = Cypress.config().baseUrl;

    /**
     * @example new PageObject(''); //Index page
     * @example new PageObject('/settings/privacy'); //Page with a static path
     * @example new PageObject('/user/:userId/post/:postId'); //Page with path variables
     * @example new PageObject('/guides/overview/why-cypress', 'http://www.docs.cypress.io'); //External page
     * @param path {string} the page path can be set either statically, or with path variables that can be replaced with _customPathUrl()
     * @param baseUrl {string=} In the case that there is page that does not use the base URL, this can be set to reference that page
     */
    constructor(path = '', baseUrl) {
        super(() => cy.get(`body`));
        this.#path = path;
        if (baseUrl) this.#baseUrl = baseUrl;
    }

    /**
     * Returns the full URL associated with the page
     * @param pathInputs {...string} optional pathInputs for when the path contains path variables
     * @return pageURL {string}
     */
    url(...pathInputs) {
        if (pathInputs) {return this.#customPathUrl(...pathInputs)}
        return this.#urlObject().toString();
    }

    /**
     * @param pathInputs {...string} used to replace path variables. This should equal the same amount of path variables found; additional inputs will not be used
     * @return customUrl {string}
     * @example <summary>Replacing path variables with inputs</summary>
     * //baseUrl = `http://localhost:3000`
     * //this.#path = `/user/:userId/post/:postId`
     * this._customPathUrl('1234', 'post-9876') => `http://localhost:3000/user/1234/post/post-9876`
     * @example <summary>A path without path variables/summary>
     * //baseUrl = `http://localhost:3000`
     * //this.#path = `/settings/privacy`
     * this._customPathUrl('1234') => `http://localhost:3000/settings/privacy` //Will also log an error to the console!
     * @private
     */
    #customPathUrl(...pathInputs) {
        const matches = this.#path.match(PageObject.#PATH_REPLACEMENT_REGEX);
        if (isNil(matches)) {
            console.error('No path variables exist found for URL path: ' + this.#path);
            return this.#urlObject().toString();
        }
        //Deep copy the original path
        let replacedPath = this.#path.repeat(1);
        for (const pathVar of matches) {
            const sub = pathInputs.pop();
            if (isNil(sub)) {
                throw Error('Not enough path variables were supplied, so path cannot be substituted');
            }
            replacedPath = replacedPath.replace(pathVar, sub);
        }
        console.debug('replacedPath', replacedPath);
        return this.#urlObject(replacedPath).toString();
    }

    #urlObject(path = this.#path) {
        return new URL(path, this.#baseUrl);
    }

    __visit(...pathInputs) {
        cy.visit(this.url(...pathInputs));
    }

    __assertIsOnPage(...pathInputs) {
        const pageUrl = this.url(...pathInputs);
        cy.url().should('eq', pageUrl);
    }
}


