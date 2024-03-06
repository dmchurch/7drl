import { mapEntries, memoize, typedEntries } from "./helpers.js";
import { tileSheets, tiles, wallRules } from "./tiles.js";
import { WallRule } from "./walls.js";

export class Tileset {
    static get light() {
        const sheetmap = mapEntries(tileSheets, this.makeSheetDef);
        return memoize(this, "light", CompositeTileSheet.makeComposite(sheetmap, tiles));
    }
    static get dark() {
        const sheetmap = mapEntries(tileSheets, this.makeSheetDef);
        return memoize(this, "dark", CompositeTileSheet.makeComposite(sheetmap, tiles, true));
    }

    /** @param {string|[string,string]|TileSheetDef} entry  @returns {TileSheetDef} */
    static makeSheetDef(entry) {
        if (typeof entry === "string") {
            entry = [entry, undefined];
        }
        if (Array.isArray(entry)) {
            entry = {
                filename: entry[0],
                filenameDark: entry[1],
                mode: "frames",
            };
            if (!entry.filenameDark) delete entry.filenameDark;
        }
        return entry;
    }
}

/** @template {string} [LayerName = string] */
export class BaseTileSheet {
    /** @type {string} */
    name;
    /** @type {HTMLImageElement | ImageBitmap} */
    img;

    sheetWidth = 0;
    sheetHeight = 0;

    tileWidth = 0;
    tileHeight = 0;

    /** @type {Partial<Record<LayerName, TileFrame[]>>} */
    layerFrames = {};

    /** @type {TileFrame[]} */
    allFrames = [];

    /** @type {Record<string, [x: number, y: number]>} */
    charMap;

    /** @type {Promise<unknown>} */
    get ready() {
        return memoize(this, "ready", Promise.all([this.imageReady, this.metadataReady]));
    }
    set ready(v) {
        memoize(this, "ready", v);
    }

    /** @type {Promise<unknown>} */
    imageReady;
    /** @type {Promise<unknown>} */
    metadataReady;

    toString() {
        return this.name;
    }

    /** @param {string} name */
    constructor(name) {
        this.name = name;
    }

    createCharMap() {
        /** @type {Record<string, [number, number]>} */
        const map = {};
        for (const frame of this.allFrames) {
            map[frame.char] = [frame.x, frame.y];
        }
        this.charMap = map;
        return map;
    }

    /** @type {ConstructorParameters<typeof import("rot-js").Display>[0]} */
    get displayOptions() {
        const {tileHeight, tileWidth, img} = this;
        return {
            layout: "tile",
            bg: "transparent",
            tileWidth,
            tileHeight,
            tileSet: /** @type {HTMLImageElement} */(img),
            tileMap: this.charMap ?? this.createCharMap(),
        };
    }

    async getDisplayOptions() {
        await this.ready;
        return this.displayOptions
    }
}

/** @extends {BaseTileSheet<TileName>} */
export class CompositeTileSheet extends BaseTileSheet {
    /** @param {Record<string, TileSheetDef>} sheetrefs @param {Partial<Record<TileName, TileInfo>>} tileDefs */
    static makeComposite(sheetrefs, tileDefs, darkMode = false) {
        return new this(mapEntries(sheetrefs, d => AsepriteTileSheet.getByName(darkMode ? d.filenameDark ?? d.filename : d.filename, d)), tileDefs);
    }

    /** @type {Partial<Record<TileSheetName, BaseTileSheet>>} */
    componentSheets = {};

    /** @type {Partial<Record<TileSheetName, number>>} */
    componentSheetOffsets = {};

    /** @param {Record<string, BaseTileSheet>} sheetMap @param {Partial<Record<TileName, TileInfo>>} tileDefs */
    constructor(sheetMap, tileDefs) {
        super(`(${Object.values(sheetMap).map(s => s.name).join()})`);
        this.componentSheets = sheetMap;
        this.metadataReady = this.compileMetadata(tileDefs);
        this.imageReady = this.constructImage();
    }

