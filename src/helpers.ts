import { RNG } from "rot-js";

export function inInclusiveRange<T>(value: T, min: T, max: T) {
    return value >= min && value <= max;
}

export function inSemiOpenRange<T>(value: T, min: T, max: T) {
    return value >= min && value < max;
}

export function clamp<T>(value: T, min: T, max: T) {
    return min != null && value < min ? min
         : max != null && value > max ? max
         : value;
}

export function indexInArray(index = 0, {length = 0}) {
    return inSemiOpenRange(index, 0, length);
}

export function scramble<T extends {[i: number]: any, length: number}>(arrayLike: T) {
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

export function after(ms: number): Promise<void> {
    let resolver = null;
    let timedOut = false;
    const promise = new Promise<void>(r => (timedOut ? r() : (resolver = r)));
    setTimeout(() => (timedOut = true, resolver?.()), ms);
    return promise;
}

export function animationFrame(): Promise<DOMHighResTimeStamp> {
    return new Promise(r => requestAnimationFrame(r));
}

export function memoize<T, K extends keyof T, V>(object: T, property: K, value: V, writable = false, enumerable = false) {
    Object.defineProperty(object, property, {value, configurable: true, writable, enumerable});
    return value;
}

export function copyImplementation<T, S, K extends keyof T & keyof S>(targetClass: { prototype: T; }, sourceClass: { prototype: S; }, member: K, writable = false, enumerable = false): S[K] {
    return memoize(targetClass.prototype, member, sourceClass.prototype[member], writable, enumerable);
}

type JSProp = string | number | symbol;
interface TypedEntriesFunc {
    <K extends JSProp, V>(object: Record<K, V>): [K, V][];
    <O>(object: O): { [K in keyof O]: [K, O[K]]; }[keyof O][];
}
interface StrictTypedEntriesFunc {
    <O>(object: O): { [K in keyof O]: [K, O[K]]; }[keyof O][];
}

export const typedEntries: TypedEntriesFunc = Object.entries;
export const strictTypedEntries: StrictTypedEntriesFunc = Object.entries;
export const typedKeys: <K extends JSProp>(object: Partial<Record<K, any>>) => K[] = Object.keys;
export const fromTypedEntries: <const E extends [JSProp, any]>(entries: E[]) => Record<E[0], E[1]> = Object.fromEntries;
export const fromStrictTypedEntries: <const E extends [JSProp, any]>(entries: E[]) => { [K in E[0]]: Extract<E, [K, any]>[1]; } = Object.fromEntries;
export const tuple: <T extends [...any]>(...items: T) => T = Array.of as any;
export const strictTuple: <const T extends [...any]>(...items: T) => T = Array.of as any;

export function mapEntries<K extends JSProp, V1, V2>(source: Record<K, V1>, mapFunc: (value: V1, key: K, index: number, entries: [K, V1][]) => V2): Record<K, V2> {
    return fromTypedEntries(typedEntries(source).map(([k, v], i, a) => [k, mapFunc(v, k, i, a)]));
}

export function filterEntries<
        K extends string | number | symbol,
        V,
        F extends (value: V, key: K, index: number, entries: [K, V][]) => boolean>(
            source: Record<K, V>,
            filterFunc: F): Record<K, V> {
    return fromTypedEntries(typedEntries(source).filter(([k, v], i, a) => filterFunc(v, k, i, a)));
}

export function mapToEntries<const A extends readonly any[], E extends [JSProp, any]>(source: A, entryMapFunc: (item: A[number], index: number, array: A) => E) {
    return fromTypedEntries(source.map((v, k) => entryMapFunc(v, k, source)));
}

export function mapToValues<K extends JSProp, V>(source: K[], entryMapFunc: (key: K, index: number, array: K[]) => V) {
    return fromTypedEntries(source.map((k, i, a) => tuple(k, entryMapFunc(k, i, a))));
}

export function invertMap<O extends Record<JSProp, any>>(map: O): {
    [V in {
        [K in keyof O]: O[K]
        }[keyof O]]: {
            [K in keyof O]: [K, O[K]]
        }[keyof O] extends infer E ? E extends [infer K, V] ? K : never : never
} {
    return fromStrictTypedEntries(strictTypedEntries(map).map(([k, v]) => [v, k]));
}

export function getElement<T extends Element = Element>(elementOrId: string | EventTarget,
                                                        expectedClass: (new () => T) | ((new () => T)[]),
                                                        throwIfMissing = true,
                                                        warnIfMissing = true): T {
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

export function htmlElement(elementOrId: string | EventTarget, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLElement, throwIfMissing, warnIfMissing);
}

export function inputElement(elementOrId: string | EventTarget, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLInputElement, throwIfMissing, warnIfMissing);
}

export function textAreaElement(elementOrId: string | EventTarget, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLTextAreaElement, throwIfMissing, warnIfMissing);
}

export function selectElement(elementOrId: string | Element, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLSelectElement, throwIfMissing, warnIfMissing);
}

export function meterElement(elementOrId: string | Element, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLMeterElement, throwIfMissing, warnIfMissing);
}

export function outputElement(elementOrId: string | Element, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLOutputElement, throwIfMissing, warnIfMissing);
}

export type HTMLValueElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLOutputElement;

export function valueElement(elementOrId: string | Element, throwIfMissing=true, warnIfMissing=true): HTMLValueElement {
    return getElement<HTMLValueElement>(elementOrId, [HTMLInputElement, HTMLTextAreaElement, HTMLSelectElement, HTMLOutputElement], throwIfMissing, warnIfMissing);
}

export function isValueElement(node): node is HTMLValueElement {
    return node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement || node instanceof HTMLOutputElement;
}

export function svgElement(elementOrId: string | Element, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, SVGElement, throwIfMissing, warnIfMissing);
}

export function dialogElement(elementOrId: string | Element, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLDialogElement, throwIfMissing, warnIfMissing);
}

export function templateElement(elementOrId: string | Element, throwIfMissing=true, warnIfMissing=true) {
    return getElement(elementOrId, HTMLTemplateElement, throwIfMissing, warnIfMissing);
}

export function cloneTemplate(templateOrId: string | HTMLTemplateElement, alwaysReturnFragment: true): DocumentFragment;
export function cloneTemplate(templateOrId: string | HTMLTemplateElement, alwaysReturnFragment?: boolean): DocumentFragment | Element;
export function cloneTemplate(templateOrId: string | HTMLTemplateElement, alwaysReturnFragment?: boolean): DocumentFragment | Element {
    const template = templateElement(templateOrId);
    const fragment = template.content.cloneNode(true) as DocumentFragment;
    if (!alwaysReturnFragment && fragment.childElementCount === 1) {
        return fragment.firstElementChild;
    } else {
        return fragment;
    }
}

export interface IteratorStrictResult<T> {
    value: T;
    done: boolean;
}

/**
 * An array wrapper optimized for FIFO enqueue/dequeue with minimal allocations
 */
export class Queue<T> implements IterableIterator<T>, IteratorStrictResult<T> {
    array: T[];

    ringLength = 0;
    ringItemCount = 0;
    readPosition = 0;
    writePosition = 0;
    count = 0;

    value: T; // for IteratorResult
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

    enqueue(item: T) {
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

    dequeue(): T {
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

    dequeueMany(limit = Infinity): IterableIterator<T> {
        this.value = null;
        this.iterateLimit = limit;
        return this;
    }

    clear() {
        this.ringLength = this.ringItemCount = this.readPosition = this.writePosition = this.count = 0;
    }
}

Object.assign(self, {Queue});