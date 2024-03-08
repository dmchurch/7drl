import { FOV, RNG } from "rot-js";
import { inBBox, inInclusiveRange, inSemiOpenRange, setBBox, typedEntries, walkBBox } from "./helpers.js";
import { tiles, wallRules } from "./tiles.js";
import { Tileset } from "./tileset.js";
import { Viewport } from "./viewport.js";
import { WallRule } from "./walls.js";
import { Precise3DShadowcasting } from "./rot3d.js";
import { player } from "./main.js";

export const FOG_KNOWN = 1 << 0;
export const FOG_VISIBLE = 1 << 1;

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

    /** @type {Uint8Array} */
    fogMap;

    /** @type {MapSprite[]} */
    sprites = [];

    /** @type {MapSprite} Which sprite, if any, blocked the last isPassable() check? */
    blockingSprite;

    /** @type {Viewport} */
    mainViewport;

    /** @type {number[]} */
    surroundingIndices = [];

    fov = new Precise3DShadowcasting((x, y, z) => this.lightPasses(x, y, z), {topology: 8});

    /** @type {BoundingBox} */
    displayBounds = {
        x: [-Infinity, Infinity],
        y: [-Infinity, Infinity],
        z: [-Infinity, Infinity],
    };

    constructor(width = 127, height = 127, depth = 15) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.widthBits = Math.ceil(Math.log2(width));
        this.heightBits = Math.ceil(Math.log2(height));
        this.depthBits = Math.ceil(Math.log2(depth));
        this.baseMap = new Uint8Array(1 << (this.widthBits + this.heightBits + this.depthBits));
        this.baseFrames = new Int8Array(this.baseMap.length).fill(-1);
        this.fogMap = new Uint8Array(this.baseMap.length);
        this.surroundingIndices = WallRule.bitDirections.slice(0, 8).map(([dx, dy]) => this.toIndex(dx, dy));
        this.isPassable = this.isPassable.bind(this);
        this.lightPasses = this.lightPasses.bind(this);
        this.isEmpty = this.isEmpty.bind(this);
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
    getBaseTile(x, y, z) {
        if (!this.inMap(x, y, z)) return null;
        return this.getTileFrameFor(this.toIndex(x, y, z));
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

    /** @param {number} baseIndex  */
    getTileFrameFor(baseIndex, base = this.baseMap[baseIndex]) {
        if (!base) return undefined;
        const tileInfo = Tileset.light.layerFrames[this.toTileName(base)]?.[0];
        let baseFrame = this.baseFrames[baseIndex];
        if (baseFrame < 0) {
            if (tileInfo.frameType === "walls") {
                baseFrame = this.baseFrames[baseIndex] = wallRules[tileInfo.wallRules].framesMap[this.getWallInfoFor(baseIndex, base)];
            } else {
                baseFrame = ~baseFrame;
            }
            this.baseFrames[baseIndex] = baseFrame;
        }
        return tileInfo.frames[baseFrame % tileInfo.frames.length];
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

    lightPasses(x=0, y=0, z=0) {
        if (!inBBox(this.displayBounds, x, y, z)) {
            return false;
        }
        
        const baseTile = this.getBaseTile(x, y, z);
        if (baseTile && !baseTile.transparent) {
            return false;
        }
        for (const sprite of this.getSpritesAt(x, y, z)) {
            if (sprite.visible && "blocksLight" in sprite && sprite.blocksLight) {
                return false;
            }
        }
        return true;
    }

    isPassable(x=0, y=0, z=0) {
        const baseTile = this.getBaseTile(x, y, z);
        for (const sprite of this.getSpritesAt(x, y, z)) {
            if (sprite.tangible && "blocksActors" in sprite && sprite.blocksActors) {
                this.blockingSprite = sprite;
                return false;
            }
        }
        this.blockingSprite = null;
        if (baseTile && !baseTile.insubstantial) {
            return false;
        }
        return true;
    }

    isEmpty(x=0, y=0, z=0) {
        const base = this.getBase(x, y, z);
        if (base) {
            return false;
        }
        for (const sprite of this.getSpritesAt(x, y, z)) {
            if (sprite.visible) {
                return false;
            }
        }
        return true;
    }

    computeVisibility(cx=0, cy=0, cz=0, R=30) {
        this.fov.compute3D(cx, cy, cz, R, (x, y, z) => this.fogMap[this.toIndex(x, y, z)] |= FOG_KNOWN | FOG_VISIBLE);
    }

    /** @param {MapSprite} sprite */
    hasSprite(sprite) {
        return this.sprites.includes(sprite);
    }

    /** @param {MapSprite} sprite @param {Partial<MapSprite>} [overrides] */
    addSprite(sprite, overrides) {
        if (this.sprites.includes(sprite)) return false;
        if (overrides) {
            Object.assign(sprite, overrides);
        }
        sprite.releaseFromOwner();
        sprite.worldMap = this;
        this.sprites.push(sprite);
        this.drawTile(sprite.x, sprite.y, sprite.z);
        return true;
    }

    /** @param {MapSprite} sprite */
    removeSprite(sprite) {
        const index = this.sprites.indexOf(sprite);
        if (index >= 0) {
            this.sprites.splice(index, 1);
            this.drawTile(sprite.x, sprite.y, sprite.z);
            sprite.worldMap = null;
            return true;
        }
        return false;
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

    getSpritesAt(x = 0, y = 0, z = 0, fromSprites = this.sprites) {
        return fromSprites.filter(s => s.x === x && s.y === y && s.z === z);
    }

    drawTile(x = 0, y = 0, z = 0,
             focusLayer = this.mainViewport.centerZ,
             focusOffset = z <= focusLayer ? 0 : this.toIndex(0, 0, focusLayer - z),
             focusOpacity = 0.5 / (z - focusLayer),
             display = this.mainViewport.getDisplayForLayer(z),
             centerX = this.mainViewport.centerX,
             centerY = this.mainViewport.centerY,
             width = display?.getOptions().width ?? 0,
             height = display?.getOptions().height ?? 0,
             xOrigin = centerX - (width >> 1),
             yOrigin = centerY - (height >> 1),
             row = y - yOrigin, col = x - xOrigin,
             sprites = this.sprites) {

        if (!inSemiOpenRange(row, 0, height) || !inSemiOpenRange(col, 0, width)) return;

        const baseIndex = this.toIndex(x, y, z);
        /** @type {any} */
        let fg = null;
        if (focusOffset && this.baseMap[baseIndex + focusOffset] === 0) {
            fg = focusOpacity;
        }
        const fog = this.inMap(x, y, z) ? this.fogMap[baseIndex] : FOG_KNOWN;
        if (!(fog & FOG_VISIBLE)) {
            if (fog & FOG_KNOWN) {
                fg ??= 1;
                fg *= 0.5;
            } else {
                return;
            }
        }

        const baseTile = this.getBaseTile(x, y, z);
        /** @type {string[]} */
        const tiles = [];
        if (baseTile) {
            tiles.push(baseTile.char);
        }
        for (const sprite of this.getSpritesAt(x, y, z, sprites)) {
            if (!sprite.visible) continue;
            tiles.push(this.getSpriteChar(sprite));
        }
        display.draw(col, row, tiles, fg, null);
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
                this.drawTile(x, y, z,
                              focusLayer,
                              focusOffset,
                              focusOpacity,
                              display,
                              centerX,
                              centerY,
                              width,
                              height,
                              xOrigin,
                              yOrigin,
                              j, i,
                              sprites.filter(s => s.x === x && s.y === y));
            }
        }
    }

    /** @param {import("rot-js").Display[]} displays */
    drawLayers(displays, centerX = 0, centerY = 0, zOrigin = 0, zFocus = Infinity) {
        const [maxWidth, maxHeight] = displays.map(d => [d.getOptions().width, d.getOptions().height]).reduce((a, b) => a[0] > b[0] ? a : b);
        setBBox(this.displayBounds,
                centerX - (maxWidth >> 1) - 1, centerY - (maxWidth >> 1) - 1, zOrigin,
                maxWidth + 2, maxHeight + 2, displays.length);
        
        walkBBox(this.displayBounds, (x, y, z) => this.fogMap[this.toIndex(x, y, z)] &= ~FOG_VISIBLE);
        this.computeVisibility(player.x, player.y, player.z, 8);
        for (const [k, display] of displays.entries()) {
            this.drawLayer(display, centerX, centerY, zOrigin + k, zFocus);
        }
    }

    /** @param {number} x @param {number} y @param {number} z @param {number} contents */
    static callback(x, y, z, contents) {}
}

