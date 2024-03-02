import {Display, Map} from "rot-js";

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
    container.dataset.index = i;
    container.style.setProperty("--layer-index", String(i));
}
document.body.style.setProperty("--layer-count", String(layerCount));

let layerHeight = o.height + 1;

let mapHeight = layerHeight * layerCount;

let cmap = new Map.Cellular(o.width, mapHeight, {topology: 8});
let c10map = new Map.Cellular(o.width, mapHeight, {topology: 8});
c10map._dirs = [...c10map._dirs, [0, layerHeight], [0, -layerHeight], [0, layerHeight], [0, -layerHeight]];
c10map.setOptions({
    born: [7, 8, 9, 10, 11, 12],
    survive: [6, 7, 8, 9, 10, 11, 12],
});

export function generateMap(cellmap, iters=5) {
    cellmap.randomize(0.5);
    for (let i = iters; i >= 0; i--) {
        for (let y = 0; y < mapHeight; y += layerHeight) {
            for (let x = 0; x < o.width; x++) {
                cellmap.set(x, y, 0);
            }
        }
        cellmap.create(i ? (x,y,w) => (y % layerHeight === 0 ? null : displays[Math.floor(y / layerHeight)].DEBUG(x,y % layerHeight - 1,w)) : null);
    }
}

export function generateC8Map(iters) {
    generateMap(cmap, iters);
}

export function generateC10Map(iters) {
    generateMap(c10map, iters);
}

generateC8Map();

setTimeout(generateC10Map, 1000);

displays[displays.length >> 1].draw(o.width >> 1, o.height >> 1, "@", "goldenrod");
Object.assign(window, {o,cmap,c10map,displays,layerCount,mapHeight, generateMap, generateC8Map, generateC10Map});