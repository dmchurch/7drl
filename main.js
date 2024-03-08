import { WorldMap } from "./worldmap.js";
import { Viewport } from "./viewport.js";
import { Tileset } from "./tileset.js";
import { Player } from "./player.js";
import { getElement, htmlElement } from "./helpers.js";
import { StatUI, isStatName } from "./stats.js";
import { Item } from "./props.js";
import { Creature } from "./actors.js";
import { KeyboardCueElement } from "./uicomponents.js";
import { DOMListAction, InputManager, MoveAction } from "./input.js";
import { regenerate, worldMap } from "./debug.js";
import { mainLoop } from "./engine.js";

console.log("Starting main.js");
KeyboardCueElement.defineElement();
console.log("Defined custom elements");

export const tileset = Tileset.light;

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

/** @type {ConstructorParameters<typeof Viewport>[2]} */
let o = {
    ...await tileset.getDisplayOptions(),
	width: 31,
	height: 31,
    layers: 7,
    focusLayer: 3,
};
export const viewport = worldMap.mainViewport = new Viewport(worldMap, "gameDisplay", o);

Object.assign(self, {o, tileset, player, viewport});

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

const input = InputManager.instance;
input.attach();
input.keyIndicator = getElement("indicator", KeyboardCueElement);

input.moveHandler = player.queueMove.bind(player);

input.ignoreKeys("F5");

MoveAction.UP.addKeyBindings("KeyW", "KeyK", "ArrowUp", "Numpad8");
MoveAction.DOWN.addKeyBindings("KeyS", "KeyJ", "ArrowDown", "Numpad2");
MoveAction.LEFT.addKeyBindings("KeyA", "KeyH", "ArrowLeft", "Numpad4");
MoveAction.RIGHT.addKeyBindings("KeyD", "KeyL", "ArrowRight", "Numpad6");
MoveAction.UPLEFT.addKeyBindings("KeyY", "Numpad7", ["KeyW", "KeyA"], ["ArrowLeft", "ArrowUp"]);
MoveAction.UPRIGHT.addKeyBindings("KeyU", "Numpad9", ["KeyW", "KeyD"], ["ArrowUp", "ArrowRight"]);
MoveAction.DOWNLEFT.addKeyBindings("KeyB", "Numpad1", ["KeyS", "KeyA"], ["ArrowDown", "ArrowLeft"]);
MoveAction.DOWNRIGHT.addKeyBindings("KeyN", "Numpad3", ["KeyS", "KeyD"], ["ArrowDown", "ArrowRight"]);
MoveAction.SURFACE.addKeyBindings("KeyQ", "NumpadSubtract").addCharBinding("<");
MoveAction.DIVE.addKeyBindings("KeyZ", "NumpadAdd").addCharBinding(">");
MoveAction.WAIT.addKeyBindings("Space", "Numpad5");

MoveAction.DiagonalOnly.addKeyBindings(input.VKeyAlt);

input.bind(() => player.inventoryUI.toggleInventory(), "Tab", "KeyI");

input.bind(new DOMListAction("Look Across", document.documentElement.classList, "look-across"), input.VKeyAlt);
input.bind(new DOMListAction("Look Up", document.documentElement.classList, "look-up"), [input.VKeyAlt, "KeyQ"], [input.VKeyAlt, "NumpadSubtract"])
input.bind(new DOMListAction("Look Down", document.documentElement.classList, "look-down"), [input.VKeyAlt, "KeyZ"], [input.VKeyAlt, "NumpadAdd"])

mainLoop();