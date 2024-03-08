import { Display, RNG } from "rot-js";
import { Actor, Creature } from "./actors.js";
import { cloneTemplate, dialogElement, getElement, htmlElement, mapEntries, templateElement } from "./helpers.js";
import { Item } from "./props.js";
import { Stat, StatUI, allStats, isStatName } from "./stats.js";
import { Tileset } from "./tileset.js";
import { Astar3D } from "./rot3d.js";
import { MessageLogElement } from "./uicomponents.js";

console.debug("Starting player.js");

export class Player extends Creature {
    /** @type {Record<StatName, StatUI>} */
    statUIs = {
        head: null,
        dorsal: null,
        belly: null,
        fins: null,
        tail: null,
    };

    /** @type {Record<StatName, Stat>} */
    stats;

    get liveStats() {
        return Object.values(this.stats).filter(stat => stat.current > 0);
    }

    inventoryUI = new InventoryUI(this, "inventory");
    /** @type {MessageLogElement} */
    messageLog;

    /** @type {{dx: number, dy: number, dz: number}[]} */
    moveQueue = [];
    /** @type {(v: any) => void} */
    #resolveAction;

    /** @type {Astar3D} */
    path;

    /** @overload @param {Overrides<Player>} options */
    /** @param {Overrides<Player>} options */
    constructor(options, {stats, ...rest} = options) {
        super("player", rest);
        this.stats = mapEntries(allStats, (_def, name) => new Stat(name, stats?.[name] ?? {current: this.durability, max: this.durability}));
    }

    /** @param {NodeListOf<Element>} elements  */
    bindStatUIs(elements) {
        for (const bpContainer of elements) {
            const bodypart = htmlElement(bpContainer).dataset.bodypart;
            if (!isStatName(bodypart)) {
                throw new Error(`Bad data-bodypart: ${bodypart}`);
            }
            this.statUIs[bodypart] = new StatUI(this.stats[bodypart], bpContainer);
        }
    }

    /** @param {MessageLogElement} messageLog  */
    bindMessageLog(messageLog) {
        this.messageLog = messageLog;
    }

    /** @param {number} amount @param {Actor} source  */
    takeDamage(amount, source) {
        const stat = RNG.getItem(this.liveStats);
        stat.current -= amount;
        if (stat.current <= 0) {
            stat.current === 0;
            this.losePart(stat, source);
        }
        this.statUIs[stat.name].update();
        this.messageLog.addMessage(`The ${source.label} attacks you ${stat.current > 0 ? `and your ${stat.name} takes ${amount} damage.` : `for ${amount} damage. Your ${stat.name} breaks!`}`);
    }

    attack(target) {
        const damage = super.attack(target);
        this.messageLog.addMessage(`The ${target.label} takes ${damage} damage${target.durability <= 0 ? " and dies" : ""}.`)
        return damage;
    }

    /** @param {Stat} stat @param {Actor} source  */
    losePart(stat, source) {
        if (!this.liveStats.length) {
            this.die(source);
        }
    }

    addedToWorldMap(worldMap) {
        super.addedToWorldMap(worldMap);
        this.path = new Astar3D(this.x, this.y, this.z, worldMap.isPassable);
    }

    queueMove(dx = 0, dy = 0, dz = 0) {
        if (this.moveQueue.length < 5) {
            this.moveQueue.push({dx, dy, dz});
        }
        if (this.#resolveAction) {
            this.#resolveAction(true);
            this.#resolveAction = null;
        }
    }

    move(dx = 0, dy = 0, dz = 0) {
        if (!super.move(dx, dy, dz)) {
            return false;
        }
        const {x, y, z} = this;
        this.path.setTarget(x, y, z);
        this.worldMap.mainViewport.centerOn(x, y, z, true);
        return true;
    }

    async act(time = 0) {
        while (!this.moveQueue.length) {
            // redraw whenever we go into a wait
            this.worldMap.mainViewport.redraw();
            console.log("awaiting");
            await new Promise(r => this.#resolveAction = r);
            console.log("awaited");
        }
        const {dx, dy, dz} = this.moveQueue.shift();
        this.move(dx, dy, dz);
        return true;
    }
}

export class InventoryUI {
    owner;
    /** @type {HTMLDialogElement} */
    dialog;
    itemLabel;
    itemsList;
    actionButtons;
    itemTemplate;

    get open() {
        return this.dialog.open;
    }
    set open(v) {
        this.dialog.open = v;
    }

    /** @param {Creature} owner @param {string|HTMLDialogElement} dialog */
    constructor(owner, dialog, itemTemplate) {
        this.owner = owner;
        this.dialog = dialogElement(dialog);
        this.itemsList = htmlElement(this.dialog.querySelector(".items-list"));
        this.itemLabel = htmlElement(this.dialog.querySelector(".item-label"));
        this.actionButtons = Array.from(this.dialog.querySelectorAll("button.action-button")).map(e => getElement(e, HTMLButtonElement));
        this.itemTemplate = templateElement(itemTemplate ?? this.dialog.querySelector(".item-template") ?? "inventoryItemTemplate")
        this.keyEventListener = this.keyEventListener.bind(this);
        this.dialog.addEventListener("keydown", this.keyEventListener);
        this.dialog.addEventListener("keypress", this.keyEventListener);
        this.dialog.addEventListener("keyup", this.keyEventListener);
    }

    /** @param {KeyboardEvent} event  */
    keyEventListener(event) {
        event.stopPropagation();
    }

    updateItems() {
        /** @type {Map<Item, Element>} */
        const itemMap = new Map();
        for (const element of this.itemsList.children) {
            if ("inventoryItem" in element && element.inventoryItem instanceof Item) {
                itemMap.set(element.inventoryItem, element);
            }
        }
        this.itemsList.replaceChildren(...this.owner.inventory.map((item, index) => {
            const element = itemMap.get(item) ?? this.createItemElement(item);
            const button = element.querySelector("button");
            if (button) {
                button.autofocus = index === 0;
            }
            return element;
        }));
    }

    /** @param {Item} item  */
    createItemElement(item) {
        const element = cloneTemplate(this.itemTemplate, true).firstElementChild;
        element["inventoryItem"] = item;
        const button = element.querySelector("button");
        button.onfocus = () => {
            this.itemLabel.textContent = item.label;
        }
        const displayContainer = element.querySelector(".display-container");
        if (displayContainer) {
            element["rotDisplay"] = null;
            const {char} = Tileset.light.layerFrames[item.spriteTile][item.spriteFrame];
            Tileset.light.getDisplayOptions().then(opts => {
                const display = new Display({...opts, width: 1, height: 1});
                displayContainer.append(display.getContainer());
                display.draw(0, 0, char, null, null);
                element["rotDisplay"] = display;
            });
        }
        return element;
    }

    /** @param {boolean} [force] */
    toggleInventory(force) {
        if (this.dialog.open === force) return;

        if (this.dialog.open) {
            this.dialog.close();
        } else {
            this.updateItems();
            this.dialog.showModal();
        }
    }
}

Object.assign(self, {Player});