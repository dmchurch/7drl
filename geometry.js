import { RNG } from "rot-js";
import { Queue, copyImplementation, inInclusiveRange, scramble } from "./helpers.js";

/** @typedef {`${'+'|'-'}${number}`} CoordinateValueRepr */
/** @typedef {`${CoordinateValueRepr}${CoordinateValueRepr}${CoordinateValueRepr}`} CoordinateKey */

/**
 * Javascript does not have overridable equality tests like other languages, so
 * Coord is an immutable partial-singleton class that has only one instance per coordinate triplet, so they
 * can be used in `===` checks and in {@link Set}s and as {@link Map} keys.
 * 
 * Be aware that this would be a source of memory leak if used on an infinite world!
 */
export class Coord {
    /** @readonly */ static ABORT = Symbol("Coord.ABORT");

    /** @readonly @type {{[z: number]: {[y: number]: {[x: number]: Coord}}}} */
    static #knownCoords = {};
    /** @type {{readonly [z: number]: {readonly [y: number]: {readonly [x: number]: Coord}}}} */
    static get knownCoords() { return this.#knownCoords; }

    /** @readonly */ static Zero = new Coord(0, 0, 0);
    /** @readonly */ static UnitX = new Coord(1, 0, 0);
    /** @readonly */ static UnitY = new Coord(0, 1, 0);
    /** @readonly */ static UnitZ = new Coord(0, 0, 1);
    /** @readonly */ static NegX = new Coord(-1, 0, 0);
    /** @readonly */ static NegY = new Coord(0, -1, 0);
    /** @readonly */ static NegZ = new Coord(0, 0, -1);

    /** @returns {CoordinateValueRepr} */
    static valueRepr(v = 0) {
        return v >= 0 ? `+${v}` : `-${Math.abs(v)}`;
    }

    /** @readonly @type {symbol} */ key;
    /** @readonly @type {number} */ x;
    /** @readonly @type {number} */ y;
    /** @readonly @type {number} */ z;

    /** @returns {CoordinateKey} */
    static coordKey(x = 0, y = 0, z = 0) {
        return `${this.valueRepr(x)}${this.valueRepr(y)}${this.valueRepr(z)}`
    }

    static XYZ(x = 0, y = 0, z = 0) {
        return this.#knownCoords[z]?.[y]?.[x] ?? new this(x, y, z);
    }

    /** @private */
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.key = Symbol(`Coord(${x}, ${y}, ${z})`);
        return ((new.target.#knownCoords[z] ??= {})[y] ??= {})[x] ??= this;
    }

    toString() {
        return this.key.description;
    }

    negate() {
        return Coord.XYZ(-this.x, -this.y, -this.z);
    }

    plus(x = 0, y = x, z = y) {
        return Coord.XYZ(this.x + x, this.y + y, this.z + z);
    }

    minus(x = 0, y = x, z = y) {
        return Coord.XYZ(this.x - x, this.y - y, this.z - z);
    }

    times(x = 1, y = x, z = y) {
        return Coord.XYZ(this.x * x, this.y * y, this.z * z);
    }

    modulo(x = 1, y = x, z = y) {
        return Coord.XYZ(this.x % x, this.y % y, this.z % z);
    }

    wholeDividedBy(x = 1, y = x, z = y) {
        const dividend = this.minus(this.x % x, this.y % y, this.z % z);
        return Coord.XYZ(dividend.x / x,
                         dividend.y / y,
                         dividend.z / z);
    }
    
    roughlyDividedBy(x = 1, y = x, z = y) {
        return Coord.XYZ(Math.round(this.x / x),
                         Math.round(this.y / y),
                         Math.round(this.z / z));
    }
    
    plusTimes(other, x = 1, y = x, z = y) {
        return this.plus(other.x * x, other.y * y, other.z * z);
    }

    static distance(x = 0, y = 0, z = 0) {
        const {abs, max} = Math;
        return max(abs(x), abs(y)) + abs(z);
    }

    /** @param {CoordLike} other */
    distanceFrom(other) {
        return Coord.distance(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    
    /** @param {CoordLike} other */ add(other)          { return this.plus(other.x, other.y, other.z); }
    /** @param {CoordLike} other */ subtract(other)     { return this.minus(other.x, other.y, other.z); }
    /** @param {CoordLike} other */ multiply(other)     { return this.times(other.x, other.y, other.z); }
    /** @param {CoordLike} other */ remainder(other)    { return this.modulo(other.x, other.y, other.z); }
    /** @param {CoordLike} other */ wholeDivide(other)  { return this.wholeDividedBy(other.x, other.y, other.z); }
    /** @param {CoordLike} other */ roughDivide(other)  { return this.roughlyDividedBy(other.x, other.y, other.z); }
}

/** @implements {CoordSet} */
export class BaseCoordSet {
    /** @type {IteratorResult<Coord>} */
    iteratorResult;

    /** @this {CoordSet} @returns {IterableIterator<Coord>} */
    [Symbol.iterator]() {
        this.rewindCoords();
        return this;
    }

    /** @returns {boolean} */
    get potentiallyUnbounded() { throw new Error("Not implemented"); }
    rewindCoords() { }
    resetCoords(rewind = true) {
        if (rewind) this.rewindCoords();
    }
    randomizeCoords(rewind = true) {
        if (rewind) this.rewindCoords();
    }
    /** @returns {Coord | null} */
    nextCoord() { throw new Error("Not implemented"); }

    /** @this {CoordSet & {iteratorResult: BaseCoordSet["iteratorResult"]}} */
    next() {
        const value = this.nextCoord();

        const result = this.iteratorResult ??= {value};

        if (value) {
            result.value = value;
            result.done = false;
        } else {
            result.value = null;
            result.done = true;
        }
        return result;
    }

    /** @param {Coord} coord */
    includes(coord) {
        for (const c of this) {
            if (c === coord) return true;
        }
        return false;
    }

    /** @this {CoordSet} */
    countCoords(exact = false) {
        if (!exact && this.potentiallyUnbounded) return 0;
        let total = 0;
        this.walkCoords(c => total++);
        return total;
    }

    /** @this {CoordSet} @param {(c: Coord) => unknown | typeof Coord.ABORT} callback  */
    walkCoords(callback) {
        for (const c of this) {
            if (callback(c) === Coord.ABORT) break;
        }
    }

    /** @this {CoordSet} */
    getCoords(limit = Infinity, rewindFirst = true) {
        if (rewindFirst) this.rewindCoords();
        const inexactCount = this.countCoords(false);
        const coords = new ArrayCoordSet(Number.isInteger(inexactCount) && inexactCount >= 0 ? inexactCount : 0);
        let i;
        if (limit === Infinity && inexactCount > 0) {
            limit = inexactCount * 10;
        }
        for (i = 0; i < limit; i++) {
            const c = this.nextCoord();
            if (!c) break;
            coords[i] = c;
        }
        coords.length = i;
        return coords;
    }

    getCenterCoord() {
        let tx = 0, ty = 0, tz = 0;
        let count = 0;
        for (const {x, y, z} of this) {
            count++;
            tx += x;
            ty += y;
            tz += z;
        }
        if (!count) return null;
        return Coord.XYZ(tx, ty, tz).roughlyDividedBy(count);
    }

    /** @this {CoordSet} @param {(c: Coord) => boolean | typeof Coord.ABORT} predicate */
    filterCoords(predicate) {
        return new FilteredCoords(this, predicate);
    }

    /** @this {CoordSet} @param {number} limit */
    limitCoords(limit) {
        return new LimitedCoords(this, limit);
    }

    /** @template T @this {CoordSet} @param {(c: Coord) => T | typeof Coord.ABORT} callback */
    mapCoords(callback) {
        /** @type {T[]} */
        const results = new Array(this.countCoords(false));
        let i = 0;
        for (const c of this) {
            const r = callback(c);
            if (r === Coord.ABORT) {
                break;
            }
            results[i++] = r;
        }
        results.length = i;
        return results;
    }
}

/** @extends {Array<Coord>} @implements {CoordSet} */
export class ArrayCoordSet extends Array {
    index = 0;

    get potentiallyUnbounded() { return false; }

    rewindCoords() {
        this.index = 0;
    }
    randomizeCoords(rewind = true) {
        scramble(this);
        if (rewind) this.rewindCoords();
    }
    resetCoords(rewind = true) {
        if (rewind) this.rewindCoords();
    }

    nextCoord() {
        if (this.index >= this.length) return null;
        return this[this.index++];
    }

    countCoords() {
        return this.length;
    }

    getCoords(limit = Infinity) {
        if (limit >= this.length) return this;
        return /** @type {ArrayCoordSet} */(this.slice(0, limit));
    }

    /** @param {(c: Coord) => unknown | typeof Coord.ABORT} callback */
    walkCoords(callback) {
        for (let i = 0; i < this.length; i++) {
            if (callback(this[i]) === Coord.ABORT) return;
        }
    }

    [Symbol.iterator]()  { return copyImplementation(ArrayCoordSet, BaseCoordSet, Symbol.iterator).call(this); }
    get next()           { return copyImplementation(ArrayCoordSet, BaseCoordSet, "next"); }
    get mapCoords()      { return copyImplementation(ArrayCoordSet, BaseCoordSet, "mapCoords"); }
    get filterCoords()   { return copyImplementation(ArrayCoordSet, BaseCoordSet, "filterCoords"); }
    get limitCoords()    { return copyImplementation(ArrayCoordSet, BaseCoordSet, "limitCoords"); }
    get getCenterCoord() { return copyImplementation(ArrayCoordSet, BaseCoordSet, "getCenterCoord"); }
}

export class DerivedCoordSet extends BaseCoordSet {
    source;
    
    get potentiallyUnbounded() { return this.source.potentiallyUnbounded; }

    /** @param {CoordSet} sourceSet */
    constructor(sourceSet) {
        super();
        this.source = sourceSet;
    }

    rewindCoords() {
        this.source.rewindCoords();
    }

    randomizeCoords(rewind = true) {
        this.source.randomizeCoords(false);
        super.randomizeCoords(rewind);
    }

    nextCoord() {
        return this.source.nextCoord();
    }

    countCoords(exact = false) {
        return this.source.countCoords(exact);
    }
}

export class FilteredCoords extends DerivedCoordSet {
    predicate;

    /** @param {CoordSet} sourceSet @param {(c: Coord) => boolean | typeof Coord.ABORT} predicate  */
    constructor(sourceSet, predicate) {
        super(sourceSet);
        this.predicate = predicate;
    }

    nextCoord() {
        let c;
        while (c = super.nextCoord()) {
            const r = this.predicate(c);
            if (r === Coord.ABORT) break;
            else if (r) return c;
        }
        return null;
    }
}

export class LimitedCoords extends DerivedCoordSet {
    limit;
    count = 0;

    get potentiallyUnbounded() { return !isFinite(this.limit); }

    /** @param {CoordSet} sourceSet @param {number} limit  */
    constructor(sourceSet, limit) {
        super(sourceSet);
        this.limit = limit;
    }

    rewindCoords() {
        this.count = 0;
        super.rewindCoords();
    }

    nextCoord() {
        if (this.count >= this.limit) return null;
        this.count++;
        return super.nextCoord();
    }
}

/** A Line is a list of coordinates with an origin, a delta, and a minimum and maximum factor (thus you can have infinite lines) */
export class Line extends BaseCoordSet {
    origin = Coord.Zero;
    delta = Coord.Zero;
    min = 0;
    max = 0;

    /** @type {Coord} */
    cursor;
    count = 0;

    /** @type {number[]} */
    lineOrder;

    get potentiallyUnbounded() { return !isFinite(this.min) || !isFinite(this.max); }

    get startIndex() {
        const {min, max} = this;
        return isFinite(min) ? min
             : isFinite(max) ? max
             : 0; // start at origin
    }

    get endIndex() {
        const {min, max} = this;
        return isFinite(min) ? max
             : isFinite(max) ? min // -Infinity, presumably
             : NaN; // counting towards both +Infinity and -Infinity
    }

    constructor(origin = Coord.Zero, delta = Coord.Zero, count=Infinity, start=0) {
        super();

        this.set(origin, delta, count, start);
    }

    copy() {
        const {origin, delta, min, max} = this;
        return new Line(origin, delta, isFinite(min) ? max - min + 1 : max, min)
    }

    /** @param {Coord} origin @param {Coord} delta */
    set(origin, delta, count=Infinity, start=0) {
        this.origin = origin;
        this.delta = delta;
        this.min = start;
        this.max = start + count - 1;
        return this;
    }

    countCoords() {
        let {min, max} = this;
        if (max < min) {
            return 0;
        }
        return max - min + 1;
    }

    /** @param {Coord} coord  */
    includes(coord) {
        const {origin, delta} = this;
        return coord.subtract(origin).remainder(delta) === Coord.Zero; // oh that feels good
    }

    rewindCoords() {        
        let {origin, delta, min, max, lineOrder} = this;

        if (max < min) {
            this.cursor = null; // zero-length line doesn't have elements
            return;
        }

        if (lineOrder) { // preordered line, count is index into list
            this.count = 0;
            return;
        }

        // rewrite properties to be more useful to us
        if (!isFinite(min) && isFinite(max)) { // [-∞, N]
            // flip it around so we're going [-N, ∞]
            this.delta = delta = delta.negate();
            this.min   = -max;
            this.max   =  max  = -min;
            min = this.min;
        }
        if (isFinite(min) && min !== 0) { // [±N, ?]
            this.origin = origin = origin.plusTimes(delta, min);
            this.max = max -= min; // Infinity - N === Infinity
            this.min = min = 0;
        }

        this.cursor = this.origin;
        this.count = min === 0 ? max + 1 : 0;
    }

    resetCoords(rewind = true) {
        this.lineOrder = null;
        super.resetCoords(rewind);
    }

    randomizeCoords(rewind = true) {
        if (this.potentiallyUnbounded) throw new Error("Can't randomize unbounded line");

        const {min, max, lineOrder = this.lineOrder ??= []} = this;

        lineOrder.length = this.countCoords();

        for (let i = 0, v = min; v <= max; i++, v++) {
            lineOrder[i] = v;
        }

        scramble(this.lineOrder);
        super.randomizeCoords(rewind);
    }

    nextCoord() {
        const {cursor, delta, min, count, lineOrder} = this;
        if (lineOrder) {
            if (count >= lineOrder.length) {
                return null;
            } else {
                this.count = count + 1;
                return this.origin.plusTimes(delta, lineOrder[count]);
            }
        }
        if (cursor) {
            if (min !== 0) {
                // double-ended lines are weird, they count up from 0 alternating signs
                this.count = count <= 0 ? -count + 1 : -count;
                this.cursor = this.origin.plusTimes(delta, count);
            } else if (count <= 0) { // have reached the end of standard line
                this.cursor = null;
                return null;
            } else { // standard line
                this.cursor = cursor.add(delta);
                this.count = count - 1; // Infinity - 1 === Infinity
            }
        }
        return cursor;
    }
}

/** A Shape is a collection of lines */
export class Shape extends BaseCoordSet {
    // /** @type {Iterator<Line>} */
    // lineIterator;
    /** @type {Line} */
    currentLine;
    lineIndex = 0;
    /** @type {Line[]} */
    currentLines;
    /** @type {Record<number, number>} */
    currentWeights;

    get potentiallyUnbounded() { return false; }

    /** @returns {number} */
    countLines() {
        throw new Error("not implemented");
    }

    countCoords() {
        let total = 0;
        for (let i = 0;; i++) {
            const line = this.getLine(i);
            if (!line) return total;
            total += line.countCoords();
        }
    }

    /** @param {Line[]} [lines]  */
    getLines(lines) {
        lines ??= [];
        this.rewindCoords();
        for (let i = 0;; i++) {
            const line = this.getLine(i)?.copy();
            if (line) {
                lines[i] = line;
            } else {
                lines.length = i;
                break;
            }
        }
        return lines;
    }

    /** @returns {Line} */
    getLine(i = 0) {
        return null;
    }

    rewindCoords() {
        this.currentLine = null;
        this.lineIndex = 0;
        this.currentLines?.forEach((line, i) => {
            line.rewindCoords();
            this.currentWeights[i] = line.countCoords() || 1;
        });
        super.rewindCoords();
    }

    randomizeCoords(rewind = true) {
        if (this.potentiallyUnbounded) {
            throw new Error(`Can't randomize unbounded Shape of type ${this.constructor?.name}: ${this}`);
        }
        this.currentLines = this.getLines(this.currentLines);
        /** @type {number[]} */(this.currentWeights ??= []).length = this.currentLines.length;
        this.currentLines?.forEach((line) => {
            line.randomizeCoords(false);
        });

        super.randomizeCoords(rewind);
    }

    /** @returns {Line | null} */
    nextLine() {
        return this.getLine(this.lineIndex++);
    }

    nextCoord() {
        const {currentLines, currentWeights} = this;
        while (currentLines && currentWeights) {
            const lineIndex = parseInt(RNG.getWeightedValue(currentWeights));
            const line = currentLines[lineIndex];
            if (!line || currentWeights[lineIndex] <= 0) {
                return null;
            }
            const coord = line.nextCoord();
            if (coord) {
                currentWeights[lineIndex] = Math.max(currentWeights[lineIndex] - 1, 1);
                return coord;
            } else {
                currentWeights[lineIndex] = 0;
                // go through the loop again
            }
        }
        let {currentLine} = this;
        do {
            const coord = currentLine?.nextCoord();
            if (coord) return coord;

            currentLine = this.nextLine();
            if (currentLine) {
                currentLine.rewindCoords();
                this.currentLine = currentLine; // let the empty line sit there to avoid GC
            }
        } while (currentLine);
        return null;
    }
}

/** Represents an on-layer ring of cells at an exact radius */
export class Circle extends Shape {
    center;
    radius;
    #line;

    /** @param {Coord} center @param {number} radius */
    constructor(center, radius) {
        super();
        this.center = center;
        this.radius = radius;
        this.#line = new Line(center, Coord.Zero, 1);
    }

    /** @param {Coord} center @param {number} radius */
    set(center = this.center, radius = this.radius) {
        this.center = center;
        this.radius = radius;
        return this;
    }

    /** @returns {number} */
    countLines(radius = this.radius) {
        return radius < 0 ? 0 : radius === 0 ? 1 : 4;
    }

    countCoords(radius = this.radius) {
        return radius < 0 ? 0 : radius === 0 ? 1 : 8 * radius;
    }

    getLine(i = 0, center = this.center, radius = this.radius) {
        if (radius > 0) {
            if (i === 0) {
                return this.#line.set(center.plus(-radius, -radius, 0), Coord.UnitX, 2 * radius);
            } else if (i === 1) {
                return this.#line.set(center.plus(radius, -radius, 0), Coord.UnitY, 2 * radius);
            } else if (i === 2) {
                return this.#line.set(center.plus(radius, radius, 0), Coord.NegX, 2 * radius);
            } else if (i === 3) {
                return this.#line.set(center.plus(-radius, radius, 0), Coord.NegY, 2 * radius);
            }
        } else if (radius === 0 && i === 0) {
            return this.#line.set(center, Coord.Zero, 1);
        }

        return null;
    }
}

/** Represents a d8 of cells at an exact radius */
export class Sphere extends Circle {
    countLines(radius = this.radius) {
        return radius <= 0 ? super.countLines(radius) : 2 + (radius * 2 - 1) * 4;
    }
    countCoords(radius = this.radius) {
        const radiusCoords = super.countCoords(radius);
        const unitCoords = super.countCoords(1);
        return radius <= 0 ? radiusCoords : 2 + (radiusCoords + unitCoords) * radius - radiusCoords;
    }
    rewindCoords() {
        this.zOffset = -this.radius;
        this.layerStartIndex = 0;
        super.rewindCoords();
    }
    getLine(i = 0) {
        const {center, radius} = this;
        if (radius <= 0) return super.getLine(i);
        const layer = (i - 1) >> 2; // gives -1 for the bottom node, 0 for the first full ring-layer
        const zOffset = -radius + 1 + layer; // -radius + 1 is the first full ring-layer
        const side = i === 0 ? 0 : (i - 1) & 3;
        const layerCenter = center.plus(0, 0, zOffset);
        const layerRadius = radius - Math.abs(zOffset);

        if (layerRadius < 0) return null;
        return super.getLine(side, layerCenter, layerRadius);
    }
}

/** Represents an expanding sphere */
export class NearbyCoords extends Sphere {
    minRadius = 0;
    maxRadius = Infinity;
    radiusStart = 0;

    get potentiallyUnbounded() { return !isFinite(this.maxRadius); }

    /** @param {Coord} center */
    constructor(center, minRadius = 0, maxRadius = Infinity) {
        super(center, minRadius);
        this.minRadius = minRadius;
        this.maxRadius = maxRadius;
    }

    set(center = this.center, minRadius = this.minRadius, maxRadius = this.maxRadius) {
        this.minRadius = minRadius;
        this.maxRadius = maxRadius;
        return super.set(center, minRadius);
    }

    countLines() {
        if (this.potentiallyUnbounded) return Infinity;
        let total = 0;
        for (let r = this.minRadius; r <= this.maxRadius; r++) {
            total += super.countLines(r);
        }
        return total;
    }
    countCoords() {
        if (this.potentiallyUnbounded) return Infinity;
        let total = 0;
        for (let r = this.minRadius; r <= this.maxRadius; r++) {
            total += super.countCoords(r);
        }
        return total;
    }

    /** @param {CoordLike} coord */
    includes(coord) {
        const distance = this.center.distanceFrom(coord);
        return distance >= this.minRadius && distance <= this.maxRadius;
    }

    rewindCoords() {
        this.radius = this.minRadius;
        this.radiusStart = 0;
        super.rewindCoords();
    }

    getLine(i = 0) {
        // eventually this shouls reorder the layers to go out from center
        const {radius, maxRadius, radiusStart} = this;
        if (radius > maxRadius) return null;
        let result = super.getLine(i - radiusStart);
        if (!result) {
            this.radiusStart = i;
            this.radius++;
            result = super.getLine(0);
        }
        return result;
    }
}

/** @implements {ReadonlyBoundingBox} */
export class BoundingBox extends Shape {
    /** @readonly */ static abortWalk = Symbol("BoundingBox.abortWalk");

    static get Infinity() {
        return new this().setMinMax(-Infinity, -Infinity, -Infinity, Infinity, Infinity, Infinity);
    }

    /** @param {BoundingBoxLike} bbox */
    static from(bbox) {
        return new this(bbox);
    }

    static fromMinMax(xMin = 0, yMin = 0, zMin = 0, xMax = 0, yMax = 0, zMax = 0) {
        return new this()
           .setMinMax(xMin, yMin, zMin, xMax, yMax, zMax);
    }
    static fromXYZWHD(x = 0, y = 0, z = 0, w = 1, h = 1, d = 1) {
        return new this()
           .setXYZWHD(x, y, z, w, h, d);
    }
    static fromCenterSize(cx = 0, cy = 0, cz = 0, Dx = 1, Dy = 1, Dz = 1) {
        return new this()
           .setCenterSize(cx, cy, cz, Dx, Dy, Dz);
    }
    static fromCenterRadius(cx = 0, cy = 0, cz = 0, rx = 0, ry = 0, rz = 0) {
        return new this()
           .setCenterRadius(cx, cy, cz, rx, ry, rz);
    }

    /** @type {[xMin: number, xMax: number]} */
    xLimits = [0, 0];
    /** @type {[yMin: number, yMax: number]} */
    yLimits = [0, 0];
    /** @type {[zMin: number, zMax: number]} */
    zLimits = [0, 0];

    get xMin() { return this.xLimits[0]; } set xMin(v) { this.xLimits[0] = v; }
    get xMax() { return this.xLimits[1]; } set xMax(v) { this.xLimits[1] = v; }
    get yMin() { return this.yLimits[0]; } set yMin(v) { this.yLimits[0] = v; }
    get yMax() { return this.yLimits[1]; } set yMax(v) { this.yLimits[1] = v; }
    get zMin() { return this.zLimits[0]; } set zMin(v) { this.zLimits[0] = v; }
    get zMax() { return this.zLimits[1]; } set zMax(v) { this.zLimits[1] = v; }

    get x() { return this.xMin; } set x(v) { const d = v - this.xMin; this.xMin += d; this.xMax += d; }
    get y() { return this.yMin; } set y(v) { const d = v - this.yMin; this.yMin += d; this.yMax += d; }
    get z() { return this.zMin; } set z(v) { const d = v - this.zMin; this.zMin += d; this.zMax += d; }

    get w() { return this.xMax - this.xMin + 1;} set w(v) { this.xMax = this.xMin + v - 1; }
    get h() { return this.yMax - this.yMin + 1;} set h(v) { this.yMax = this.yMin + v - 1; }
    get d() { return this.zMax - this.zMin + 1;} set d(v) { this.zMax = this.zMin + v - 1; }

    get centerX() { return (this.xMin + this.xMax) / 2; } set centerX(v) { const r = this.radiusX; this.xMin = this.xMax = v; this.radiusX = r; }
    get centerY() { return (this.xMin + this.xMax) / 2; } set centerY(v) { const r = this.radiusY; this.xMin = this.xMax = v; this.radiusY = r; }
    get centerZ() { return (this.xMin + this.xMax) / 2; } set centerZ(v) { const r = this.radiusZ; this.xMin = this.xMax = v; this.radiusZ = r; }

    get radiusX() { return (this.xMax - this.xMin) / 2}; set radiusX(v) { const cx = this.centerX; this.xMin = cx - v; this.xMax = cx + v; }
    get radiusY() { return (this.yMax - this.yMin) / 2}; set radiusY(v) { const cy = this.centerY; this.yMin = cy - v; this.yMax = cy + v; }
    get radiusZ() { return (this.zMax - this.zMin) / 2}; set radiusZ(v) { const cz = this.centerZ; this.zMin = cz - v; this.zMax = cz + v; }

    get diameterX() { return this.w; } set diameterX(v) { this.radiusX = (v - 1) / 2; }
    get diameterY() { return this.h; } set diameterY(v) { this.radiusY = (v - 1) / 2; }
    get diameterZ() { return this.d; } set diameterZ(v) { this.radiusZ = (v - 1) / 2; }

    /** @param {BoundingBoxLike} [bbox] */
    constructor(bbox) {
        super();
        if (bbox) this.copyFrom(bbox);
    }

    /** @param {BoundingBoxLike} bbox  */
    copyFrom(bbox) {
        if (bbox !== this) {
            this.xLimits[0] = bbox.xLimits[0] ?? this.xLimits[0];
            this.xLimits[1] = bbox.xLimits[1] ?? this.xLimits[1];
            this.yLimits[0] = bbox.yLimits[0] ?? this.yLimits[0];
            this.yLimits[1] = bbox.yLimits[1] ?? this.yLimits[1];
            this.zLimits[0] = bbox.zLimits[0] ?? this.zLimits[0];
            this.zLimits[1] = bbox.zLimits[1] ?? this.zLimits[1];
        }
        return this;
    }

    copy() {
        return new BoundingBox(this);
    }

    /** @returns {BoundingBox} */
    makeWritable() {
        return this;
    }

    /** @returns {ReadonlyBoundingBox} the closest integral bounding box in position and size. */
    round() {
        const {round} = Math;
        return this.setXYZWHD(round(this.x), round(this.y), round(this.z), round(this.w), round(this.h), round(this.d));
    }

    /** @returns {ReadonlyBoundingBox} the largest integral bounding box contained by this one. */
    floor() {
        const {floor, ceil} = Math;
        return this.setMinMax(ceil(this.xMin), ceil(this.yMin), ceil(this.zMin), floor(this.xMax), floor(this.yMax), floor(this.zMax));
    }

    /** @returns {ReadonlyBoundingBox} the smallest integral bounding box that contains this one. */
    ceil() {
        const {floor, ceil} = Math;
        return this.setMinMax(floor(this.xMin), floor(this.yMin), floor(this.zMin), ceil(this.xMax), ceil(this.yMax), ceil(this.zMax));
    }

    toString() {
        return `BoundingBox(xyz ∈ ([${this.xMin}, ${this.xMax}], [${this.yMin}, ${this.yMax}], [${this.zMin}, ${this.zMax}]))`
    }

    toIndex(x=0, y=0, z=0) {
        const {xMin, yMin, zMin, w, h, d} = this;
        return (z - zMin) * w * h + (y - yMin) * w + (x - xMin);
    }

    toCoord(i=0) {
        const {xMin, yMin, zMin, w, h} = this;
        const x = i % w;
        i = (i - x) / w;
        const y = i % h;
        i = (i - y) / h;
        return Coord.XYZ(x + xMin, y + yMin, i + zMin);
    }

    /**
     * @param {number} [xMin] @param {number} [yMin] @param {number} [zMin] 
     * @param {number} [xMax] @param {number} [yMax] @param {number} [zMax] 
     */
    setMinMax(xMin, yMin, zMin, xMax, yMax, zMax) {
        this.xLimits[0] = xMin ?? this.xLimits[0];
        this.xLimits[1] = xMax ?? this.xLimits[1];
        this.yLimits[0] = yMin ?? this.yLimits[0];
        this.yLimits[1] = yMax ?? this.yLimits[1];
        this.zLimits[0] = zMin ?? this.zLimits[0];
        this.zLimits[1] = zMax ?? this.zLimits[1];
        return this;
    }

    /**
     * @param {number} [x] @param {number} [y] @param {number} [z] 
     * @param {number} [w] @param {number} [h] @param {number} [d] 
     */
    setXYZWHD(x, y, z, w, h, d) {
        x ??= this.xMin;
        y ??= this.yMin;
        z ??= this.zMin;
        w ??= this.w;
        h ??= this.h;
        d ??= this.d;
        return this.setMinMax(x, y, z, x + w - 1, y + h - 1, z + d - 1);
    }

    /**
     * @param {number} [cx] @param {number} [cy] @param {number} [cz] 
     * @param {number} [cw] @param {number} [ch] @param {number} [cd] 
     */
    setCenterSize(cx, cy, cz, cw, ch, cd) {
        return this.setCenterRadius(cx ?? this.centerX, cy ?? this.centerY, cz ?? this.centerZ,
                                   ((cw ?? this.diameterX) - 1) / 2,
                                   ((ch ?? this.diameterY) - 1) / 2,
                                   ((cd ?? this.diameterZ) - 1) / 2)
    }

    /**
     * @param {number} [cx] @param {number} [cy] @param {number} [cz] 
     * @param {number} [rx] @param {number} [ry] @param {number} [rz] 
     */
    setCenterRadius(cx, cy, cz, rx, ry, rz) {
        cx ??= this.centerX; cy ??= this.centerY; cz ??= this.centerZ;
        rx ??= this.radiusX; ry ??= this.radiusY; rz ??= this.radiusZ;
        return this.setMinMax(
            cx - rx, cy - ry, cz - rz,
            cx + rx, cy + ry, cz + rz,
        );
    }

    contains(x = 0, y = 0, z = 0) {
        const {xLimits: [xMin, xMax],
               yLimits: [yMin, yMax],
               zLimits: [zMin, zMax]} = this;
        return inInclusiveRange(x, xMin, xMax) 
            && inInclusiveRange(y, yMin, yMax)
            && inInclusiveRange(z, zMin, zMax);
    }

    /** @param {BoundingBoxLike} intersectWith  */
    intersect(intersectWith) {
        if (!intersectWith) return this;
        const {xLimits, yLimits, zLimits} = this;
        const {xLimits: x, yLimits: y, zLimits: z} = intersectWith;
        xLimits[0] = Math.max(xLimits[0], x[0]);
        yLimits[0] = Math.max(yLimits[0], y[0]);
        zLimits[0] = Math.max(zLimits[0], z[0]);
        xLimits[1] = Math.min(xLimits[1], x[1]);
        yLimits[1] = Math.min(yLimits[1], y[1]);
        zLimits[1] = Math.min(zLimits[1], z[1]);
        return this;
    }

    /** @param {BoundingBoxLike} expandToInclude  */
    encapsulate(expandToInclude) {
        if (!expandToInclude) return this;
        const {xLimits, yLimits, zLimits} = this;
        const {xLimits: x, yLimits: y, zLimits: z} = expandToInclude;
        xLimits[0] = Math.min(xLimits[0], x[0]);
        yLimits[0] = Math.min(yLimits[0], y[0]);
        zLimits[0] = Math.min(zLimits[0], z[0]);
        xLimits[1] = Math.max(xLimits[1], x[1]);
        yLimits[1] = Math.max(yLimits[1], y[1]);
        zLimits[1] = Math.max(zLimits[1], z[1]);
        return this;
    }

    subdivideX(sections=1, sectionNumber = 1) {
        const {x, w} = this;
        const startIndex = Math.round(x + (sectionNumber - 1) * w / sections);
        const nextIndex = Math.round(x + sectionNumber * w / sections);
        return this.setMinMax(startIndex, null, null, nextIndex - 1, null, null);
    }

    subdivideY(sections=1, sectionNumber = 1) {
        const {y, h} = this;
        const startIndex = Math.round(y + (sectionNumber - 1) * h / sections);
        const nextIndex = Math.round(y + sectionNumber * h / sections);
        return this.setMinMax(null, startIndex, null, null, nextIndex - 1, null);
    }

    subdivideZ(sections=1, sectionNumber = 1) {
        const {z, d} = this;
        const startIndex = Math.round(z + (sectionNumber - 1) * d / sections);
        const nextIndex = Math.round(z + sectionNumber * d / sections);
        return this.setMinMax(null, null, startIndex, null, null, nextIndex - 1);
    }

    /** @param {(x: number, y: number, z: number) => unknown | typeof BoundingBox.abortWalk} callback */
    walk(callback) {
        const {xMin, xMax, yMin, yMax, zMin, zMax} = this;
        for (let z = zMin; z <= zMax; z++) {
            for (let y = yMin; y <= yMax; y++) {
                for (let x = xMin; x <= xMax; x++) {
                    if (callback(x, y, z) === BoundingBox.abortWalk) return;
                }
            }
        }
    }

    // Shape implementation

    countLines() {
        return this.h * this.d;
    }

    getLine(i = 0) {
        const {x, y, z, w, h, d} = this;
        const layerRow = i % h;
        const layer = (i - layerRow) / h;
        if (layer >= d) return null;

        return (this.currentLine ??= new Line()).set(Coord.XYZ(x, y + layerRow, z + layer), Coord.UnitX, w);
    }

    // CoordSet interface implementations

    countCoords() {
        return this.w * this.h * this.d;
    }

    /** @param {CoordLike} coord  */
    includes(coord) {
        const {x, y, z} = coord;
        return this.contains(x, y, z);
    }
}

export class SpreadCoords extends BaseCoordSet {
    origin;
    spreadTest;
    coordsDomain;
    /** @type {Set<Coord>} */
    seenCoords = new Set();
    /** @type {Queue<Coord>} */
    todoCoords = new Queue();

    #neighbors = new Sphere(Coord.Zero, 1);

    get potentiallyUnbounded() { return true; }

    /** @param {Coord} origin @param {(c: Coord) => boolean | null} spreadTest @param {CoordSet} [coordsDomain] */
    constructor(origin, spreadTest, coordsDomain) {
        super();
        this.origin = origin;
        this.spreadTest = spreadTest;
        this.coordsDomain = coordsDomain;
    }

    rewindCoords() {
        const {seenCoords, todoCoords, origin} = this;
        seenCoords.clear();
        todoCoords.clear();
        todoCoords.enqueue(origin);
    }

    nextCoord() {
        const {seenCoords, todoCoords, origin, spreadTest, coordsDomain} = this;
        for (const coord of todoCoords) {
            if (coordsDomain?.includes(coord) === false) {
                continue;
            }
            const result = spreadTest(coord);
            if (result !== false)  { // add unseen neighbors to queue
                for (const c of this.#neighbors.set(coord)) {
                    if (!seenCoords.has(c)) {
                        seenCoords.add(c);
                        todoCoords.enqueue(c);
                    }
                }
            }
            if (result) {
                return coord;
            }
        }
    }
}

Object.assign(self, {Coord, ArrayCoordSet, Line, Circle, Sphere, NearbyCoords, BoundingBox});