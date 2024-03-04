import { Display, RNG } from "rot-js";
import { WorldMap } from "./worldmap.js";
import { Cellular3D } from "./cellular3d.js";
import { Viewport } from "./viewport.js";
import { Tileset } from "./tileset.js";
import { Player } from "./player.js";
import { after } from "./helpers.js";

console.log("Starting main.js");

export const tileset = Tileset.light;

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

let seed;
let lastSeed = RNG.getSeed();
let iterations = 5;
let fillRatio = 0.5;
const {born, survive} = generator.options;

const seedInput = valueElement("seed");
const lastSeedInput = valueElement("lastSeed");
const iterationsInput = valueElement("iterations");
const fillRatioInput = valueElement("fillRatio");
const bornInput = valueElement("born");
const surviveInput = valueElement("survive");

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
export const viewport = worldMap.mainViewport = new Viewport(worldMap, gameDisplay, o);

/**
 * @param {number} [iters]
 * @param {number} [randomizeProb]
 */
export async function regenerate(iters=iterations, randomizeProb=fillRatio, iterationDelay=20) {
    if (typeof seed === "number") {
        RNG.setSeed(seed);
        lastSeed = seed;
    }
    for (const _ of generator.generateMap(setBaseCallback, iters, randomizeProb, clearAroundPlayer, true)) {
        const next = after(iterationDelay);
        console.log("Redrawing viewport and delaying", iterationDelay);
        viewport.redraw();
        await next;
    }
    console.log("Generated world map");
    viewport.redraw();
    updateParamFields();
}

function updateParamFields() {
    seedInput.value = typeof seed === "number" ? String(seed) : "";
    lastSeedInput.value = String(lastSeed);
    iterationsInput.value = String(iterations);
    fillRatioInput.value = String(fillRatio);
    bornInput.value = born.map(String).join(", ");
    surviveInput.value = survive.map(String).join(", ");
}

export function iterate() {
    clearAroundPlayer();
    generator.create(setBaseCallback);
    viewport.redraw();
    updateParamFields();
}

Object.assign(window, {o,viewport, clearAroundPlayer, setBaseCallback, regenerate, iterate});

regenerate();

function valueElement(id) {
    const element = document.getElementById(id);
    if (element instanceof HTMLInputElement || element instanceof HTMLOutputElement) return element;
}

seedInput.oninput = () => {
    seed = seedInput.value.trim().length ? Number(seedInput.value.trim()) : undefined;
}
iterationsInput.oninput = () => {
    iterations = Number(iterationsInput.value);
}
fillRatioInput.oninput = () => {
    fillRatio = Number(fillRatioInput.value);
}
bornInput.oninput = () => {

    born.splice(
        0, 
        Infinity,
        ...bornInput.value
                         .split(",")
                         .map(x => parseInt(x.trim()))
                         .filter(x => Number.isInteger(x)));
}
surviveInput.oninput = () => {
    survive.splice(
        0, 
        Infinity,
        ...surviveInput.value
                         .split(",")
                         .map(x => parseInt(x.trim()))
                         .filter(x => Number.isInteger(x)));
}

const Mousetrap = self.Mousetrap;

Mousetrap.bind(["shift+w", "shift+k", "shift+up"], () => viewport.moveViewport(0, -1, 0));
Mousetrap.bind(["shift+s", "shift+j", "shift+down"], () => viewport.moveViewport(0, 1, 0));
Mousetrap.bind(["shift+a", "shift+h", "shift+left"], () => viewport.moveViewport(-1, 0, 0));
Mousetrap.bind(["shift+d", "shift+l", "shift+right"], () => viewport.moveViewport(1, 0, 0));
Mousetrap.bind(["shift+q", "shift+y"], () => viewport.moveViewport(0, 0, 1));
Mousetrap.bind(["shift+z", "shift+n"], () => viewport.moveViewport(0, 0, -1));

Mousetrap.bind(["w", "k", "up"], () => player.move(0, -1, 0));
Mousetrap.bind(["s", "j", "down"], () => player.move(0, 1, 0));
Mousetrap.bind(["a", "h", "left"], () => player.move(-1, 0, 0));
Mousetrap.bind(["d", "l", "right"], () => player.move(1, 0, 0));
Mousetrap.bind(["q", "y", "<"], () => player.move(0, 0, 1));
Mousetrap.bind(["z", "n", ">"], () => player.move(0, 0, -1));
Mousetrap.bind("shift+alt+r", () => {regenerate()});
Mousetrap.bind("shift+alt+i", () => iterate());
Mousetrap.bind("shift+alt+o", () => {regenerate(1)});
Mousetrap.bind("shift+alt+d", () => {RNG.setSeed(lastSeed = 0); seed = undefined});
Mousetrap.bind("shift+alt+p", () => {
    updateParamFields();
    document.getElementById("params").classList.toggle("hidden");
});