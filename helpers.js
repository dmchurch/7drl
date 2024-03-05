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