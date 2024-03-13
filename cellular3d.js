import {Display, Map, RNG} from "rot-js";
import { inSemiOpenRange } from "./helpers.js";

/**
 * @typedef {Omit<ConstructorParameters<typeof Map.Cellular>[2], "topology"> & {
 *  zWeight?: number,
 *  layerStrideBits?: number,
 *  layerWidth?: number,
 *  depth?: number,
 * }} Options
 */

/** @typedef {typeof import("./worldmap").WorldMap.callback} Create3DCallback */

export class Cellular3D extends Map.Cellular {
    /** @type {Options} */
    static defaultOptions = {
        born: [7, 8, 9, 10, 11, 12],
        survive: [6, 7, 8, 9, 10, 11, 12],
        zWeight: 2,
    }

    get width() { return this.options.layerWidth; }
    get height() { return this._height; }
    get depth() { return this.options.depth; }
    get layerStrideBits() { return this.options.layerStrideBits; }
    get mapWidth() { return this._width; }
    get mapHeight() { return this._height; }

    get data() { return this.thisMap?.data; }
    get nullColumn() { return this.thisMap?.nullColumn; }
    /** @type {{data: Uint8Array;nullColumn: Uint8Array;map: Uint8Array[];}} */
    thisMap = this["thisMap"];
    /** @type {{data: Uint8Array;nullColumn: Uint8Array;map: Uint8Array[];}} */
    otherMap = this["otherMap"];

    get options() {
        return /** @type {Options} */(this._options);
    }

    livePopulation = 0;

    /**
     * @param {number} width
     * @param {number} height
     * @param {number} depth
     * @param {Options} [options]
     */
    constructor(width, height, depth, options,
                layerStrideBits = options?.layerStrideBits ?? Math.ceil(Math.log2(width + 1)),
                mapWidth = depth << layerStrideBits,
                mapHeight = height) {
        // @ts-ignore we're just throwing some extra data into options so we can have it in _fillMap
        super(mapWidth, mapHeight, {...new.target.defaultOptions, ...options, depth, layerWidth: width, layerStrideBits, topology: 8});
        this._dirs = [...this._dirs, [1 << layerStrideBits, 0], [-1 << layerStrideBits, 0]];
    }

    /** @returns {number[][]} */
    _fillMap(value) {
        const {thisMap, otherMap} = this;
        if (otherMap) {
            this.thisMap = otherMap;
            this.otherMap = thisMap;
            otherMap.data.fill(value);
            otherMap.nullColumn.fill(value);
            // @ts-ignore
            return otherMap.map;
        }
        if (thisMap) {
            this.otherMap = thisMap;
        }
        const data = new Uint8Array(this.width * this.depth * this.height).fill(value);
        const nullColumn = new Uint8Array(this.height).fill(value);
        /** @type {Uint8Array[]} */
        let map = new Array(this.mapWidth);
        for (let i = 0; i < this.mapWidth; i++) {
            const x = i & ((1 << this.layerStrideBits) - 1);
            const z = i >>> this.layerStrideBits;
            if (x < this.width) {
                const slice = z * this.width + x;
                map[i] = data.subarray(slice * this.height, (slice + 1) * this.height);
            } else {
                map[i] = nullColumn;
            }
        }
        this.thisMap = {data, nullColumn, map};
        // @ts-ignore this return value is close enough to number[][]
        return map;
    }

    _getNeighbors(cx, cy) {
        let result = super._getNeighbors(cx, cy);
        const stride = 1 << this.layerStrideBits;
        for (let i = 1; i < this.options.zWeight ?? 1; i++) {
            let x = cx + stride;
            if (x < this._width) result += this._map[x][cy] == 1 ? 1 : 0;
            x = cx - stride;
            if (x >= 0) result += this._map[x][cy] == 1 ? 1 : 0;
        }
        return result;
    }

    /** @param {Options} options  */
    setOptions(options) {
        super.setOptions({...options, topology: 8});
    }

    /** @param {Create3DCallback} [callback] */
    create(callback) {
        let newMap = this._fillMap(0);
        let nextPopulation = 0;
        let born = this._options.born;
        let survive = this._options.survive;
        for (let j = 0; j < this._height; j++) {
            let widthStep = 1;
            let widthStart = 0;
            if (this._options.topology == 6) {
                widthStep = 2;
                widthStart = j % 2;
            }
            for (let i = widthStart; i < this._width; i += widthStep) {
                let cur = this._map[i][j];
                let ncount = this._getNeighbors(i, j);
                if (cur && survive.indexOf(ncount) != -1) { /* survive */
                    newMap[i][j] = 1;
                    nextPopulation++;
                }
                else if (!cur && born.indexOf(ncount) != -1) { /* born */
                    newMap[i][j] = 1;
                    nextPopulation++;
                }
            }
        }
        this._map = newMap;
        this.livePopulation = nextPopulation;
        this.thisMap.nullColumn.fill(0);
        this._service3DCallback(callback);
    }

    /** @param {Create3DCallback} callback */
    export(callback) {
        this._service3DCallback(callback);
    }

    randomize(probability) {
        this.livePopulation = 0;
        for (let i = 0; i < this.data.length; i++) {
            this.livePopulation += (this.data[i] = (RNG.getUniform() < probability ? 1 : 0));
        }
        return this;
    }

    population() {
        return this.livePopulation;
    }

    _service3DCallback(callback) {
        if (!callback) return;
        for (let z = 0, i = 0; z < this.depth; z++) {
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++, i++) {
                    callback(x, y, z, this.data[i]);
                }
            }
        }
    }

    get3D(x, y, z) {
        return inSemiOpenRange(x, 0, this.width)
            && inSemiOpenRange(y, 0, this.height)
            && inSemiOpenRange(z, 0, this.depth)
            ? this._map[x + (z << this.layerStrideBits)][y]
            : undefined;
    }

    /** @param {number} x @param {number} y @param {number} z @param {number} value */
    set3D(x, y, z, value) {
        super.set(x + (z << this.layerStrideBits), y, value);
    }
}

Object.assign(self, {Cellular3D});