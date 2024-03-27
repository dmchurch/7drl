import { mapEntries, memoize, typedEntries } from "./helpers.js";
import { tileSheets, tiles, wallRules } from "~data/tiles.js";
import { WallRule } from "./walls.js";
import type { TileOptions } from "rot-js/lib/display/tile.js";

console.debug("Starting tileset.js");

export class Tileset {
    static get light() {
        const sheetmap = mapEntries(tileSheets, this.makeSheetDef);
        return memoize(this, "light", CompositeTileSheet.makeComposite(sheetmap, tiles));
    }
    static get dark() {
        const sheetmap = mapEntries(tileSheets, this.makeSheetDef);
        return memoize(this, "dark", CompositeTileSheet.makeComposite(sheetmap, tiles, true));
    }

    static makeSheetDef(entry: string | [string, string] | TileSheetDef): TileSheetDef {
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

export class BaseTileSheet<LayerName extends string> {
    name: string;
    img: HTMLImageElement | ImageBitmap;

    sheetWidth = 0;
    sheetHeight = 0;

    tileWidth = 0;
    tileHeight = 0;

    layerFrames: Partial<Record<LayerName, TileFrame[]>> = {};

    allFrames: TileFrame[] = [];

    charMap: Record<string, [x: number, y: number]>;

    get ready(): Promise<unknown> {
        return memoize(this, "ready", Promise.all([this.imageReady, this.metadataReady]));
    }
    set ready(v) {
        memoize(this, "ready", v);
    }

    imageReady: Promise<unknown>;
    metadataReady: Promise<unknown>;

    toString() {
        return this.name;
    }

    constructor(name: string) {
        this.name = name;
    }

    createCharMap() {
        const map: Record<string, [number, number]> = {};
        for (const frame of this.allFrames) {
            map[frame.char] = [frame.x, frame.y];
        }
        this.charMap = map;
        return map;
    }

    get displayOptions() {
        const {tileHeight, tileWidth, img} = this;
        return {
            layout: "tile",
            bg: "transparent",
            tileWidth,
            tileHeight,
            tileSet: img,
            tileMap: this.charMap ?? this.createCharMap(),
        } satisfies TileOptions;
    }

    async getDisplayOptions() {
        await this.ready;
        return this.displayOptions
    }
}

export class CompositeTileSheet extends BaseTileSheet<TileName> {
    static makeComposite(sheetrefs: Record<string, TileSheetDef>, tileDefs: Partial<Record<TileName, TileInfo>>, darkMode = false) {
        return new this(mapEntries(sheetrefs, d => AsepriteTileSheet.getByName(darkMode ? d.filenameDark ?? d.filename : d.filename, d)), tileDefs);
    }

    componentSheets: Partial<Record<TileSheetName, BaseTileSheet<TileName>>> = {};

    componentSheetOffsets: Partial<Record<TileSheetName, number>> = {};

    constructor(sheetMap: Record<string, BaseTileSheet<string>>, tileDefs: Partial<Record<TileName, TileInfo>>) {
        super(`(${Object.values(sheetMap).map(s => s.name).join()})`);
        this.componentSheets = sheetMap;
        this.metadataReady = this.compileMetadata(tileDefs);
        this.imageReady = this.constructImage();
    }

    async compileMetadata(tileDefs: Partial<Record<TileName, TileInfo>>) {
        // console.log(`compiling metadata for ${this}`);
        let sheetOffset = 0;
        let firstSheet = true;
        const sheetLayers: Partial<Record<TileSheetName, Record<string, TileFrame[]>>> = {};
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
            const frameIndex = tileInfo.frameIndex;
            const frameType = tileInfo.frameType;
            
            const layerFrames = sheetLayers[sheetRef]?.[layerName];
            if (!layerFrames) {
                console.warn(`Unable to find layer ${layerName} in sheet ${sheetRef} for tile ${tileName}, skipping`);
                continue;
            }
            const targetFrames = ((frameType || frameIndex == undefined) ? layerFrames : [layerFrames[frameIndex]]);
            const frames = targetFrames.map((tInfo, frameIndex) => ({
                ...tInfo,
                ...tileInfo,
                char: String.fromCodePoint(codePoint++),
                y: tInfo.y + sheetOffset,
                frameIndex: frameIndex ?? 0,
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

export class AsepriteTileSheet extends BaseTileSheet<string> {
    static #knownTileSheets: Record<string, AsepriteTileSheet> = {__proto__: null};
    static getByName(name: string, sheetDef: TileSheetDef): AsepriteTileSheet {
        if (name in this.#knownTileSheets) return this.#knownTileSheets[name];

        if (sheetDef.mode === "walls") {
            return this.#knownTileSheets[name] = new WallTemplateTileSheet(name, wallRules[sheetDef.wallRules]);
        }

        return this.#knownTileSheets[name] = new AsepriteTileSheet(name);
    }

    constructor(name: string) {
        super(name);
        const img = this.img = document.createElement("img");
        img.src = `img/${name}.png`;
        this.imageReady = img.decode();
        this.metadataReady = this.fetchMetadata();
    }

    async fetchMetadata() {
        const response = await fetch(`img/${this.name}.json`);
        const data: AsepriteExport = await response.json();

        this.sheetWidth = data.meta.size.w;
        this.sheetHeight = data.meta.size.h;

        const layerFrames: Record<string, TileFrame[]> = {};
        const allFrames = [];
        const frameNameRe = /^(.+?) \((.+)\)\s*(\d*)\.aseprite/;

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
            const tileFrame: TileFrame = {
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
    wallRule: WallRule;

    constructor(name: string, wallRule: WallRule) {
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
            const newFrames: TileFrame[] = [];
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