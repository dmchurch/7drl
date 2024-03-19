import {Display, Map, RNG} from "rot-js";
import { inSemiOpenRange } from "./helpers.js";
import type { WorldMap } from "./worldmap";

type ConstructorParameter<T extends new(...args: any[]) => any, N extends number> = T extends new(...args: infer AA) => any ? AA[N] : never;

interface Options extends ConstructorParameter<typeof Map.Cellular, 2> {
    zWeight?: number;
    layerStrideBits?: number;
    layerWidth?: number;
    depth?: number;
};

type Create3DCallback = typeof WorldMap.callback;

export class Cellular3D extends Map.Cellular {
    static defaultOptions: Options = {
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
    
    declare thisMap: { data: Uint8Array; nullColumn: Uint8Array; map: Uint8Array[]; };
    declare otherMap: { data: Uint8Array; nullColumn: Uint8Array; map: Uint8Array[]; };

    get options() {
        return this._options as Options;
    }

    livePopulation = 0;

    constructor(width: number, height: number, depth: number, options?: Options,
                layerStrideBits = options?.layerStrideBits ?? Math.ceil(Math.log2(width + 1)),
                mapWidth = depth << layerStrideBits,
                mapHeight = height) {
        // @ts-ignore we're just throwing some extra data into options so we can have it in _fillMap
        super(mapWidth, mapHeight, {...new.target.defaultOptions, ...options, depth, layerWidth: width, layerStrideBits, topology: 8});
        this._dirs = [...this._dirs, [1 << layerStrideBits, 0], [-1 << layerStrideBits, 0]];
    }

    _fillMap(value: number): number[][] {
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
        let map: Uint8Array[] = new Array(this.mapWidth);
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

    setOptions(options: Options) {
        super.setOptions({...options, topology: 8});
    }

    create(callback?: Create3DCallback) {
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

    export(callback: Create3DCallback) {
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

    set3D(x: number, y: number, z: number, value: number) {
        super.set(x + (z << this.layerStrideBits), y, value);
    }
}

Object.assign(self, {Cellular3D});