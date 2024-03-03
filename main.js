import { Display } from "rot-js";
import { WorldMap } from "./worldmap.js";
import { Cellular3D } from "./cellular3d.js";
import { Viewport } from "./viewport.js";
import { Tileset } from "./tileset.js";
import { Player } from "./player.js";

console.log("Starting main.js");

export const tileset = Tileset.tiles1 = new Tileset("tiles-1");

export const worldMap = new WorldMap();
export const generator = new Cellular3D(worldMap.width, worldMap.height, worldMap.depth);

export const player = new Player(worldMap.width >> 1, worldMap.height >> 1, worldMap.depth >> 1);
worldMap.addSprite(player);

function clearAroundPlayer() {
    // clear a spot around the player
    for (const [x, y, z] of 
    [
        [0, 0, 0], 
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
    ]) {
        generator.set3D(player.x + x, player.y + y, player.z + z, 0);
    }
}
generator.generateMap(worldMap.makeSetBaseCallback(), undefined, undefined, clearAroundPlayer);

console.log("Generated world map:", worldMap);

Object.assign(self, {tileset, worldMap, generator});

/** @type {ConstructorParameters<typeof Viewport>[2]} */
let o = {
    ...await tileset.getDisplayOptions(),
	width: 30,
	height: 30,
    layers: 7,
    fontSize: 16,
    forceSquareRatio: true,
};
const gameDisplay = document.getElementById("gameDisplay");
export const viewport = new Viewport(worldMap, gameDisplay, o);

viewport.redraw();

Object.assign(window, {o,viewport});

const Mousetrap = self.Mousetrap;

Mousetrap.bind(["up", "w", "k"], () => viewport.moveViewport(0, -1, 0));
Mousetrap.bind(["down", "s", "j"], () => viewport.moveViewport(0, 1, 0));
Mousetrap.bind(["left", "a", "h"], () => viewport.moveViewport(-1, 0, 0));
Mousetrap.bind(["right", "d", "l"], () => viewport.moveViewport(1, 0, 0));
Mousetrap.bind(["<", "q", "y"], () => viewport.moveViewport(0, 0, 1));
Mousetrap.bind([">", "z", "e", "n"], () => viewport.moveViewport(0, 0, -1));