/**
 * @typedef SpriteContainer
 * @prop {WorldMap} worldMap
 * @prop {SpriteContainer} container
 * @prop {MapSprite} rootSprite
 * @prop {(sprite: MapSprite) => boolean} hasItem
 * @prop {(sprite: MapSprite) => boolean} relinquishItem
 */

export class MapSprite {
    x = 0;
    y = 0;
    z = 0;
    /** @type {TileName} */
    spriteTile;
    spriteFrame = 0;
    animated = false;
    visible = true;
    tangible = true;
    displayLayer = 0;

    /** @type {WeakRef<WorldMap>} */
    #worldMap;
    get worldMap() {
        return this.container?.worldMap ?? this.#worldMap?.deref();
    }
    set worldMap(v) {
        if (this.worldMap === v) return;

        this.#worldMap = v == null ? null : new WeakRef(v);
        if (v) {
            this.addedToWorldMap(v);
        }
    }

    /** @type {MapSprite} */
    get rootSprite() {
        return this.container?.rootSprite ?? this;
    }

    /** @type {WeakRef<SpriteContainer>} */
    #container;
    get container() {
        return this.#container?.deref();
    }
    set container(v) {
        if (this.container === v) return;
        if ((this.container || this.worldMap) && v) {
            this.releaseFromOwner();
        }
        this.#container = v == null ? null : new WeakRef(v);
        if (v) {
            this.addedToContainer(v);
        }
    }

