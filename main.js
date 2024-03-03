import { Display, RNG } from "rot-js";
import { WorldMap } from "./worldmap.js";
import { Cellular3D } from "./cellular3d.js";
import { Viewport } from "./viewport.js";
import { Tileset } from "./tileset.js";
import { Player } from "./player.js";
import { after } from "./helpers.js";

console.log("Starting main.js");

export const tileset = Tileset.tiles1 = new Tileset("tiles-1");

export const worldMap = new WorldMap();
export const generator = new Cellular3D(worldMap.width, worldMap.height, worldMap.depth);

export const player = new Player(worldMap.width >> 1, worldMap.height >> 1, worldMap.depth >> 1);
worldMap.addSprite(player);

export function clearAroundPlayer() {
    // clear a spot around the player
    for (const [dx, dy, dz] of 
    [
        [0, 0, 0], 
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
    ]) {
        const x = player.x + dx;
        const y = player.y + dy;
        const z = player.z + dz;
        generator.set3D(x, y, z, 0);
    }
}
const setBaseCallback = worldMap.makeSetBaseCallback();

Object.assign(self, {tileset, worldMap, generator, RNG});

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

/**
 * @param {number} [iters]
 * @param {number} [randomizeProb]
 */
export async function regenerate(iters, randomizeProb, iterationDelay=20) {
    for (const _ of generator.generateMap(setBaseCallback, iters, randomizeProb, clearAroundPlayer, true)) {
        console.log("Redrawing viewport and delaying", iterationDelay);
        viewport.redraw();
        await after(iterationDelay);
    }

    console.log("Generated world map");
    viewport.redraw();
}

export function iterate() {
    clearAroundPlayer();
    generator.create(setBaseCallback);
    viewport.redraw();
}

Object.assign(window, {o,viewport, clearAroundPlayer, setBaseCallback, regenerate, iterate});

regenerate();

const Mousetrap = self.Mousetrap;

Mousetrap.bind(["up", "w", "k"], () => viewport.moveViewport(0, -1, 0));
Mousetrap.bind(["down", "s", "j"], () => viewport.moveViewport(0, 1, 0));
Mousetrap.bind(["left", "a", "h"], () => viewport.moveViewport(-1, 0, 0));
Mousetrap.bind(["right", "d", "l"], () => viewport.moveViewport(1, 0, 0));
Mousetrap.bind(["<", "q", "y"], () => viewport.moveViewport(0, 0, 1));
Mousetrap.bind([">", "z", "e", "n"], () => viewport.moveViewport(0, 0, -1));
Mousetrap.bind("shift+alt+r", () => {regenerate()});
Mousetrap.bind("shift+alt+i", () => iterate());
Mousetrap.bind("shift+alt+o", () => {regenerate(1)});