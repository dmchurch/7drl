import { Display as ROTDisplay } from "rot-js";
import { WorldMap } from "./worldmap.js";
import { htmlElement } from "./helpers.js";
import type { TileOptions } from "rot-js/lib/display/tile.js";

const Display = ROTDisplay;
export type Display = ROTDisplay<"tile">;

export interface ViewportOptions extends TileOptions {
    layers?: number;
    focusLayer?: number;
    width: number;
    height: number;
};

export class Viewport {
    worldMap: WorldMap;

    container: HTMLElement;
    displays: Display[];
    focusDisplay: Display;

    depthContainer: HTMLElement;
    depthDisplay: Display;

    width;
    height;
    layers;
    focusLayer;

    centerX;
    centerY;
    centerZ;

    resizeObserver;
    observingElements: WeakMap<Element, { widthProperty: string; heightProperty: string; }> = new WeakMap();

    get displayOffset(): { x: number; y: number; z: number; } {
        return {
            x: this.worldMap.width >> 1,
            y: this.worldMap.height >> 1,
            z: this.centerZ - this.focusLayer,
        }
    }

    constructor(worldMap: WorldMap, viewportContainer: Element | string, options: ViewportOptions, expandLayers = 4) {
        this.worldMap = worldMap;
        this.container = htmlElement(viewportContainer);
        this.layers = options.layers ?? 8;
        this.focusLayer = options.focusLayer ?? (this.layers >> 1);
        this.displays = [];
        const {width, height} = options;
        this.width = width;
        this.height = height;

        for (let i = 0; i < this.layers; i++) {
            const expandViewport = expandLayers * Math.abs(this.focusLayer - i);
            this.displays[i] = new Display({...options, width: width + expandViewport, height: height + expandViewport});
            const layerContainer = this.displays[i].getContainer();
            this.container.appendChild(layerContainer);
            layerContainer.classList.add("viewport-layer");
            layerContainer.dataset.index = String(i);
            layerContainer.style.setProperty("--layer-index", String(i));
        }

        this.focusDisplay = this.displays[this.focusLayer];

        this.container.style.setProperty("--layer-count", String(this.layers));
        this.container.style.setProperty("--focus-cols", String(width));
        this.container.style.setProperty("--focus-rows", String(height));
        this.container.style.setProperty("--center-col", String(width >> 1));
        this.container.style.setProperty("--center-row", String(height >> 1));
        this.container.style.setProperty("--viewport-px-width", `${width * options.tileWidth}`);
        this.container.style.setProperty("--viewport-px-height", `${height * options.tileHeight}`);

        this.centerX = this.worldMap.width >> 1;
        this.centerY = this.worldMap.height >> 1;
        this.centerZ = this.worldMap.depth >> 1;

        this.resizeObserver = new ResizeObserver(this.resizeCallback.bind(this));
    }

    createDepthView(depthContainer: Element | string, options: Omit<Partial<TileOptions>, 'width' | 'height'> = {}) {
        const displayOptions = this.focusDisplay.getOptions();
        this.depthContainer = htmlElement(depthContainer);
        const gaugeRows = this.worldMap.depth + 2;
        this.depthDisplay = new Display({...displayOptions, ...options, width: 1, height: gaugeRows});
        this.depthContainer.appendChild(this.depthDisplay.getContainer());
        this.depthContainer.style.setProperty("--gauge-rows", String(gaugeRows));
        this.depthContainer.style.setProperty("--gauge-px-height", String(gaugeRows * displayOptions.tileHeight));
        this.trackSize(this.depthContainer, null, "--gauge-area-height");
    }

    getDisplayForLayer(z = this.centerZ) {
        const layerIndex = z - this.displayOffset.z;
        return this.displays[layerIndex];
    }

    resizeCallback(entries: ResizeObserverEntry[], observer: ResizeObserver) {
        for (const entry of entries) {
            const {target, contentBoxSize} = entry;
            const observation = this.observingElements.get(target);
            if (!observation || !(target instanceof HTMLElement)) continue;
            const {widthProperty, heightProperty} = observation;
            target.style.setProperty(widthProperty, contentBoxSize[0].inlineSize.toString());
            target.style.setProperty(heightProperty, contentBoxSize[0].blockSize.toString());
        }
    }

    trackSize(element: Element, widthProperty = "--container-px-width", heightProperty = "--container-px-height") {
        if (this.observingElements.has(element)) return;
        this.observingElements.set(element, {widthProperty, heightProperty});
        this.resizeObserver.observe(element, {box: "content-box"});
    }

    moveViewport(deltaX = 0, deltaY = 0, deltaZ = 0, forceRedraw?: boolean) {
        this.centerX += deltaX;
        this.centerY += deltaY;
        this.centerZ += deltaZ;
        if (forceRedraw === true || (forceRedraw !== false && (deltaX || deltaY || deltaZ))) {
            this.redraw();
            return true;
        }
        return false;
    }

    centerOn(newX = 0, newY = 0, newZ = 0, forceRedraw?: boolean) {
        return this.moveViewport(newX - this.centerX, newY - this.centerY, newZ - this.centerZ, forceRedraw);
    }

    redraw() {
        this.container.style.setProperty("--focus-x", String(this.centerX));
        this.container.style.setProperty("--focus-y", String(this.centerY));
        this.container.style.setProperty("--focus-z", String(this.centerZ));
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
        if (this.depthDisplay) {
            this.worldMap.drawDepthColumn(this.depthDisplay, this.centerX, this.centerY);
        }
    }
}