    /** @param {TileName} spriteTile @param {Overrides<MapSprite>} [options] */
    constructor(spriteTile, options = {}) {
        this.spriteTile = options?.spriteTile ?? spriteTile;
        const {x, y, z, spriteFrame, animated, visible, displayLayer, worldMap, container} = options
        this.x = x ?? this.x;
        this.y = y ?? this.y;
        this.z = z ?? this.z;
        this.spriteFrame = spriteFrame ?? this.spriteFrame;
        this.animated = animated ?? this.animated;
        this.visible = visible ?? this.visible;
        this.displayLayer = displayLayer ?? this.displayLayer;
        this.worldMap = worldMap ?? this.worldMap;
        this.container = container ?? this.container;
    }

    /** @param {MapSprite} sprite  */
    spawnNearby(sprite, {minRadius = 1, maxRadius = 10} = {}) {
        const {worldMap, x, y, z} = this.rootSprite;

        const positions = [];
        
        for (let radius = minRadius; radius <= maxRadius; radius++) {
            const zRadius = radius >> 2;
            for (let dz = -zRadius; dz <= zRadius; dz++) {
                const latRadius = radius - Math.abs(dz << 1);
                for (let dy = -latRadius; dy <= latRadius; dy++) {
                    for (let dx = -latRadius; dx <= latRadius; dx++) {
                        const effRadius = Math.max(Math.abs(dx), Math.abs(dy)) + Math.abs(dz);
                        if (dx === 0 && dy === 0 || effRadius < minRadius) {
                            // don't spawn on top of, directly above, or directly underneath, or too close
                            continue;
                        }
                        if (worldMap.isEmpty(x + dx, y + dy, z + dz)) {
                            positions.push([x + dx, y + dy, z + dz]);
                        }
                    }
                }
            }
            while (positions.length) {
                // is okay to shadow these
                const [x, y, z] = RNG.getItem(positions);
                console.log(`Spawning ${sprite.spriteTile} at ${x}, ${y}, ${z} where ${worldMap.getBase(x, y, z)}`)
                return worldMap.addSprite(sprite, {x, y, z}) ? sprite : null;
            }
        }
        return null;
    }

    releaseFromOwner() {
        const {container, worldMap} = this;
        if (worldMap) {
            worldMap.removeSprite(this);
        }
        if (container) {
            container.relinquishItem(this);
        }
        return this.worldMap == null && this.container == null;
    }

    /** @param {WorldMap} worldMap */
    addedToWorldMap(worldMap) {
    }

    /** @param {SpriteContainer} container */
    addedToContainer(container) {
    }
}

Object.assign(self, {WorldMap, MapSprite, FOG_KNOWN, FOG_VISIBLE});