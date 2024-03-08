import { RNG } from "rot-js";
import { MapSprite } from "./worldmap.js";
import { Tileset } from "./tileset.js";
import { after, htmlElement, typedEntries, valueElement } from "./helpers.js";
import { tiles, wallRules } from "./tiles.js";
import { WallRule } from "./walls.js";
import { viewport } from "./globals.js";
import { player } from "./globals.js";
import { Cellular3D } from "./cellular3d.js";
import { worldMap } from "./globals.js";

export const generator = new Cellular3D(worldMap.width, worldMap.height, worldMap.depth);

let seed;
let lastSeed = RNG.getSeed();
let iterations = 5;
let fillRatio = 0.5;
const { born, survive } = generator.options;
const setBaseCallback = worldMap.makeSetBaseCallback();
const seedInput = valueElement("seed");
const lastSeedInput = valueElement("lastSeed");
const iterationsInput = valueElement("iterations");
const fillRatioInput = valueElement("fillRatio");
const bornInput = valueElement("born");
const surviveInput = valueElement("survive");

export function clearAroundPlayer() {
    // clear a spot around the player
    for (const [dx, dy, dz] of [
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
/**
 * @param {number} [iters]
 * @param {number} [randomizeProb]
 */

export async function regenerate(iters = iterations, randomizeProb = fillRatio, iterationDelay = 20) {
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

export function generateTestPattern() {
    let { x, y, z } = player;
    for (const [dy, patternLine] of wallRules.standard.framesTemplate.entries()) {
        for (const [dx, cell] of patternLine.entries()) {
            worldMap.setBase(x + dx + 1, y + dy + 1, z, cell >= WallRule.SAME ? 1 : 0);
        }
    }

    for (const [dx, [tileName]] of typedEntries(tiles).filter(([, { frameType }]) => frameType !== "walls").entries()) {
        for (const frameIndex of Tileset.light.layerFrames[tileName]?.keys() ?? []) {
            const nx = x - dx - 1;
            const ny = y + frameIndex + 1;
            worldMap.setBase(nx, ny, z, 0);
            worldMap.addSprite(new MapSprite(tileName, { x: nx, y: ny, z, spriteFrame: frameIndex }));
        }
    }
    viewport.redraw();
}
seedInput.oninput = () => {
    seed = seedInput.value.trim().length ? Number(seedInput.value.trim()) : undefined;
};
iterationsInput.oninput = () => {
    iterations = Number(iterationsInput.value);
};
fillRatioInput.oninput = () => {
    fillRatio = Number(fillRatioInput.value);
};
bornInput.oninput = () => {

    born.splice(
        0,
        Infinity,
        ...bornInput.value
            .split(",")
            .map(x => parseInt(x.trim()))
            .filter(x => Number.isInteger(x)));
};
surviveInput.oninput = () => {
    survive.splice(
        0,
        Infinity,
        ...surviveInput.value
            .split(",")
            .map(x => parseInt(x.trim()))
            .filter(x => Number.isInteger(x)));
};
/** @type {TileName[]} */

export const terrains = typedEntries(tiles).filter(([k, v]) => v.frameType === "walls").map(([k, v]) => k);

// Mousetrap is only used for debug bindings, for now
const Mousetrap = new self.Mousetrap(document.documentElement);
Mousetrap.bind("alt+`", () => (htmlElement("debugControls").classList.toggle("hidden"), false));
Mousetrap.bind("shift+alt+r", () => (regenerate(), false));
Mousetrap.bind("shift+alt+i", () => (iterate(), false));
Mousetrap.bind("shift+alt+o", () => (regenerate(1), false));
Mousetrap.bind("shift+alt+d", () => { RNG.setSeed(lastSeed = 0); seed = undefined; return false; });
Mousetrap.bind("shift+alt+p", () => {
    updateParamFields();
    document.getElementById("params").classList.toggle("hidden");
    return false;
});
Mousetrap.bind("shift+alt+t", () => {
    worldMap.baseTiles[1] = terrains[(terrains.indexOf(worldMap.baseTiles[1]) + 1) % terrains.length];
    viewport.redraw();
    return false;
});
Mousetrap.bind("shift+alt+g", () => (generateTestPattern(), false));


Object.assign(self, {RNG, generator, worldMap, clearAroundPlayer, setBaseCallback, regenerate, iterate, generateTestPattern});