    /** @param {Partial<Record<TileName, TileInfo>>} tileDefs */
    async compileMetadata(tileDefs) {
        // console.log(`compiling metadata for ${this}`);
        let sheetOffset = 0;
        let firstSheet = true;
        /** @type {Partial<Record<TileSheetName, Record<string, TileFrame[]>>>} */
        const sheetLayers = {};
        for (const [sheetRef, sheet] of typedEntries(this.componentSheets)) {
            await sheet.metadataReady;
            if (firstSheet) {
                this.sheetWidth = sheet.sheetWidth;
                this.sheetHeight = sheet.sheetHeight;
                this.tileWidth = sheet.tileWidth;
                this.tileHeight = sheet.tileHeight;
                firstSheet = false;
            } else {
                this.sheetWidth = Math.max(this.sheetWidth, sheet.sheetWidth);
                this.sheetHeight += sheet.sheetHeight;
                if (sheet.tileWidth !== this.tileWidth || sheet.tileWidth !== this.tileHeight) {
                    console.warn(`Sheet ${sheet} not same tilesize as other sheets in ${this}`, sheet, this);
                }
            }

            sheetLayers[sheetRef] = sheet.layerFrames;
            this.componentSheetOffsets[sheetRef] = sheetOffset;

            sheetOffset += sheet.sheetHeight;
        }

        let codePoint = 0xe000;

        for (const [tileName, tileInfo] of typedEntries(tileDefs)) {
            const sheetRef = tileInfo.sheet;
            const layerName = tileInfo.layerName ?? tileName;
            const sheetOffset = this.componentSheetOffsets[sheetRef];
            const frameIndex = tileInfo.frameIndex ?? 0;
            const frameType = tileInfo.frameType;
            
            const layerFrames = sheetLayers[sheetRef]?.[layerName];
            if (!layerFrames) {
                console.warn(`Unable to find layer ${layerName} in sheet ${sheetRef} for tile ${tileName}, skipping`);
                continue;
            }
            const targetFrames = (frameType ? layerFrames : [layerFrames[frameIndex]]);
            const frames = targetFrames.map((tInfo, frameIndex) => ({
                ...tInfo,
                ...tileInfo,
                char: String.fromCodePoint(codePoint++),
                y: tInfo.y + sheetOffset,
                frameIndex,
                layerName: tileName,
                tileName,
            }));
            for (const frame of frames) {
                frame.frames = frames;
            }
            this.layerFrames[tileName] = frames;
            this.allFrames.push(...frames);
        }
        // console.log(`metadata compiled for ${this}`);
    }

    async constructImage() {
        await this.metadataReady;
        // console.log(`Creating offscreen canvas for ${this} with ${this.sheetWidth}, ${this.sheetHeight}`)

        const canvas = new OffscreenCanvas(this.sheetWidth, this.sheetHeight);
        const ctx = canvas.getContext("2d");
        for (const [sheetRef, sheet] of typedEntries(this.componentSheets)) {
            await sheet.ready;
            ctx.drawImage(sheet.img, 0, this.componentSheetOffsets[sheetRef]);
        }

        this.img = canvas.transferToImageBitmap();
    }
}

export class AsepriteTileSheet extends BaseTileSheet {

