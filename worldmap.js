import { inSemiOpenRange } from "./helpers.js";
import { Tileset } from "./tileset.js";

export class WorldMap {
    width;
    height;
    depth;

    widthBits;
    heightBits;
    depthBits;

    /** @type {Uint8Array} */
    baseMap;

    /** @type {LayerName[]} */
    baseTiles = [
        null,
        "solidwall",
    ]

    /** @type {MapSprite[]} */
    sprites = [];

    constructor(width = 255, height = 255, depth = 15) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.widthBits = Math.ceil(Math.log2(width));
        this.heightBits = Math.ceil(Math.log2(height));
        this.depthBits = Math.ceil(Math.log2(depth));
        this.baseMap = new Uint8Array(1 << (this.widthBits + this.heightBits + this.depthBits));
    }

    /** @param {number} x @param {number} y @param {number} z */
    toIndex(x, y, z) {
        return (((z << this.depthBits) + y) << this.heightBits) + x;
    }
    /** @param {number} i */
    toX(i) {
        return i & ((1 << (this.heightBits + this.depthBits)) - 1);
    }
    toY(i) {
        return (i >>> this.widthBits) & ((1 << this.depthBits) - 1);
    }
    toZ(i) {
        return i >>> (this.widthBits + this.heightBits);
    }
    /** @param {number} i @returns {[x: number, y: number, z: number]} */
    fromIndex(i) {
        const x = this.toX(i);
        const y = this.toY(i);
        const z = this.toZ(i);
        return [x, y, z];
    }

    inMap(x = 0, y = 0, z = 0) {
        return inSemiOpenRange(x, 0, this.width)
            && inSemiOpenRange(y, 0, this.height)
            && inSemiOpenRange(z, 0, this.depth);
    }

    /** @param {number} x @param {number} y @param {number} z */
    getBase(x, y, z) {
        return this.inMap(x, y, z) ? this.baseMap[this.toIndex(x, y, z)] : 0;
    }

    /** @param {number} x @param {number} y @param {number} z */
    setBase(x, y, z, w = 0) {
        this.baseMap[this.toIndex(x, y, z)] = w;
    }

    /** @param {MapSprite} sprite, @param {Partial<MapSprite>} [overrides] */
    addSprite(sprite, overrides) {
        if (overrides) {
            Object.assign(sprite, overrides);
        }
        this.sprites.push(sprite);
        return this;
    }

    removeSprite(sprite) {
        const index = this.sprites.indexOf(sprite);
        if (index >= 0) {
            this.sprites.splice(index, 1);
        }
    }

    makeSetBaseCallback(xOrigin = 0, yOrigin = 0, zOrigin = 0, tileMapping = this.baseTiles) {
        /** @param {number} x @param {number} y @param {number} z @param {number} w */
        return (x, y, z, w) => this.setBase(xOrigin + x, yOrigin + y, zOrigin + z, w);
    }

    /** @param {MapSprite} sprite  */
    getSpriteChar(sprite) {
        /** @type {TileFrame} */
        const frame = Tileset.tiles1.layerFrames[sprite.spriteLayer]?.[sprite.spriteFrame];
        if (!frame) {
            console.error("Could not get frame for sprite!", sprite);
            return;
        }
        return frame.char;
    }

    /** @param {import("rot-js").Display} display  */
    drawLayer(display, xOrigin = 0, yOrigin = 0, z = 0) {
        const {width, height} = display.getOptions();
        const sprites = this.sprites.filter(s => s.z === z && s.x >= xOrigin && s.y >= yOrigin && s.x < xOrigin + width && s.y < yOrigin + height);
        display.clear();
        for (let j = 0; j < height; j++) {
            const y = j + yOrigin;
            for (let i = 0; i < width; i++) {
                const x = i + xOrigin;
                const base = this.getBase(x, y, z);
                /** @type {string[]} */
                const tiles = [];
                if (base) {
                    tiles.push(Tileset.defaultWall.char);
                }
                for (const sprite of sprites.filter(s => s.x === x && s.y === y)) {
                    tiles.push(this.getSpriteChar(sprite));
                }
                display.draw(i, j, tiles, null, null);
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

export class MapSprite {
    x;
    y;
    z;
    spriteLayer;
    spriteFrame;
    animated;

    /** @param {LayerName} spriteLayer */
    constructor(spriteLayer, x = 0, y = 0, z = 0, frame = 0, animated = false) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.spriteLayer = spriteLayer;
        this.spriteFrame = frame;
        this.animated = animated;
    }
}

Object.assign(self, {WorldMap, MapSprite});