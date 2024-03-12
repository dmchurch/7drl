import { clamp, inBBox, inInclusiveRange, inSemiOpenRange, infiniteBBox, intersectBBox, newBBox, setBBox, setBBoxCenter, tuple, typedEntries, walkBBox } from "./helpers.js";
import { tiles, wallRules } from "./tiles.js";
import { Tileset } from "./tileset.js";
import { Viewport } from "./viewport.js";
import { WallRule } from "./walls.js";
import { Precise3DShadowcasting } from "./rot3d.js";

console.debug("Starting worldmap.js");

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
        "roughwall",
    ]

    defaultTileIndex = 1;

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

    /** @type {[number, number][]} */
    surroundingDirections = [];

    /** @type {MapSprite} */
    visibilitySource;

    fov = new Precise3DShadowcasting((x, y, z) => this.lightPasses(x, y, z), {topology: 8});

    /** @type {BoundingBox} The bounds of the actual data storage, what can be stored as tiles */
    bounds;

    /** @type {BoundingBox} The bounds shrunk by 1 tile along x and y (for wall display calculations) */
    interiorBounds;

    /** @type {BoundingBox} The bounds expanded by 1 tile in all dimensions, aka all positions that can be bumped into */
    exteriorBounds;

    /** @type {BoundingBox} */
    displayBounds = infiniteBBox();

    /** @type {BoundingBox} */
    pathingBounds = infiniteBBox();

    #animationActive = false;
    get animationActive() {
        return this.#animationActive;
    }

    constructor(width = 127, height = 127, depth = 31) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.bounds = newBBox(0, 0, 0, width, height, depth);
        this.interiorBounds = newBBox(1, 1, 0, width - 2, height - 2, depth);
        this.exteriorBounds = newBBox(-1, -1, -1, width + 2, height + 2, depth + 2);
        this.widthBits = Math.ceil(Math.log2(width));
        this.heightBits = Math.ceil(Math.log2(height));
        this.depthBits = Math.ceil(Math.log2(depth));
        this.baseMap = new Uint8Array(1 << (this.widthBits + this.heightBits + this.depthBits));
        this.baseFrames = new Int8Array(this.baseMap.length).fill(-1);
        this.fogMap = new Uint8Array(this.baseMap.length);
        this.surroundingDirections = WallRule.bitDirections.slice(0, 8);
        this.surroundingIndices = this.surroundingDirections.map(([dx, dy]) => this.toIndex(dx, dy));
        this.isPassable = this.isPassable.bind(this);
        this.lightPasses = this.lightPasses.bind(this);
        this.isEmpty = this.isEmpty.bind(this);
        this.animationHandler = this.animationHandler.bind(this);
    }

    #animationFrameRequest;
    startAnimation() {
        if (this.#animationActive) return;
        this.#animationActive = true;
        this.#animationFrameRequest = requestAnimationFrame(this.animationHandler);
    }

    stopAnimation() {
        if (!this.#animationActive) return;
        this.#animationActive = false;
        cancelAnimationFrame(this.#animationFrameRequest);
    }

    /** @param {DOMHighResTimeStamp} timestamp  */
    animationHandler(timestamp) {
        if (!this.#animationActive) return;
        let hadUpdate = false;
        for (const sprite of this.sprites) {
            const {animated, visible, tileFrame} = sprite
            if (animated && visible && (tileFrame.frameType ?? "animation") === "animation") {
                if (!sprite.animationFrameStart) {
                    sprite.animationFrameStart = timestamp;
                }
                const nextFrame = Math.max(timestamp - 50, sprite.animationFrameStart + tileFrame.sourceFrame.duration);
                if (timestamp >= nextFrame) {
                    sprite.spriteFrame = (sprite.spriteFrame + 1) % tileFrame.frames.length;
                    sprite.animationFrameStart = nextFrame;
                    hadUpdate = true;
                    // this.drawTile(sprite.x, sprite.y, sprite.z);
                }
            }
        }
        this.mainViewport?.redraw();
        this.#animationFrameRequest = requestAnimationFrame(this.animationHandler);
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
    closestIndex(x = 0, y = 0, z = 0) {
        x = clamp(x, 0, this.width - 1);
        y = clamp(y, 0, this.height - 1);
        z = clamp(z, 0, this.depth - 1);
        return this.toIndex(x, y, z);
    }
    nearIndex(x = 0, y = 0, z = 0) {
        if (x === -1) x = 0;
        if (y === -1) y = 0;
        if (z === -1) z = 0;
        if (x === this.width) x--;
        if (y === this.height) y--;
        if (z === this.depth) z--;
        if (!this.inMap(x, y, z)) return -1;
        return this.toIndex(x, y, z);
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
        return inBBox(this.bounds, x, y, z);
    }

    /** @param {BoundingBox} bbox  */
    setDisplayBounds(bbox) {
        return this.displayBounds = intersectBBox(bbox, this.bounds);
    }

    /** @param {BoundingBox} bbox  */
    setPathingBounds(bbox) {
        return this.pathingBounds = intersectBBox(bbox, this.pathingBounds);
    }

    setCenteredDisplayBoundsTo(x=0, y=0, z=0, w=0, h=0, d=0) {
        return this.setDisplayBounds(setBBoxCenter(this.displayBounds, x, y, z, w, h, d));
    }

    setCenteredPathingBoundsTo(x=0, y=0, z=0, w=0, h=0, d=0) {
        return this.setPathingBounds(setBBoxCenter(this.pathingBounds, x, y, z, w, h, d));
    }

    clearAll() {
        this.fogMap.fill(0);
        this.baseMap.fill(0);
        this.sprites.length = 0;
    }

    /** @param {number} x @param {number} y @param {number} z */
    getBase(x, y, z) {
        return this.inMap(x, y, z) ? this.baseMap[this.toIndex(x, y, z)] : this.defaultTileIndex;
    }

    /** @param {number} x @param {number} y @param {number} z */
    getBaseTile(x, y, z) {
        return this.getTileFrameFor(x, y, z);
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
        return (this.baseMap[index] ?? this.defaultTileIndex) === base;
    }

    /** @param {number} x @param {number} y @param {number} z */
    getTileFrameFor(x, y, z,
                    inMap = this.inMap(x, y, z),
                    baseIndex = this.toIndex(x, y, z),
                    base = inMap ? this.baseMap[baseIndex] : this.defaultTileIndex) {
        if (!base) return undefined;
        const tileInfo = Tileset.light.layerFrames[this.toTileName(base)]?.[0];
        let baseFrame = inMap ? this.baseFrames[baseIndex] : -1;
        if (baseFrame < 0) {
            if (tileInfo.frameType === "walls") {
                const wallInfo = this.getWallInfoFor(x, y, z, inMap, baseIndex, base);
                baseFrame = wallRules[tileInfo.wallRules].framesMap[wallInfo];
            } else {
                baseFrame = ~baseFrame;
            }
            if (inMap) {
                this.baseFrames[baseIndex] = baseFrame;
            }
        }
        return tileInfo.frames[baseFrame % tileInfo.frames.length] ?? tileInfo;
    }

    /** @param {number} x @param {number} y @param {number} z */
    getWallInfoFor(x, y, z,
                   inMap = this.inMap(x, y, z),
                   baseIndex = this.toIndex(x, y, z),
                   base = inMap ? this.baseMap[baseIndex] : this.defaultTileIndex) {
        let total = 0;
        const {surroundingIndices, surroundingDirections} = this;

        if (inBBox(this.interiorBounds, x, y, z)) {
            // common case, wall is in interior and doesn't need bounds tests
            for (let bit = 0; bit < 8; bit++) {
                const otherIndex = baseIndex + surroundingIndices[bit];
                if (this.isIndexSameBaseAs(otherIndex, base)) {
                    total |= 1 << bit;
                }
            }
        } else {
            // wall is on an exterior border (or is possibly out-of-bounds itself), so anything out-of-bounds counts as "occupied"
            for (let bit = 0; bit < 8; bit++) {
                const [dx, dy] = surroundingDirections[bit];
                if (!this.inMap(x + dx, y + dy, z)
                    || this.isIndexSameBaseAs((baseIndex + surroundingIndices[bit]), base)) {
                    total |= 1 << bit;
                }
            }
        }
    
        return total;
    }

    lightPasses(x=0, y=0, z=0) {
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
        this.blockingSprite = null;

        const baseTile = this.getBaseTile(x, y, z);
        for (const sprite of this.getSpritesAt(x, y, z)) {
            if (sprite.tangible && "blocksActors" in sprite && sprite.blocksActors) {
                this.blockingSprite = sprite;
                return false;
            }
        }
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

    /** @template {MapSprite} T @param {MapSprite} fromSprite @param {T} toSprite @param {Overrides<T>} [overrides] */
    swapSprite(fromSprite, toSprite, overrides) {
        if (this.removeSprite(fromSprite)) {
            const {x, y, z, visible, tangible} = fromSprite;
            return this.addSprite(toSprite, {x, y, z, visible, tangible, ...overrides});
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
        return fromSprites.filter(s => s.x === x && s.y === y && s.z === z).sort((a, b) => a.displayLayer - b.displayLayer);
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

        const baseIndex = this.nearIndex(x, y, z);
        /** @type {any} */
        let fg = null;
        if (focusOffset && this.baseMap[baseIndex + focusOffset] === 0) {
            fg = focusOpacity;
        }
        // nearIndex will either return a valid in-map index or -1
        const fog = this.fogMap[baseIndex] ?? 0;
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
        
        this.clearFogMap(FOG_VISIBLE);
        const {x, y, z} = this.visibilitySource ?? {};
        this.computeVisibility(x, y, z, this.visibilitySource.visibilityRadius);
        for (const [k, display] of displays.entries()) {
            this.drawLayer(display, centerX, centerY, zOrigin + k, zFocus);
        }
    }

    /** @param {number} flags  */
    clearFogMap(flags, bbox = this.displayBounds) {
        walkBBox(bbox, (x, y, z) => this.fogMap[this.toIndex(x, y, z)] &= ~flags);
    }

    /** @param {number} x @param {number} y @param {number} z @param {number} contents */
    static callback(x, y, z, contents) {}
}

/**
 * @typedef SpriteContainer
 * @prop {WorldMap} worldMap
 * @prop {SpriteContainer} container
 * @prop {MapSprite} rootSprite
 * @prop {MapSprite[]} inventory
 * @prop {(sprite: MapSprite) => boolean} hasItem
 * @prop {(sprite: MapSprite) => boolean} relinquishItem
 * @prop {(sprite: MapSprite, withSprite: MapSprite) => boolean} replaceItem
 */

/** @param {MapSprite} sprite @returns {sprite is SpriteContainer} */
export function isSpriteContainer(sprite) {
    return "hasItem" in sprite && "relinquishItem" in sprite;
}

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
    visibilityRadius = 8;
    animationFrameStart = 0;

    get tileFrame() {
        return Tileset.light.layerFrames[this.spriteTile]?.at(this.spriteFrame)
    }

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
        const {frameType, frames} = this.tileFrame ?? {};
        this.animated = animated ?? (frameType === "animation" ? true : frameType === undefined ? frames?.length > 1 : false);
        this.visible = visible ?? this.visible;
        this.displayLayer = displayLayer ?? this.displayLayer;
        this.worldMap = worldMap ?? this.worldMap;
        this.container = container ?? this.container;
    }

    /** @param {WorldMap} worldMap @param {PopDefinition} popDef @param {PopDefinition} rootPopDef @param {MapSprite} context */
    canSpawnAt(x = 0, y = 0, z = 0, worldMap, popDef, rootPopDef, context) {
        return worldMap.isEmpty(x, y, z);
    }

    /** @type {import("./procgen.js")["spawnNearby"]} */
    static spawnNearbyFunction;

    /** @param {PopDefinition} popDef @param {{minRadius?: number, maxRadius?: number}} options */
    spawnNearby(popDef, options, worldMap = this.rootSprite?.worldMap ?? this.worldMap) {
        MapSprite.spawnNearbyFunction?.(this, popDef, options, worldMap);
    }

    *distributeNearby({minRadius = 1, maxRadius = 10} = {}, worldMap = this.rootSprite?.worldMap) {
        const {x, y, z} = this.rootSprite;

        const positions = [];

        for (let radius = minRadius; radius <= maxRadius; radius++) {
            const zRadius = radius;
            for (let dz = -zRadius; dz <= zRadius; dz++) {
                const latRadius = radius - Math.abs(dz << 1);
                for (let dy = -latRadius; dy <= latRadius; dy++) {
                    for (let dx = -latRadius; dx <= latRadius; dx++) {
                        const effRadius = Math.max(Math.abs(dx), Math.abs(dy)) + Math.abs(dz);
                        if (dx === 0 && dy === 0 || effRadius < minRadius) {
                            // don't spawn on top of, directly above, or directly underneath, or too close
                            continue;
                        }
                        const nx = x + dx, ny = y + dy, nz = z + dz;
                        if (worldMap.inMap(nx, ny, nz) && worldMap.isEmpty(nx, ny, nz)) {
                            positions.push(tuple(nx, ny, nz));
                        }
                    }
                }
            }
            if (positions.length) {
                yield positions;
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
