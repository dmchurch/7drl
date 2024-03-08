import { Display } from "rot-js";
import { WorldMap } from "./worldmap.js";
import Tile from "rot-js/lib/display/tile.js"
import { htmlElement } from "./helpers.js";

/**
 * @typedef {ConstructorParameters<typeof Display>[0] & {
 *  layers?: number,
 *  focusLayer?: number,
 *  width: number,
 *  height: number,
 * }} Options
 */

export class Viewport {
    /** @type {WorldMap} */
    worldMap;

    /** @type {HTMLElement} */
    container;
    /** @type {Display[]} */
    displays;

    width;
    height;
    layers;
    focusLayer;

    centerX;
    centerY;
    centerZ;

    resizeObserver;
    /** @type {WeakMap<Element, {widthProperty: string, heightProperty: string}>} */
    observingElements = new WeakMap();

    /** @return {{x: number, y: number, z: number}} */
    get displayOffset() {
        return {
            x: this.centerX,
            y: this.centerY,
            z: this.centerZ - this.focusLayer,
        }
    }

    /** @param {Options} options @param {Element|string} viewportContainer  */
    constructor(worldMap, viewportContainer, options) {
        this.worldMap = worldMap;
        this.container = htmlElement(viewportContainer);
        this.layers = options.layers ?? 8;
        this.focusLayer = options.focusLayer ?? (this.layers >> 1);
        this.displays = [];
        const {width, height} = options;
        this.width = width;
        this.height = height;

        for (let i = 0; i < this.layers; i++) {
            const expandViewport = 4 * Math.abs(this.focusLayer - i);
            this.displays[i] = new FixedDisplay({...options, width: width + expandViewport, height: height + expandViewport});
            const layerContainer = this.displays[i].getContainer();
            this.container.appendChild(layerContainer);
            layerContainer.classList.add("viewport-layer");
            layerContainer.dataset.index = String(i);
            layerContainer.style.setProperty("--layer-index", String(i));
        }
        this.container.style.setProperty("--layer-count", String(this.layers));
        this.container.style.setProperty("--focus-cols", String(width));
        this.container.style.setProperty("--focus-rows", String(height));
        this.container.style.setProperty("--viewport-px-width", `${width * options.tileWidth}`);
        this.container.style.setProperty("--viewport-px-height", `${height * options.tileHeight}`);

        this.centerX = this.worldMap.width >> 1;
        this.centerY = this.worldMap.height >> 1;
        this.centerZ = this.worldMap.depth >> 1;

        this.resizeObserver = new ResizeObserver(this.resizeCallback.bind(this));
    }

    getDisplayForLayer(z = this.centerZ) {
        const layerIndex = z - this.displayOffset.z;
        return this.displays[layerIndex];
    }

    /** @param {ResizeObserverEntry[]} entries @param {ResizeObserver} observer */
    resizeCallback(entries, observer) {
        for (const entry of entries) {
            const {target, contentBoxSize} = entry;
            const observation = this.observingElements.get(target);
            if (!observation || !(target instanceof HTMLElement)) continue;
            const {widthProperty, heightProperty} = observation;
            target.style.setProperty(widthProperty, contentBoxSize[0].inlineSize.toString());
            target.style.setProperty(heightProperty, contentBoxSize[0].blockSize.toString());
        }
    }

    /** @param {Element} element  */
    trackSize(element, widthProperty = "--container-px-width", heightProperty = "--container-px-height") {
        if (this.observingElements.has(element)) return;
        this.observingElements.set(element, {widthProperty, heightProperty});
        this.resizeObserver.observe(element, {box: "content-box"});
    }

    moveViewport(deltaX = 0, deltaY = 0, deltaZ = 0, forceRedraw) {
        this.centerX += deltaX;
        this.centerY += deltaY;
        this.centerZ += deltaZ;
        if (forceRedraw === true || (forceRedraw !== false && (deltaX || deltaY || deltaZ))) {
            this.redraw();
            return true;
        }
        return false;
    }

