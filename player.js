import { Display } from "rot-js";
import { Creature } from "./actors.js";
import { cloneTemplate, dialogElement, getElement, htmlElement, mapEntries, templateElement } from "./helpers.js";
import { Item } from "./props.js";
import { Stat, allStats } from "./stats.js";
import { Tileset } from "./tileset.js";

export class Player extends Creature {
    inventoryUI = new InventoryUI(this, "inventory");

    /** @param {Overrides<Player>} options */
    constructor(options) {
        super("PCfish", options);
    }

    move(dx = 0, dy = 0, dz = 0) {
        if (!super.move(dx, dy, dz)) {
            return false;
        }
        const {x, y, z} = this;
        this.worldMap.mainViewport.centerOn(x, y, z, true);
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
            this.itemLabel.textContent = item.inventoryLabel;
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