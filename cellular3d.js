import {Display, Map} from "rot-js";

/**
 * @typedef {Omit<ConstructorParameters<typeof Map.Cellular>[2], "topology"> & {
 *  zWeight?: number,
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

    width;
    height;
    depth;
    layerStride;
    mapWidth;
    mapHeight;

    /**
     * @param {number} width
     * @param {number} height
     * @param {number} depth
     * @param {Options} [options]
     */
    constructor(width, height, depth, options,
                layerStride = Math.ceil(Math.log2(width + 1)),
                mapWidth = depth << layerStride,
                mapHeight = height) {
        super(mapWidth, mapHeight, {...new.target.defaultOptions, ...options, topology: 8});
        this.options = {...new.target.defaultOptions, ...options, topology: 8};
        this._dirs = [...this._dirs];
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.layerStride = layerStride;
        this.mapWidth = mapWidth;
        this.mapHeight = mapHeight;
        for (let i = 0; i < this.options.zWeight ?? 1; i++) {
            this._dirs.push([1 << layerStride, 0], [-1 << layerStride, 0]);
        }
        console.log(`initialized dirs for zweight: ${this.options.zWeight}`,this._dirs);
    }

    /** @param {Options} options  */
    setOptions(options) {
        super.setOptions({...options, topology: 8});
    }

    /** @param {Create3DCallback} [callback] */
    create(callback) {
        super.create();
        for (let z = 0; z < this.depth; z++) {
            this._map[z << this.layerStride].fill(0);
        }
        this._service3DCallback(callback);
    }

    _service3DCallback(callback) {
        if (!callback) return;
        for (let z = 0; z < this.depth; z++) {
            for (let y = 0; y < this.height; y++) {
                for (let x = 0, i = z << this.layerStride; x < this.width; x++, i++) {
                    callback(x, y, z, this._map[i][y]);
                }
            }
        }
    }

    /** @param {number} x @param {number} y @param {number} z @param {number} value */
    set3D(x, y, z, value) {
        super.set(x + (z << this.layerStride), y, value);
    }

    /** @param {Create3DCallback} callback @param {() => void} [initCallback] */
    generateMap(callback, iters = 5, randomizeProb = 0.5, initCallback) {
        console.groupCollapsed(`Generating cellular map of size ${this.width}×${this.height}×${this.depth} using ${iters} iterations`, this);
        performance.mark("generate-start");
        this.randomize(randomizeProb);
        performance.mark("randomized")
        console.log("Randomized starting conditions");
        performance.measure("randomize-map", "generate-start", "randomized");
        for (let i = 1; i <= iters; i++) {
            initCallback?.();
            console.log(`Running iteration ${i}`);
            performance.mark("create-start");
            this.create();
            performance.mark("create-end");
            performance.measure("iterate-map", "create-start", "create-end");
        }
        performance.mark("generate-end");
        performance.measure("generate-map", "generate-start", "generate-end");
        console.log("Reporting to callback")
        this._service3DCallback(callback);
        performance.mark("callback-end");
        performance.measure("report-map", "generate-end", "callback-end");
        console.groupEnd();
    }
}

Object.assign(self, {Cellular3D});