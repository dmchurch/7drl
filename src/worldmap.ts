import { clamp, inSemiOpenRange, tuple } from "./helpers.js";
import { wallRules } from "~data/tiles.js";
import { Tileset } from "./tileset.js";
import { Viewport } from "./viewport.js";
import { WallRule } from "./walls.js";
import { Precise3DShadowcasting } from "./rot3d.js";
import { BoundingBox, Coord } from "./geometry.js";

import type { Display } from "rot-js";

console.debug("Starting worldmap.js");

export const FOG_KNOWN = 1 << 0;
export const FOG_VISIBLE = 1 << 1;

export class WorldMap {
    width: number;
    height: number;
    depth: number;

    widthBits: number;
    heightBits: number;
    depthBits: number;

    baseMap: Uint8Array;
    baseFrames: Int8Array;

    baseTiles: TileName[] = [
        null,
        "roughwall",
    ]

    defaultTileIndex = 1;

    fogMap: Uint8Array;

    sprites: MapSprite[] = [];

    /** Which sprite, if any, blocked the last isPassable() check? */
    blockingSprite: MapSprite;

    mainViewport: Viewport;

    surroundingIndices: number[] = [];

    surroundingDirections: [number, number][] = [];

    visibilitySource: MapSprite;

    fov = new Precise3DShadowcasting((x, y, z) => this.lightPasses(x, y, z), {topology: 8});

    // dim the opacity of things above our layer
    enableCutaway = true;

    /** The bounds of the actual data storage, what can be stored as tiles */
    bounds: ReadonlyBoundingBox;

    /** The bounds shrunk by 1 tile along x and y (for wall display calculations) */
    interiorBounds: ReadonlyBoundingBox;

    /** The bounds expanded by 1 tile in all dimensions, aka all positions that can be bumped into */
    exteriorBounds: ReadonlyBoundingBox;

    displayBounds: ReadonlyBoundingBox = BoundingBox.Infinity

    pathingBounds: ReadonlyBoundingBox = BoundingBox.Infinity

    #animationActive = false;
    get animationActive() {
        return this.#animationActive;
    }

    constructor(width = 127, height = 127, depth = 31) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.bounds = BoundingBox.fromMinMax(0, 0, 0, width - 1, height - 1, depth - 1);
        this.interiorBounds = BoundingBox.fromMinMax(1, 1, 0, width - 2, height - 2, depth - 1);
        this.exteriorBounds = BoundingBox.fromMinMax(-1, -1, -1, width, height, depth);
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

