export class Tileset {
    static container = document.getElementById("tilesheets");
    /** @type {TileFrame} */
    static defaultClear;
    /** @type {TileFrame} */
    static defaultWall;
    /** @type {Tileset} */
    static tiles1;

    name;
    /** @type {HTMLImageElement} */
    img;
    /** @type {Promise<HTMLImageElement>} */
    image;
    map;

    /** @type {Record<LayerName, TileFrame[]>} */
    layerFrames;

    /** @param {string} name  */
    constructor(name) {
        this.name = name;
        this.img = document.createElement("img");
        this.img.src = `img/${name}.png`;
        this.image = new Promise(r => this.img.onload = (r(this.img)));
        this.map = this.fetchMap();
        new.target.container?.append(this.img);
    }

    /** @returns {ConstructorParameters<typeof import("rot-js").Display>[0]} */
    async getDisplayOptions() {
        const tileSet = this.img;
        const {tileHeight, tileWidth, tileMap} = await this.map;
        return {
            layout: "tile",
            bg: "transparent",
            tileWidth,
            tileHeight,
            tileSet,
            tileMap,
        };
    }

    async fetchMap() {
        const response = await fetch(`img/${this.name}.json`);
        /** @type {AsepriteExport} */
        const data = await response.json();

        /** @type {Record<string, TileFrame[]>} */
        const layerFrames = {};
        const allFrames = [];
        const frameNameRe = /^([^(]+) \((.+)\) (\d+)\.aseprite/;
        let tileWidth = 0, tileHeight = 0;
        /** @type {Record<string, [number, number]>} */
        const tileMap = {};

        let charIndex = 0xe000;

        for (const [name, frame] of Object.entries(data.frames)) {
            const match = frameNameRe.exec(name);
            if (!match) {
                console.error(`Could not recognize frame name ${name}, skipping frame`);
                continue;
            }
            const [, _imgName, layerName, frameIndex] = match;
            /** @type {TileFrame} */
            const tileFrame = {
                ...frame,
                layerName,
                frameIndex,
                char: String.fromCodePoint(charIndex++),
            };
            (layerFrames[layerName] ??= [])[frameIndex] = tileFrame;
            allFrames.push(tileFrame);
            tileMap[tileFrame.char] = [tileFrame.frame.x, tileFrame.frame.y];
            tileWidth = frame.sourceSize.w;
            tileHeight  = frame.sourceSize.h;
        }

        this.layerFrames = layerFrames;
        Tileset.defaultClear ??= this.layerFrames.Background?.[0];
        Tileset.defaultWall ??= this.layerFrames.solidwall?.[0];

        return {
            tileWidth,
            tileHeight,
            tileMap,
            layerFrames,
            allFrames,
            data,
        };
    }
}