    /** @type {Record<string, AsepriteTileSheet>} */
    static #knownTileSheets = {__proto__: null};
    /** @param {string} name @param {TileSheetDef} sheetDef @returns {AsepriteTileSheet} */
    static getByName(name, sheetDef) {
        if (name in this.#knownTileSheets) return this.#knownTileSheets[name];

        if (sheetDef.mode === "walls") {
            return this.#knownTileSheets[name] = new WallTemplateTileSheet(name, wallRules[sheetDef.wallRules]);
        }

        return this.#knownTileSheets[name] = new AsepriteTileSheet(name);
    }

    /** @param {string} name */
    constructor(name) {
        super(name);
        const img = this.img = document.createElement("img");
        img.src = `img/${name}.png`;
        this.imageReady = img.decode();
        this.metadataReady = this.fetchMetadata();
    }

    async fetchMetadata() {
        const response = await fetch(`img/${this.name}.json`);
        /** @type {AsepriteExport} */
        const data = await response.json();

        this.sheetWidth = data.meta.size.w;
        this.sheetHeight = data.meta.size.h;

        /** @type {Record<string, TileFrame[]>} */
        const layerFrames = {};
        const allFrames = [];
        const frameNameRe = /^([^(]+) \((.+)\)\s*(\d*)\.aseprite/;

        for (const [name, sourceFrame] of Object.entries(data.frames)) {
            if (Array.isArray(data.frames) && name === "length") continue;
            const match = frameNameRe.exec(("filename" in sourceFrame) ? sourceFrame.filename : name);
            if (!match) {
                console.error(`Could not recognize frame name ${name} from file img/${this.name}.json, skipping frame`);
                continue;
            }
            const [, _imgName, layerName, rawFrameIndex] = match;
            const frames = layerFrames[layerName] ??= [];
            const frameIndex = parseInt(rawFrameIndex) || frames.length;
            /** @type {TileFrame} */
            const tileFrame = {
                tileName: null,
                sheet: null,
                layerName,
                frameIndex,
                x: sourceFrame.frame.x,
                y: sourceFrame.frame.y,
                sourceFrame,
                frames,
            };
            frames[frameIndex] = tileFrame;
            allFrames.push(tileFrame);

            this.tileWidth ||= sourceFrame.sourceSize.w;
            this.tileHeight ||= sourceFrame.sourceSize.h;
            if (this.tileWidth !== sourceFrame.sourceSize.w
                || this.tileHeight !== sourceFrame.sourceSize.h) {
                console.error(`Frame ${name} has a different size (${sourceFrame.sourceSize.w}×${sourceFrame.sourceSize.h}) than expected (${this.tileWidth}×${this.tileHeight})!`, this, sourceFrame);
            }
        }

        this.layerFrames = layerFrames;
        this.allFrames = allFrames;
    }
}

export class WallTemplateTileSheet extends AsepriteTileSheet {
    wallRule;

    /** @param {string} name @param {WallRule} wallRule  */
    constructor(name, wallRule) {
        super(name);
        this.wallRule = wallRule;
    }

    async fetchMetadata() {
        await super.fetchMetadata();
        // now we turn the single-frame large template frames into sliced tile frames
        // first, figure out the size of a tile
        const templateRows = this.wallRule.framesTemplate.length;
        const templateCols = Math.max(...this.wallRule.framesTemplate.map(r => r.length));
        const tileHeight = this.tileHeight / templateRows;
        const tileWidth = this.tileWidth / templateCols;
        if (!Number.isInteger(tileHeight) || !Number.isInteger(tileWidth)) {
            throw new Error(`Bad wall-template tilesheet ${this.name}, sprite dimensions ${this.tileWidth}×${this.tileHeight} should be a multiple of ${templateCols}×${templateRows}`);
        }
        this.tileHeight = tileHeight;
        this.tileWidth = tileWidth;
        // now, go through each layer and tile them out
        for (const [name, frames] of typedEntries(this.layerFrames)) {
            /** @type {TileFrame[]} */
            const newFrames = [];
            for (const frame of frames) {
                for (const {x, y} of this.wallRule.frameLocations) {
                    newFrames.push({
                        ...frame,
                        x: frame.x + tileWidth * x,
                        y: frame.y + tileHeight * y,
                        frameIndex: newFrames.length,
                        frames: newFrames,
                    })
                }
            }
            this.layerFrames[name] = newFrames;
        }
    }
}

Object.assign(self, {Tileset, CompositeTileSheet, AsepriteTileSheet});