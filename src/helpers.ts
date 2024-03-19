import { RNG } from "rot-js";

/** @template T @param {T} value @param {T} min @param {T} max */
export function inInclusiveRange(value, min, max) {
    return value >= min && value <= max;
}

/** @template T @param {T} value @param {T} min @param {T} max */
export function inSemiOpenRange(value, min, max) {
    return value >= min && value < max;
}

/** @template T @param {T} value @param {T} min @param {T} max */
export function clamp(value, min, max) {
    return min != null && value < min ? min
         : max != null && value > max ? max
         : value;
}

export function indexInArray(index = 0, {length = 0}) {
    return inSemiOpenRange(index, 0, length);
}

/** @template {{[i: number]: any, length: number}} T @param {T} arrayLike */
export function scramble(arrayLike) {
    const {length} = arrayLike;
    for (let i = 0; i < length - 1; i++) {
        const index = RNG.getUniformInt(i, length - 1);
        if (index != i) {
            const x = arrayLike[i];
            arrayLike[i] = arrayLike[index];
            arrayLike[index] = x;
        }
    }
    return arrayLike;
}

/** @returns {Promise<void>} */
export function after(ms) {
    let resolver = null;
    let timedOut = false;
    const promise = new Promise(r => (timedOut ? r() : (resolver = r)));
    setTimeout(() => (timedOut = true, resolver?.()), ms);
    return promise;
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

/**
 * @template T
 * @template S
 * @template {keyof T & keyof S} K
 * @param {{prototype: T}} targetClass
 * @param {{prototype: S}} sourceClass
 * @param {K} member 
 * @returns {S[K]}
 */
export function copyImplementation(targetClass, sourceClass, member, writable = false, enumerable = false) {
    return memoize(targetClass.prototype, member, sourceClass.prototype[member], writable, enumerable);
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
 * @template {string|number|symbol} K
 * @template V
 * @template {(value: V, key: K, index: number, entries: [K, V]) => boolean} F
 * @param {Record<K, V>} source 
 * @param {F} mapFunc 
 * @returns {Record<K, F extends (value: V, key: K, index:number, entries:[K, V]) => value is infer V2 ? V2 : V>}
 */
export function filterEntries(source, mapFunc) {
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

/**
 * An array wrapper optimized for FIFO enqueue/dequeue with minimal allocations
 * @template T
 * @implements {IterableIterator<T>}
 */
export class Queue {
    /** @type {T[]} */
    array;

    ringLength = 0;
    ringItemCount = 0;
    readPosition = 0;
    writePosition = 0;
    count = 0;

    /** @type {T} */
    value; // for IteratorResult
    iterateLimit = Infinity;

    get capacity() { return this.array.length; }
    get empty() { return this.readPosition === this.writePosition; }
    get done() { return (this.iterateLimit <= 0 || this.empty) && this.value == null }

    constructor(initialCapacity = 0) {
        this.array = new Array(initialCapacity);
    }

    [Symbol.iterator]() {
        this.value = null;
        return this;
    }

    next() {
        this.value = this.iterateLimit <= 0 ? null : this.dequeue();
        return this;
    }

    /** @param {T} item  */
    enqueue(item) {
        this.count++; // enqueue will always succeed
        const {array, readPosition, writePosition, count, ringLength, ringItemCount} = this;
        const {length} = array; // length before possibly pushing
        array[writePosition] = item; // we will always write to the current write position

        // where does the write position go next?
        if (writePosition === length) { // currently writing to end of array, keep doing so
            this.writePosition = array.length; // this has increased because of the write
        } else if (writePosition + 1 === readPosition || (writePosition === length - 1 && readPosition === 0)) {
            // about to crash into the read head, so maybe don't
            this.writePosition = length;
            this.ringLength = length;
            this.ringItemCount = length;
        } else {
            this.writePosition = (writePosition + 1) % length; // otherwise just advance the write head
        }
        return count;
    }

    enqueueAll(items) {
        if (items === this && !isFinite(this.iterateLimit)) return;
        for (const item of items) {
            this.enqueue(item);
        }
    }

    /** @returns {T} */
    dequeue() {
        const {array, readPosition, writePosition, ringLength, ringItemCount} = this;
        if (readPosition === writePosition) { // empty queue
            this.count = 0;
            return null;
        }
        this.count--;
        if (ringItemCount === 1) { // just read the last item from the old ring
            this.readPosition = ringLength;
            this.writePosition = 0;
            this.ringLength = this.ringItemCount = 0;
        } else if (ringItemCount > 1) {
            this.ringItemCount = ringItemCount - 1;
            this.readPosition = (readPosition + 1) % ringLength;
        } else { // standard ring
            this.readPosition = (readPosition + 1) % array.length;
        }
        return array[readPosition];
    }

    /** @returns {IterableIterator<T>} */
    dequeueMany(limit = Infinity) {
        this.value = null;
        this.iterateLimit = limit;
        return this;
    }

    clear() {
        this.ringLength = this.ringItemCount = this.readPosition = this.writePosition = this.count = 0;
    }
}

Object.assign(self, {Queue});