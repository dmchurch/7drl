import { Display } from "rot-js";
import { WorldMap } from "./worldmap.js";
import { Cellular3D } from "./cellular3d.js";
import { Viewport } from "./viewport.js";

console.log("Starting main.js");

export const worldMap = new WorldMap();
const generator = new Cellular3D(worldMap.width, worldMap.height, worldMap.depth);

generator.generateMap(worldMap.generateCallback());

console.log("Generated world map:", worldMap);

Object.assign(self, {worldMap, generator});

/** @type {ConstructorParameters<typeof Viewport>[2]} */
let o = {
	width: 30,
	height: 30,
    layers: 7,
    fontSize: 16,
    forceSquareRatio: true,
};
const gameDisplay = document.getElementById("gameDisplay");
export const viewport = new Viewport(worldMap, gameDisplay, o);

viewport.redraw();

viewport.displays[viewport.displays.length >> 1].draw(o.width >> 1, o.height >> 1, "@", "goldenrod", null);
Object.assign(window, {o,viewport});