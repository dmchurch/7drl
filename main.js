import { Display, RNG, KEYS } from "rot-js";
import { MapSprite, WorldMap } from "./worldmap.js";
import { Cellular3D } from "./cellular3d.js";
import { Viewport } from "./viewport.js";
import { Tileset } from "./tileset.js";
import { Player } from "./player.js";
import { after, getElement, htmlElement, typedEntries } from "./helpers.js";
import { tiles, wallRules } from "./tiles.js";
import { WallRule } from "./walls.js";
import { StatUI, allStats, isStatName } from "./stats.js";
import { Item } from "./props.js";
import { Creature } from "./actors.js";
import { KeyboardCueElement } from "./uicomponents.js";
import { InputManager, MoveAction } from "./input.js";

console.log("Starting main.js");
KeyboardCueElement.defineElement();
console.log("Defined custom elements");

export const tileset = Tileset.light;

export const worldMap = new WorldMap();
export const generator = new Cellular3D(worldMap.width, worldMap.height, worldMap.depth);

export const player = new Player({
    x: worldMap.width >> 1,
    y: worldMap.height >> 1,
    z: worldMap.depth >> 1,
    stats: {
        head: {
            current: 4,
        }
    },
    inventory: [
        new Item("geodeSoul"),
    ],
});
Object.assign(self, {tileset, worldMap, player, generator, RNG});

/** @type {ConstructorParameters<typeof Viewport>[2]} */
let o = {
    ...await tileset.getDisplayOptions(),
	width: 31,
	height: 31,
    layers: 7,
    focusLayer: 3,
};
export const viewport = worldMap.mainViewport = new Viewport(worldMap, "gameDisplay", o);

let seed;
let lastSeed = RNG.getSeed();
let iterations = 5;
let fillRatio = 0.5;
const {born, survive} = generator.options;

const setBaseCallback = worldMap.makeSetBaseCallback();
const seedInput = valueElement("seed");
const lastSeedInput = valueElement("lastSeed");
const iterationsInput = valueElement("iterations");
const fillRatioInput = valueElement("fillRatio");
const bornInput = valueElement("born");
const surviveInput = valueElement("survive");

worldMap.addSprite(player);

regenerate().then(() => {
    player.spawnNearby(new Creature("crab"), {minRadius: 3});
    player.spawnNearby(new Creature("fish"));
});

viewport.trackSize(document.getElementById("viewportRegion"));

export const statUIs = {};

for (const bpContainer of document.querySelectorAll(".bodypart")) {
    const bodypart = htmlElement(bpContainer).dataset.bodypart;
    if (!isStatName(bodypart)) {
        throw new Error(`Bad data-bodypart: ${bodypart}`);
    }
    statUIs[bodypart] = new StatUI(player.stats[bodypart], bpContainer);
}


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

export function generateTestPattern() {
    let {x, y, z} = player;
    for (const [dy, patternLine] of wallRules.standard.framesTemplate.entries()) {
        for (const [dx, cell] of patternLine.entries()) {
            worldMap.setBase(x + dx + 1, y + dy + 1, z, cell >= WallRule.SAME ? 1 : 0);
        }
    }
    
    for (const [dx, [tileName]] of typedEntries(tiles).filter(([,{frameType}]) => frameType !== "walls").entries()) {
        for (const frameIndex of Tileset.light.layerFrames[tileName]?.keys() ?? []) {
            const nx = x - dx - 1;
            const ny = y + frameIndex + 1;
            worldMap.setBase(nx, ny, z, 0);
            worldMap.addSprite(new MapSprite(tileName, {x: nx, y: ny, z, spriteFrame: frameIndex}));
        }
    }
    viewport.redraw();
}

Object.assign(self, {o,viewport, clearAroundPlayer, setBaseCallback, regenerate, iterate, generateTestPattern});

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

/** @type {TileName[]} */
export const terrains = typedEntries(tiles).filter(([k,v]) => v.frameType === "walls").map(([k, v]) => k);

const input = InputManager.instance;
input.attach();
input.keyIndicator = getElement("indicator", KeyboardCueElement);

input.moveHandler = player.move.bind(player);

input.ignoreKeys("F5");

MoveAction.UP.addKeyBindings("KeyW", "KeyK", "ArrowUp", "Numpad8");
MoveAction.DOWN.addKeyBindings("KeyS", "KeyJ", "ArrowDown", "Numpad2");
MoveAction.LEFT.addKeyBindings("KeyA", "KeyH", "ArrowLeft", "Numpad4");
MoveAction.RIGHT.addKeyBindings("KeyD", "KeyL", "ArrowRight", "Numpad6");
MoveAction.UPLEFT.addKeyBindings("KeyY", "Numpad7");
MoveAction.UPRIGHT.addKeyBindings("KeyU", "Numpad9");
MoveAction.DOWNLEFT.addKeyBindings("KeyB", "Numpad1");
MoveAction.DOWNRIGHT.addKeyBindings("KeyN", "Numpad3");
MoveAction.SURFACE.addKeyBindings("KeyQ", "NumpadSubtract").addCharBinding("<");
MoveAction.DIVE.addKeyBindings("KeyZ", "NumpadAdd").addCharBinding(">");

MoveAction.DiagonalOnly.addKeyBindings("AltLeft", "AltRight");

input.bind(() => player.inventoryUI.toggleInventory(), "Tab", "KeyI");

// Mousetrap is only used for debug bindings, for now
const Mousetrap = new self.Mousetrap(document.documentElement)
Mousetrap.bind("alt+`", () => (htmlElement("debugControls").classList.toggle("hidden"), false));
Mousetrap.bind("shift+alt+r", () => (regenerate(), false));
Mousetrap.bind("shift+alt+i", () => (iterate(), false));
Mousetrap.bind("shift+alt+o", () => (regenerate(1), false));
Mousetrap.bind("shift+alt+d", () => {RNG.setSeed(lastSeed = 0); seed = undefined; return false});
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

