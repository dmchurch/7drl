/** @template T @param {T} value @param {T} min @param {T} max */
export function inInclusiveRange(value, min, max) {
    return value >= min && value <= max;
}

/** @template T @param {T} value @param {T} min @param {T} max */
export function inSemiOpenRange(value, min, max) {
    return value >= min && value < max;
}

export function indexInArray(index = 0, {length = 0}) {
    return inSemiOpenRange(index, 0, length);
}

/** @returns {Promise<void>} */
export function after(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/**
 * @template T
 * @template {keyof T} K
 * @template V
 * @param {T} object @param {K} property @param {V} value
 */
export function memoize(object, property, value, writable = false, enumerable = false) {
    Object.defineProperty(object, property, {value, configurable: true, writable, enumerable});
    return value;
}

/** @type {<K extends number|string|symbol, V>(object: Partial<Record<K, V>>) => [K, V][]} */
export const typedEntries = Object.entries;
/** @type {<K extends number|string|symbol>(object: Partial<Record<K, any>>) => K[]} */
export const typedKeys = Object.keys;

/**
 * @template {string|number|symbol} K
 * @template V1
 * @template V2
 * @param {Record<K, V1>} source 
 * @param {(value: V1, key: K, index: number, entries: [K, V1]) => V2} mapFunc 
 * @returns {Record<K, V2>}
 */
export function mapEntries(source, mapFunc) {
    // @ts-ignore
    return Object.fromEntries(typedEntries(source).map(([k, v], i, a) => [k, mapFunc(v, k, i, a)]));
}

/**
 * @template {Element} [T=Element]
 * 
 * @param {string|Element} elementOrId 
 * @param {(new() => T)|((new() => T)[])} [expectedClass]
 * @param {boolean} [throwIfMissing] 
 * @param {boolean} [warnIfMissing] 
 * @returns {T}
 */
export function getElement(elementOrId, expectedClass=/** @type {new()=>T} */(Element), throwIfMissing=true, warnIfMissing=true) {
    const expectedClasses = Array.isArray(expectedClass) ? expectedClass : [expectedClass];
    const element = typeof elementOrId === "string" ? document.getElementById(elementOrId) : elementOrId;
    for (const expected of expectedClasses) {
        if (element instanceof expected) return element;
    }
    if (warnIfMissing) {
        console.warn("Expected element missing or wrong type!", elementOrId, expectedClass, element);
    }
    if (throwIfMissing) {
        throw new Error(`Expected to find element of type ${expectedClasses.map(c=>c.name).join("|")} with ${elementOrId}, instead found ${element}!`);
    }
    return undefined;
}

/** @param {string|Element} elementOrId  */
export function htmlElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLElement, throwIfMissing, warnIfMissing);
}

/** @param {string|Element} elementOrId  */
export function inputElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLInputElement, throwIfMissing, warnIfMissing);
}

/** @param {string|Element} elementOrId  */
export function textAreaElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLTextAreaElement, throwIfMissing, warnIfMissing);
}

/** @param {string|Element} elementOrId  */
export function selectElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLSelectElement, throwIfMissing, warnIfMissing);
}

/** @param {string|Element} elementOrId  */
export function meterElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLMeterElement, throwIfMissing, warnIfMissing);
}

/** @param {string|Element} elementOrId  */
export function outputElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLOutputElement, throwIfMissing, warnIfMissing);
}

/** @typedef {HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLOutputElement} HTMLValueElement */
/** @param {string|Element} elementOrId  */
export function valueElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, [/** @type {new() => HTMLValueElement} */(HTMLInputElement), HTMLTextAreaElement, HTMLSelectElement, HTMLOutputElement], throwIfMissing, warnIfMissing);
}

/** @returns {node is HTMLValueElement} */
export function isValueElement(node) {
    return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement || node instanceof HTMLOutputElement;
}

/** @param {string|Element} elementOrId  */
export function svgElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, SVGElement, throwIfMissing, warnIfMissing);
}

/** @param {string|Element} elementOrId  */
export function templateElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLTemplateElement, throwIfMissing, warnIfMissing);
}

/** @overload @param {string|Element} templateOrId @param {boolean} [alwaysReturnFragment] @returns {Element | DocumentFragment} */
/** @overload @param {string|Element} templateOrId @param {true} alwaysReturnFragment @returns {DocumentFragment} */
/** @param {string} templateOrId */
export function cloneTemplate(templateOrId, alwaysReturnFragment=false) {
    const template = templateElement(templateOrId);
    const fragment = /** @type {DocumentFragment} */(template.content.cloneNode(true));
    if (!alwaysReturnFragment && fragment.childElementCount === 1) {
        return fragment.firstElementChild;
    } else {
        return fragment;
    }
}
