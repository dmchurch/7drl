import { inInclusiveRange, inSemiOpenRange } from "./helpers.js";
import { wallRules } from "./tiles.js";
import { Tileset } from "./tileset.js";
import { Viewport } from "./viewport.js";
import { WallRule } from "./walls.js";

export class WorldMap {
    width;
    height;
    depth;

    widthBits;
    heightBits;
    depthBits;

    /** @type {Uint8Array} */
    baseMap;
    /** @type {Int8Array} */
    baseFrames;

    /** @type {TileName[]} */
    baseTiles = [
        null,
        "solidwall",
    ]

    /** @type {MapSprite[]} */
    sprites = [];

    /** @type {Viewport} */
    mainViewport;

    /** @type {number[]} */
    surroundingIndices = [];

    constructor(width = 127, height = 127, depth = 15) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.widthBits = Math.ceil(Math.log2(width));
        this.heightBits = Math.ceil(Math.log2(height));
        this.depthBits = Math.ceil(Math.log2(depth));
        this.baseMap = new Uint8Array(1 << (this.widthBits + this.heightBits + this.depthBits));
        this.baseFrames = new Int8Array(this.baseMap.length).fill(-1);
        this.surroundingIndices = WallRule.bitDirections.slice(0, 8).map(([dx, dy]) => this.toIndex(dx, dy));
    }

    /** @param {TileName} tileName  */
    toBaseValue(tileName) {
        return this.baseTiles.indexOf(tileName);
    }
    /** @param {number} v */
    toTileName(v) {
        return this.baseTiles[v];
    }

    /** @param {number} x @param {number} y @param {number} z */
    toIndex(x = 0, y = 0, z = 0) {
        return (z << (this.heightBits + this.widthBits)) + (y << this.widthBits) + x;
    }
    /** @param {number} i */
    toX(i) {
        return i & ((1 << (this.widthBits)) - 1);
    }
    toY(i) {
        return (i >>> this.widthBits) & ((1 << this.heightBits) - 1);
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
        if (!this.inMap(x, y, z)) return;
        const index = this.toIndex(x, y, z);
        const {baseMap, surroundingIndices, baseFrames} = this;
        baseMap[index] = w;
        baseFrames[index] = -1;
        // set surrounding indices to dirty
        for (let bit = 0; bit < 8; bit++) {
            const otherIndex = index + surroundingIndices[bit];
            const otherFrame = baseFrames[otherIndex] ?? -1;
            if (otherFrame >= 0) {
                baseFrames[otherIndex] = ~otherFrame;
            }
        }
    }

    /** @param {number} x @param {number} y @param {number} z @param {number} base  */
    isSameBaseAs(x, y, z, base) {
        return this.isIndexSameBaseAs(this.toIndex(x, y, z), base);
    }
    /** @param {number} index @param {number} base */
    isIndexSameBaseAs(index, base) {
        // this is simple right now but it could eventually incorporate "similar-enough" logic for
        // different wall sprites that should nonetheless count each other for tiling purposes
        return (this.baseMap[index] ?? 0) === base;
    }

    /** @param {number} baseIndex */
    getWallInfoFor(baseIndex, base = this.baseMap[baseIndex]) {
        let total = 0;
        const {surroundingIndices} = this;
        for (let bit = 0; bit < 8; bit++) {
            const otherIndex = baseIndex + surroundingIndices[bit];
            if (this.isIndexSameBaseAs(otherIndex, base)) {
                total |= 1 << bit;
            }
        }
        return total;
    }

    /** @param {MapSprite} sprite, @param {Partial<MapSprite>} [overrides] */
    addSprite(sprite, overrides) {
        if (overrides) {
            Object.assign(sprite, overrides);
        }
        sprite.worldMap = this;
        this.sprites.push(sprite);
        return this;
    }

    removeSprite(sprite) {
        const index = this.sprites.indexOf(sprite);
        if (index >= 0) {
            this.sprites.splice(index, 1);
        }
    }

    /** @param {Record<number, TileName>} [tileMapping] */
    makeSetBaseCallback(xOrigin = 0, yOrigin = 0, zOrigin = 0, tileMapping = this.baseTiles) {
        /** @param {number} x @param {number} y @param {number} z @param {number} w */
        return (x, y, z, w) => this.setBase(xOrigin + x, yOrigin + y, zOrigin + z, this.toBaseValue(tileMapping[w]));
    }

    /** @param {MapSprite} sprite  */
    getSpriteChar(sprite) {
        /** @type {TileFrame} */
        const frame = Tileset.light.layerFrames[sprite.spriteTile]?.[sprite.spriteFrame];
        if (!frame) {
            console.error("Could not get frame for sprite!", sprite);
            return;
        }
        return frame.char;
    }

    /** @param {import("rot-js").Display} display  */
    drawLayer(display, centerX = 0, centerY = 0, z = 0, focusLayer = Infinity) {
        const {width, height} = display.getOptions();
        const xOrigin = centerX - (width >> 1);
        const yOrigin = centerY - (height >> 1);
        const sprites = this.sprites.filter(s => s.z === z && s.x >= xOrigin && s.y >= yOrigin && s.x < xOrigin + width && s.y < yOrigin + height);
        display.clear();
        const focusOffset = z <= focusLayer ? 0 : this.toIndex(0, 0, focusLayer - z);
        const focusOpacity = 0.5 / (z - focusLayer);
        for (let j = 0; j < height; j++) {
            const y = j + yOrigin;
            for (let i = 0; i < width; i++) {
                const x = i + xOrigin;
                const baseIndex = this.toIndex(x, y, z);
                const base = this.inMap(x, y, z) ? this.baseMap[baseIndex] : 0;
                /** @type {string[]} */
                const tiles = [];
                if (base) {
                    const tileInfo = Tileset.light.layerFrames[this.toTileName(base)][0];
                    let baseFrame = this.baseFrames[baseIndex];
                    if (baseFrame < 0) {
                        if (tileInfo.frameType === "walls") {
                            baseFrame = this.baseFrames[baseIndex] = wallRules[tileInfo.wallRules].framesMap[this.getWallInfoFor(baseIndex, base)];
                        } else {
                            baseFrame = ~baseFrame;
                        }
                        this.baseFrames[baseIndex] = baseFrame;
                    }
                    tiles.push(tileInfo.frames[baseFrame % tileInfo.frames.length].char);
                }
                for (const sprite of sprites.filter(s => s.x === x && s.y === y)) {
                    tiles.push(this.getSpriteChar(sprite));
                }
                /** @type {any} */
                let fg = null;
                if (focusOffset && this.baseMap[baseIndex + focusOffset] === 0) {
                    fg = focusOpacity;
                }
                display.draw(i, j, tiles, fg, null);
            }
        }
    }

    /** @param {import("rot-js").Display[]} displays */
    drawLayers(displays, centerX = 0, centerY = 0, zOrigin = 0, zFocus = Infinity) {
        for (const [k, display] of displays.entries()) {
            this.drawLayer(display, centerX, centerY, zOrigin + k, zFocus);
        }
    }

    /** @param {number} x @param {number} y @param {number} z @param {number} contents */
    static callback(x, y, z, contents) {}
}

export class MapSprite {
    x;
    y;
    z;
    spriteTile;
    spriteFrame;
    animated;

    /** @type {WeakRef<WorldMap>} */
    #worldMap;
    get worldMap() {
        return this.#worldMap.deref();
    }
    set worldMap(v) {
        this.#worldMap = new WeakRef(v);
    }

    /** @param {TileName} spriteTile */
    constructor(spriteTile, x = 0, y = 0, z = 0, frame = 0, animated = false) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.spriteTile = spriteTile;
        this.spriteFrame = frame;
        this.animated = animated;
    }
}

Object.assign(self, {WorldMap, MapSprite});