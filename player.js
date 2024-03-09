import { Display, RNG } from "rot-js";
import { Actor, Creature } from "./actors.js";
import { cloneTemplate, dialogElement, getElement, htmlElement, mapEntries, templateElement } from "./helpers.js";
import { Item } from "./props.js";
import { SoulUI, Stat, StatUI, allStats, isStatName } from "./stats.js";
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
    soulUI = null;

    /** @type {Record<StatName, Stat>} */
    stats;

    get liveStats() {
        return Object.values(this.stats).filter(stat => stat.current > 0);
    }

    inventoryUI = new InventoryUI(this, "inventory");
    /** @type {MessageLogElement} */
    messageLog;

    get inventoryOpen() {
        return this.inventoryUI.open;
    }

    /** @type {(() => void)[]} */
    actionQueue = [];
    /** @type {(v: any) => void} */
    #resolveAction;

    /** @type {Astar3D} */
    path;

    /** @overload @param {Overrides<Player>} options */
    /** @param {Overrides<Player>} options */
    constructor(options, {stats, ...rest} = options) {
        super("player", {displayLayer: Infinity, ...rest});
        this.stats = mapEntries(allStats, (_def, name) => new Stat(name, stats?.[name] ?? {current: this.durability, max: this.durability}));
    }

    /** @param {NodeListOf<Element>} elements  */
    bindStatUIs(elements) {
        for (const bpContainer of elements) {
            const bodypart = htmlElement(bpContainer).dataset.bodypart;
            if (isStatName(bodypart)) {
                this.statUIs[bodypart] = new StatUI(this.stats[bodypart], bpContainer);
            } else if (bodypart === "soul") {
                this.soulUI = new SoulUI(this, bpContainer);
            } else {
                throw new Error(`Bad data-bodypart: ${bodypart}`);
            }
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
        this.messageLog.addMessage(`The ${source.label} attacks you ${stat.current > 0 ? `and your ${stat.name} ${stat.name === "fins" ? "take" : "takes"} ${amount} damage.` : `for ${amount} damage. Your ${stat.name} breaks!`}`);
    }

    attack(target) {
        const damage = super.attack(target);
        this.messageLog.addMessage(`The ${target.label} takes ${damage} damage${target.durability <= 0 ? " and dies" : ""}.`)
        return damage;
    }

    /** @param {Item} item */
    dropItem(item, count = 1) {
        const result = super.dropItem(item, count);
        if (Array.isArray(result)) {
            const [stack, floor] = result;
            this.messageLog.addMessage(`You drop ${stack.getInventoryLabel(false)} onto the pile, and now there are ${floor.stackSize}.`);
        } else if (result) {
            this.messageLog.addMessage(`You drop ${result.getInventoryLabel(false)}.`);
        } else {
            this.messageLog.addMessage(`You try to drop ${item.getDefiniteLabel()} but it seems to be stuck to your fins.`);
        }
        return result;
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

    queueEat(item, count=1) {
        this.queueAction(() => this.eatItem(item, count));
    }

    queueDrop(item, count=1) {
        this.queueAction(() => this.dropItem(item, count));
    }

    queueMove(dx = 0, dy = 0, dz = 0) {
        if (this.inventoryOpen) {
            this.inventoryUI.moveSelection(dx, dy);
            return;
        }
        const action = () => this.move(dx, dy, dz);
        this.queueAction(action);
    }

    /** @param {() => void} action  */
    queueAction(action) {
        if (this.actionQueue.length < 5) {
            this.actionQueue.push(action);
        }
        if (this.#resolveAction) {
            this.#resolveAction(true);
            this.#resolveAction = null;
        }
    }

    /** @param {boolean} [force] */
    toggleInventory(force) {
        this.inventoryUI.toggleInventory(force);
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
        while (!this.actionQueue.length) {
            // redraw whenever we go into a wait
            this.worldMap.mainViewport.redraw();
            console.log("awaiting");
            await new Promise(r => this.#resolveAction = r);
            console.log("awaited");
        }
        this.actionQueue.shift()();
        return true;
    }
}

export class InventoryUI {
    player;
    /** @type {HTMLDialogElement} */
    dialog;
    itemLabel;
    itemsList;
    /** @type {HTMLButtonElement[]} */
    itemButtons = [];
    actionButtons;
    itemTemplate;

    get open() {
        return this.dialog.open;
    }
    set open(v) {
        this.dialog.open = v;
    }

    /** @type {HTMLButtonElement & {inventoryItem: Item}} */
    #selectedItem;
    get selectedItem() {
        return this.#selectedItem;
    }
    set selectedItem(v) {
        if (v === this.#selectedItem) return;
        this.#selectedItem?.classList.remove("selected");
        this.#selectedItem = v;
        v?.classList.add("selected");
    }

    /** @type {HTMLButtonElement} */
    focusButton;

    /** @param {Player} player @param {string|HTMLDialogElement} dialog */
    constructor(player, dialog, itemTemplate) {
        this.player = player;
        this.dialog = dialogElement(dialog);
        this.itemsList = htmlElement(this.dialog.querySelector(".items-list"));
        this.itemLabel = htmlElement(this.dialog.querySelector(".item-label"));
        this.actionButtons = Array.from(this.dialog.querySelectorAll("button.action-button")).map(e => getElement(e, HTMLButtonElement));
        this.itemTemplate = templateElement(itemTemplate ?? this.dialog.querySelector(".item-template") ?? "inventoryItemTemplate")
        this.keyEventListener = this.keyEventListener.bind(this);
        this.focusListener = this.focusListener.bind(this);
        this.itemClickListener = this.itemClickListener.bind(this);
        this.actionClickListener = this.actionClickListener.bind(this);
        for (const button of this.actionButtons) {
            button.onfocus = this.focusListener;
            button.onclick = this.actionClickListener;
        }
    }

    /** @param {KeyboardEvent} event  */
    keyEventListener(event) {
        event.stopPropagation();
    }

    /** @param {FocusEvent & {target: HTMLButtonElement & {inventoryItem?: Item}}} event  */
    focusListener(event) {
        const {target} = event;
        const item = target.inventoryItem;
        if (item) {
            this.itemLabel.textContent = item?.getInventoryLabel() ?? "Unknown";
            // @ts-ignore
            this.selectedItem = target;
        }
        this.focusButton = target;
    }

    itemClickListener(event) {
        this.actionButtons[0].focus();
    }

    /** @param {FocusEvent} event  */
    actionClickListener(event) {
        const item = this.selectedItem?.inventoryItem;
        if (!item) return;
        const {action} = htmlElement(event.target).dataset;
        if (action === "eat" || action === "drop") {
            this.performAction(action);
        }
    }

    /** @param {"eat"|"drop"} action  */
    performAction(action) {
        const item = this.selectedItem?.inventoryItem;
        if (!this.open || !item) return false;
        
        if (action === "eat") {
            this.player.queueEat(item);
        } else if (action === "drop") {
            this.player.queueDrop(item);
        }
        this.dialog.close(action);
        return true;
    }

    updateItems() {
        /** @type {Map<Item, Element>} */
        const itemMap = new Map();
        for (const element of this.itemsList.children) {
            if ("inventoryItem" in element && element.inventoryItem instanceof Item) {
                itemMap.set(element.inventoryItem, element);
            }
        }
        this.itemsList.replaceChildren(...this.player.validInventory.map((item, index) => {
            const element = itemMap.get(item) ?? this.createItemElement(item);
            const button = element.querySelector("button");
            if (button) {
                button.autofocus = index === 0;
            }
            const stackLabel = button.querySelector("label.stack-size");
            if (stackLabel) {
                stackLabel.textContent = item.stackSize === 1 ? "" : String(item.stackSize);
            }
            return element;
        }));

        this.itemButtons = Array.from(this.dialog.querySelectorAll("button.item-button")).map(e => getElement(e, HTMLButtonElement));
    }

    /** @param {Item} item  */
    createItemElement(item) {
        const element = cloneTemplate(this.itemTemplate, true).firstElementChild;
        element["inventoryItem"] = item;
        const button = element.querySelector("button");
        button["inventoryItem"] = item;
        button.classList.add("item-button");
        button.onfocus = this.focusListener;
        button.onclick = this.itemClickListener;
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

    moveSelection(dx=0, dy=0) {
        if (!dx && !dy) {
            this.focusButton?.click()
            return;
        }
        const itemIndex = this.itemButtons.indexOf(this.focusButton);
        const actionIndex = this.actionButtons.indexOf(this.focusButton);
        if (dx !== 0) {
            if (itemIndex >= 0) {
                this.itemButtons.at((itemIndex + dx) % this.itemButtons.length).focus();
            } else if (actionIndex >= 0) {
                this.actionButtons.at((actionIndex + dx) % this.actionButtons.length).focus();
            }
        } else if (dy !== 0) {
            if (itemIndex >= 0) {
                this.actionButtons[0].focus();
            } else if (actionIndex >= 0) {
                (this.selectedItem ?? this.itemButtons[0])?.focus();
            }
        }
    }
}

Object.assign(self, {Player});