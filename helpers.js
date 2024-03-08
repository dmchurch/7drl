/** @template T @param {T} value @param {T} min @param {T} max */
export function inInclusiveRange(value, min, max) {
    return value >= min && value <= max;
}

/** @template T @param {T} value @param {T} min @param {T} max */
export function inSemiOpenRange(value, min, max) {
    return value >= min && value < max;
}

/** @param {Partial<BoundingBox>} bbox */
export function inBBox({x: [xMin, xMax] = [-Infinity, Infinity],
                        y: [yMin, yMax] = [-Infinity, Infinity],
                        z: [zMin, zMax] = [-Infinity, Infinity]},
                        x = 0, y = 0, z = 0) {
    return inInclusiveRange(x, xMin, xMax) 
        && inInclusiveRange(y, yMin, yMax)
        && inInclusiveRange(z, zMin, zMax);
}

/** @param {BoundingBox} bbox  */
export function setBBox(bbox, x = 0, y = 0, z = 0, w = 0, h = 0, d = 0) {
    bbox.x[0] = x;
    bbox.x[1] = x + w - 1;
    bbox.y[0] = y;
    bbox.y[1] = y + h - 1;
    bbox.z[0] = z;
    bbox.z[1] = z + d - 1;
    return bbox;
}

/** @param {BoundingBox} bbox @param {(x: number, y: number, z: number) => any} callback  */
export function walkBBox(bbox, callback) {
    const {x: [xMin, xMax], y: [yMin, yMax], z: [zMin, zMax]} = bbox;
    for (let z = zMin; z <= zMax; z++) {
        for (let y = yMin; y <= yMax; y++) {
            for (let x = xMin; x <= xMax; x++) {
                callback(x, y, z);
            }
        }
    }
}

export function indexInArray(index = 0, {length = 0}) {
    return inSemiOpenRange(index, 0, length);
}

/** @returns {Promise<void>} */
export function after(ms) {
    return new Promise(r => setTimeout(r, ms));
}

/** @returns {Promise<DOMHighResTimeStamp>} */
export function animationFrame() {
    return new Promise(r => requestAnimationFrame(r));
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

/** @type {<O>(object: O) => {[K in keyof O]: [K, O[K]]}[keyof O][]} */
export const typedEntries = Object.entries;
/** @type {<K extends number|string|symbol>(object: Partial<Record<K, any>>) => K[]} */
export const typedKeys = Object.keys;
/** @type {<E extends [string|number|symbol, any]>(entries: E[]) => Record<E[0], E[1]>} */
export const fromTypedEntries = Object.fromEntries;
/** @type {<E extends [string|number|symbol, any]>(entries: E[]) => {[K in E[0]]: Extract<E, [K, any]>[1]}} */
export const fromStrictTypedEntries = Object.fromEntries;
/** @type {<T extends [...any]>(...items: T) => T} */ // @ts-ignore
export const tuple = Array.of;
/** @type {<const T extends [...any]>(...items: T) => T} */ // @ts-ignore
export const strictTuple = Array.of;

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
    return fromTypedEntries(typedEntries(source).map(([k, v], i, a) => [k, mapFunc(v, k, i, a)]));
}

/**
 * @template {any[]} A
 * @template {[string|number|symbol, any]} E
 * @param {A} source 
 * @param {(item: A[number], index: number, array: A) => E} entryMapFunc
 */
export function mapToEntries(source, entryMapFunc) {
    return fromTypedEntries(source.map(entryMapFunc))
}

/**
 * @template {string|number|symbol} K
 * @template V
 * @param {K[]} source 
 * @param {(key: K, index: number, array: K[]) => V} entryMapFunc 
 */
export function mapToValues(source, entryMapFunc) {
    return fromTypedEntries(source.map((k, i, a) => tuple(k, entryMapFunc(k, i, a))));
}

/**
 * @template {Record<string|number|symbol, any>} O
 * @param {O} map
 * @returns {{
 *  [V in {
 *      [K in keyof O]: O[K]
 *      }[keyof O]]: {
 *          [K in keyof O]: [K, O[K]]
 *      }[keyof O] extends infer E ? E extends [infer K, V] ? K : never : never
 * }}
 */
export function invertMap(map) {
    return fromStrictTypedEntries(typedEntries(map).map(([k, v]) => [v, k]));
}

/**
 * @template {Element} [T=Element]
 * 
 * @param {string|EventTarget} elementOrId 
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

/** @param {string|EventTarget} elementOrId  */
export function htmlElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLElement, throwIfMissing, warnIfMissing);
}

/** @param {string|EventTarget} elementOrId  */
export function inputElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLInputElement, throwIfMissing, warnIfMissing);
}

/** @param {string|EventTarget} elementOrId  */
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
export function dialogElement(elementOrId, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLDialogElement, throwIfMissing, warnIfMissing);
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
