import { Display } from "rot-js";
import { WorldMap } from "./worldmap.js";

/**
 * @typedef {ConstructorParameters<typeof Display>[0] & {
 *  layers?: number,
 * }} Options
 */

export class Viewport {
    /** @type {WorldMap} */
    worldMap;

    /** @type {Element} */
    container;
    /** @type {Display[]} */
    displays;

    width;
    height;
    layers;

    centerX;
    centerY;
    centerZ;

    get displayOffset() {
        return [
            this.centerX - (this.width >> 1),
            this.centerY - (this.height >> 1),
            this.centerZ - (this.layers >> 1),
        ]
    }

    /** @param {Options} options  */
    constructor(worldMap, viewportContainer, options) {
        this.worldMap = worldMap;
        this.container = viewportContainer instanceof Element ? viewportContainer : (document.getElementById(viewportContainer) ?? document.querySelector(viewportContainer));
        this.layers = options.layers ?? 8;
        this.displays = [];
        for (let i = 0; i < this.layers; i++) {
            this.displays[i] = new Display(options);
            const layerContainer = this.displays[i].getContainer();
            this.container.appendChild(layerContainer);
            layerContainer.dataset.index = String(i);
            layerContainer.style.setProperty("--layer-index", String(i));
        }
        this.container.style.setProperty("--layer-count", String(this.layers));
        const {width, height} = this.displays[0].getOptions();
        this.width = width;
        this.height = height;

        this.centerX = this.worldMap.width >> 1;
        this.centerY = this.worldMap.height >> 1;
        this.centerZ = this.worldMap.depth >> 1;
    }

    moveViewport(deltaX = 0, deltaY = 0, deltaZ = 0) {
        this.centerX += deltaX;
        this.centerY += deltaY;
        this.centerZ += deltaZ;
        if (deltaX || deltaY || deltaZ) {
            this.redraw();
        }
    }

    redraw() {
        this.worldMap.drawLayers(this.displays, ...this.displayOffset);
    }
}