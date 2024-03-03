import { Tileset } from "./tileset.js";
export class WorldMap {
    width;
    height;
    depth;

    baseMap;

    constructor(width = 256, height = 256, depth = 16) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.baseMap = new Uint8Array(width * height * depth);
    }

    /** @param {number} x @param {number} y @param {number} z */
    toIndex(x, y, z) {
        return z * this.height * this.width + y * this.width + x;
    }
    /** @param {number} i @returns {[x: number, y: number, z: number]} */
    fromIndex(i) {
        const x = i % this.width;
        i = Math.floor(i / this.width);
        const y = i % this.height;
        i = Math.floor(i / this.height);
        const z = i % this.depth;
        return [x, y, z];
    }
    inMap(x = 0, y = 0, z = 0) {
        return x >= 0 && x < this.width
            && y >= 0 && y < this.height
            && z >= 0 && z < this.depth;
    }

    /** @param {number} x @param {number} y @param {number} z */
    getBase(x, y, z) {
        return this.inMap(x, y, z) ? this.baseMap[this.toIndex(x, y, z)] : 0;
    }

    /** @param {number} x @param {number} y @param {number} z */
    setBase(x, y, z, w = 0) {
        this.baseMap[this.toIndex(x, y, z)] = w;
    }

    generateCallback(xOrigin = 0, yOrigin = 0, zOrigin = 0) {
        /** @param {number} x @param {number} y @param {number} z @param {number} w */
        return (x, y, z, w) => this.setBase(xOrigin + x, yOrigin + y, zOrigin + z, w);
    }

    /** @param {import("rot-js").Display} display  */
    drawLayer(display, xOrigin = 0, yOrigin = 0, z = 0) {
        const {width, height} = display.getOptions();
        for (let j = 0; j < height; j++) {
            const y = j + yOrigin;
            for (let i = 0; i < width; i++) {
                const x = i + xOrigin;
                const base = this.getBase(x, y, z);
                display.draw(i, j, base ? Tileset.defaultWall.char : Tileset.defaultClear.char);
            }
        }
    }

    /** @param {import("rot-js").Display[]} displays  */
    drawLayers(displays, xOrigin = 0, yOrigin = 0, zOrigin = 0) {
        for (const [k, display] of displays.entries()) {
            this.drawLayer(display, xOrigin, yOrigin, zOrigin + k);
        }
    }

    /** @param {number} x @param {number} y @param {number} z @param {number} contents */
    static callback(x, y, z, contents) {}
}

Object.assign(self, {WorldMap});