    /** @param {boolean} [forceRedraw]  */
    centerOn(newX = 0, newY = 0, newZ = 0, forceRedraw) {
        return this.moveViewport(newX - this.centerX, newY - this.centerY, newZ - this.centerZ, forceRedraw);
    }

    redraw() {
        this.container.style.setProperty("--center-x", String(this.centerX));
        this.container.style.setProperty("--center-y", String(this.centerY));
        this.container.style.setProperty("--center-z", String(this.centerZ));
        const {x, y, z} = this.displayOffset;
        for (const [k, display] of this.displays.entries()) {
            const container = display.getContainer();
            const layerZ = z + k;
            const offset = layerZ - this.centerZ;
            container.dataset.layerZ = String(layerZ)
            container.style.setProperty("--layer-offset", String(offset));
            container.classList.remove("layer-above","layer-below","layer-focus")
            if (offset === 0) {
                container.classList.add("layer-focus");
            } else if (offset > 0) {
                container.classList.add("layer-above");
            } else if (offset < 0) {
                container.classList.add("layer-below");
            }
        }
        this.worldMap.drawLayers(this.displays, x, y, z, this.centerZ);
    }
}

class FixedTile extends Tile {
    clear() {
        const oldComposite = this._ctx.globalCompositeOperation;
        this._ctx.globalCompositeOperation = "copy";
        super.clear();
        this._ctx.globalCompositeOperation = oldComposite;
    }

    draw(data, clearBefore) {
        const {globalCompositeOperation, globalAlpha} = this._ctx;
        let [x, y, ch, fg, bg] = data;
        let tileWidth = this._options.tileWidth;
        let tileHeight = this._options.tileHeight;
        if (clearBefore) {
            if (this._options.tileColorize) {
                this._ctx.clearRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight);
            }
            else {
                this._ctx.globalCompositeOperation = "copy";
                this._ctx.fillStyle = bg;
                this._ctx.fillRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight);
                this._ctx.globalCompositeOperation = globalCompositeOperation;
            }
        }
        if (!ch) {
            return;
        }
        let chars = [].concat(ch);
        let fgs = [].concat(fg);
        let bgs = [].concat(bg);

        for (let i = 0; i < chars.length; i++) {
            let tile = this._options.tileMap[chars[i]];
            if (!tile) {
                throw new Error(`Char "${chars[i]}" not found in tileMap`);
            }
            if (this._options.tileColorize) { // apply colorization
                let canvas = this._colorCanvas;
                let context = canvas.getContext("2d");
                context.globalCompositeOperation = "source-over";
                context.clearRect(0, 0, tileWidth, tileHeight);
                let fg = fgs[i];
                let bg = bgs[i];
                context.drawImage(this._options.tileSet, tile[0], tile[1], tileWidth, tileHeight, 0, 0, tileWidth, tileHeight);
                if (fg != "transparent") {
                    context.fillStyle = fg;
                    context.globalCompositeOperation = "source-atop";
                    context.fillRect(0, 0, tileWidth, tileHeight);
                }
                if (bg != "transparent") {
                    context.fillStyle = bg;
                    context.globalCompositeOperation = "destination-over";
                    context.fillRect(0, 0, tileWidth, tileHeight);
                }
                this._ctx.drawImage(canvas, x * tileWidth, y * tileHeight, tileWidth, tileHeight);
            }
            else { // no colorizing, easy
                let fg = fgs[i];
                if (typeof fg === "number") {
                    this._ctx.globalAlpha = fg;
                }
                this._ctx.drawImage(this._options.tileSet, tile[0], tile[1], tileWidth, tileHeight, x * tileWidth, y * tileHeight, tileWidth, tileHeight);
            }
        }
        this._ctx.globalAlpha = globalAlpha;
    }
}

class FixedDisplay extends Display {
    /** @param {ConstructorParameters<typeof Display>[0]} options  */
    constructor(options) {
        super(options);
        if (this._backend instanceof Tile) {
            Object.setPrototypeOf(this._backend, FixedTile.prototype);
        }
    }
}