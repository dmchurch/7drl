import { WorldMap } from "./worldmap.js";
import { animationFrame, getElement, htmlElement } from "./helpers.js";
import { StatUI, isStatName } from "./stats.js";
import { Creature } from "./actors.js";
import { KeyboardCueElement, MessageLogElement } from "./uicomponents.js";
import { DOMListAction, MoveAction } from "./input.js";
import { regenerate } from "./debug.js";
import { worldMap, input, player, viewport } from "./globals.js";
import { scheduler } from "./engine.js";

console.log("Starting main.js");

worldMap.addSprite(player, {
    x: worldMap.width >> 1,
    y: worldMap.height >> 1,
    z: worldMap.depth >> 1,
});

viewport.trackSize(document.getElementById("viewportRegion"));

player.bindStatUIs(document.querySelectorAll(".bodypart"));

const messageLog = getElement(document.querySelector("#messagesPanel message-log"), MessageLogElement);
Object.assign(self, {messageLog});

player.bindMessageLog(messageLog);

messageLog.addMessage("The abyss beckons... welcome to Deiphage.");

export let crab, fish;

regenerate().then(() => {
    crab = player.spawnNearby(new Creature("crab"), {minRadius: 3});
    fish = player.spawnNearby(new Creature("fish"));

    Object.assign(self, {crab, fish});
});

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

input.bind(() => player.toggleInventory(), "Tab", "KeyI");

input.bind(new DOMListAction("Look Across", document.documentElement.classList, "look-across"), input.VKeyAlt);
input.bind(new DOMListAction("Look Up", document.documentElement.classList, "look-up"), [input.VKeyAlt, "KeyQ"], [input.VKeyAlt, "NumpadSubtract"])
input.bind(new DOMListAction("Look Down", document.documentElement.classList, "look-down"), [input.VKeyAlt, "KeyZ"], [input.VKeyAlt, "NumpadAdd"])

scheduler.mainLoop();