    animationHandler(timestamp: DOMHighResTimeStamp) {
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

    toBaseValue(tileName: TileName) {
        return this.baseTiles.indexOf(tileName);
    }
    toTileName(v: number) {
        return this.baseTiles[v];
    }

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
    toX(i: number) {
        return i & ((1 << (this.widthBits)) - 1);
    }
    toY(i: number) {
        return (i >>> this.widthBits) & ((1 << this.heightBits) - 1);
    }
    toZ(i: number) {
        return i >>> (this.widthBits + this.heightBits);
    }
    toCoord(i: number) {
        return Coord.XYZ(this.toX(i), this.toY(i), this.toZ(i));
    }
    fromIndex(i: number): [x: number, y: number, z: number] {
        const x = this.toX(i);
        const y = this.toY(i);
        const z = this.toZ(i);
        return [x, y, z];
    }

    inMap(x = 0, y = 0, z = 0) {
        return this.bounds.contains(x, y, z);
    }

    setDisplayBounds(setBBoxFunc: (bbox: BoundingBox) => void) {
        const bbox = this.displayBounds.makeWritable();
        setBBoxFunc(bbox);
        return bbox.intersect(this.exteriorBounds).round();
    }

    setPathingBounds(setBBoxFunc: (bbox: BoundingBox) => void) {
        const bbox = this.pathingBounds.makeWritable();
        setBBoxFunc(bbox);
        return bbox.intersect(this.bounds).round();
    }

    setCenteredDisplayBoundsTo(x=0, y=0, z=0, w=0, h=0, d=0) {
        return this.setDisplayBounds(bb => bb.setCenterSize(x, y, z, w, h, d));
    }

    setCenteredPathingBoundsTo(x=0, y=0, z=0, w=0, h=0, d=0) {
        return this.setPathingBounds(bb => bb.setCenterSize(x, y, z, w, h, d));
    }

    clearAll() {
        this.fogMap.fill(0);
        this.baseMap.fill(0);
        this.sprites.length = 0;
    }

    getBase(x: number, y: number, z: number) {
        return this.inMap(x, y, z) ? this.baseMap[this.toIndex(x, y, z)] : this.defaultTileIndex;
    }

    getBaseTile(x: number, y: number, z: number) {
        return this.getTileFrameFor(x, y, z);
    }

    setBase(x: number, y: number, z: number, w: number) {
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

    isSameBaseAs(x: number, y: number, z: number, base: number) {
        return this.isIndexSameBaseAs(this.toIndex(x, y, z), base);
    }
    isIndexSameBaseAs(index: number, base: number) {
        // this is simple right now but it could eventually incorporate "similar-enough" logic for
        // different wall sprites that should nonetheless count each other for tiling purposes
        return (this.baseMap[index] ?? this.defaultTileIndex) === base;
    }

    getTileFrameFor(x: number, y: number, z: number,
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

    getWallInfoFor(x: number, y: number, z: number,
                   inMap = this.inMap(x, y, z),
                   baseIndex = this.toIndex(x, y, z),
                   base = inMap ? this.baseMap[baseIndex] : this.defaultTileIndex) {
        let total = 0;
        const {surroundingIndices, surroundingDirections} = this;

        if (this.interiorBounds.contains(x, y, z)) {
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

    hasSprite(sprite: MapSprite) {
        return this.sprites.includes(sprite);
    }

    addSprite(sprite: MapSprite, overrides?: Partial<MapSprite>) {
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

    removeSprite(sprite: MapSprite) {
        const index = this.sprites.indexOf(sprite);
        if (index >= 0) {
            this.sprites.splice(index, 1);
            this.drawTile(sprite.x, sprite.y, sprite.z);
            sprite.worldMap = null;
            return true;
        }
        return false;
    }

    swapSprite<T extends MapSprite>(fromSprite: MapSprite, toSprite: T, overrides?: Overrides<T>) {
        if (this.removeSprite(fromSprite)) {
            const {x, y, z, visible, tangible} = fromSprite;
            return this.addSprite(toSprite, {x, y, z, visible, tangible, ...overrides});
        }
        return false;
    }

    makeSetBaseCallback(xOrigin = 0, yOrigin = 0, zOrigin = 0, tileMapping: Record<number, TileName> = this.baseTiles) {
        return (x: number, y: number, z: number, w: number) => this.setBase(xOrigin + x, yOrigin + y, zOrigin + z, this.toBaseValue(tileMapping[w]));
    }

    getSpriteChar(sprite: MapSprite) {
        const frame: TileFrame | undefined = Tileset.light.layerFrames[sprite.spriteTile]?.[sprite.spriteFrame];
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
             sprites = this.sprites,
             bg = null,
             bgUnseen = null,
             bgUnknown = null) {

        if (!inSemiOpenRange(row, 0, height) || !inSemiOpenRange(col, 0, width)) return;

        const baseIndex = this.nearIndex(x, y, z);
        let fg: any = null;
        if (this.enableCutaway && focusOffset && this.baseMap[baseIndex + focusOffset] === 0) {
            fg = focusOpacity;
            if (this.visibilitySource) {
                const {x: vx, y: vy} = this.visibilitySource;
                if (x === vx && y === vy) {
                    fg *= 0.5;
                } else if (Math.max(Math.abs(x - vx), Math.abs(y - vy)) === 1) {
                    fg *= 0.75;
                }
            }
        }
        // nearIndex will either return a valid in-map index or -1
        const fog = this.fogMap[baseIndex] ?? 0;
        if (!(fog & FOG_VISIBLE)) {
            if (fog & FOG_KNOWN) {
                fg ??= 1;
                fg *= 0.5;
                bg = bgUnseen;
            } else {
                if (bgUnknown) {
                    display.draw(col, row, [], null, bgUnknown);
                }
                return;
            }
        }

        const baseTile = this.getBaseTile(x, y, z);
        const tiles: string[] = [];
        if (baseTile) {
            tiles.push(baseTile.char);
        }
        for (const sprite of this.getSpritesAt(x, y, z, sprites)) {
            if (!sprite.visible) continue;
            tiles.push(this.getSpriteChar(sprite));
        }
        display.draw(col, row, tiles, fg, bg);
    }

    drawLayer(display: Display, centerX = 0, centerY = 0, z = 0, focusLayer = Infinity) {
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

    drawDepthColumn(display: Display, x = 0, y = 0, zOrigin = -1) {
        const {width, height} = display.getOptions();
        const sprites = this.sprites.filter(s => s.x === x && s.y === y);
        display.clear();
        for (let j = 0; j < height; j++) {
            const z = zOrigin + height - j - 1;
            this.drawTile(x, y, z,
                          null, null, null, // focus*
                          display,
                          null, null, // center*
                          width, height,
                          null, null, // *Origin
                          j, 0,
                          sprites,
                          "#141335",   // bg
                          "#14133580", // bgUnseen
                          "#14133540", // bgUnknown
                        );
        }
    }

    drawLayers(displays: Display[], centerX = 0, centerY = 0, zOrigin = 0, zFocus = Infinity) {
        const [maxWidth, maxHeight] = displays.map(d => [d.getOptions().width, d.getOptions().height]).reduce((a, b) => a[0] > b[0] ? a : b);
        this.setDisplayBounds(bb => bb
            .setCenterSize(centerX, centerY, null, maxWidth, maxHeight, null)
            .setXYZWHD(null, null, zOrigin, null, null, displays.length));
        
        this.clearFogMap(FOG_VISIBLE);
        const {x, y, z} = this.visibilitySource ?? {};
        if (this.visibilitySource) {
            this.clearFogMap(FOG_VISIBLE, BoundingBox.fromXYZWHD(x, y, 0, 1, 1, this.depth));
        }
        this.computeVisibility(x, y, z, this.visibilitySource.visibilityRadius);
        for (const [k, display] of displays.entries()) {
            this.drawLayer(display, centerX, centerY, zOrigin + k, zFocus);
        }
    }

    clearFogMap(flags: number, bbox = this.displayBounds) {
        bbox.walk((x, y, z) => this.fogMap[this.toIndex(x, y, z)] &= ~flags);
    }

    static callback(x: number, y: number, z: number, contents: number) {}
}

export interface SpriteContainer {
     worldMap: WorldMap;
     container: SpriteContainer;
     rootSprite: MapSprite;
     inventory: MapSprite[];
     hasItem(sprite: MapSprite): boolean;
     relinquishItem(sprite: MapSprite): boolean;
     replaceItem(sprite: MapSprite, withSprite: MapSprite): boolean;
}

export function isSpriteContainer(sprite: MapSprite): sprite is MapSprite & SpriteContainer {
    return "hasItem" in sprite && "relinquishItem" in sprite;
}

export class MapSprite {
    x = 0;
    y = 0;
    z = 0;
    spriteTile: TileName;
    spriteFrame = 0;
    animated = false;
    visible = true;
    tangible = true;
    displayLayer = 0;
    visibilityRadius = 8;
    animationFrameStart = 0;

    get coord() {
        const {x, y, z} = this;
        return Coord.XYZ(x, y, z);
    }

    get tileFrame() {
        return Tileset.light.layerFrames[this.spriteTile]?.at(this.spriteFrame)
    }

    #worldMap: WeakRef<WorldMap>;
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

    get rootSprite() {
        return this.container?.rootSprite ?? this;
    }

    #container: WeakRef<SpriteContainer>;
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

    constructor(spriteTile: TileName, options: Overrides<MapSprite> = {}) {
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

    canSpawnAt(x: number, y: number, z: number, worldMap: WorldMap, popDef: PopDefinition, rootPopDef: PopDefinition) {
        return worldMap.isEmpty(x, y, z);
    }

    static spawnNearbyFunction: typeof import("./procgen.js")["spawnNearby"];

    spawnNearby(popDef: PopDefinition, options?: { minRadius?: number; maxRadius?: number; }, worldMap = this.rootSprite?.worldMap ?? this.worldMap) {
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

    addedToWorldMap(worldMap: WorldMap) {
    }

    addedToContainer(container: SpriteContainer) {
    }
}

Object.assign(self, {WorldMap, MapSprite, FOG_KNOWN, FOG_VISIBLE});
