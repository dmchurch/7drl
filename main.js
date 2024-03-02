import { Display } from "rot-js";
import { WorldMap } from "./worldmap.js";
import { Cellular3D } from "./cellular3d.js";

console.log("Starting main.js");

export const worldMap = new WorldMap();
const generator = new Cellular3D(worldMap.width, worldMap.height, worldMap.depth);

generator.generateMap(worldMap.generateCallback());

console.log("Generated world map:", worldMap);

Object.assign(self, {worldMap, generator});

let o = {
	width: 50,
	height: 30
};
let layerCount = 8;
let displays = [];
for (let i = 0; i < layerCount; i++) {
    displays[i] = new Display(o);
    const container = displays[i].getContainer();
    document.body.appendChild(container);
    container.dataset.index = String(i);
    container.style.setProperty("--layer-index", String(i));
}
document.body.style.setProperty("--layer-count", String(layerCount));

worldMap.drawLayers(displays, (worldMap.width - o.width) >> 1, (worldMap.height - o.height) >> 1, (worldMap.depth - layerCount) >> 1);

displays[displays.length >> 1].draw(o.width >> 1, o.height >> 1, "@", "goldenrod", null);
Object.assign(window, {o,displays,layerCount});