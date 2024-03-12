import { cloneTemplate, getElement, htmlElement, meterElement, outputElement } from "./helpers.js";
import { equipment } from "./items.js";
import { Item } from "./props.js";

/** @satisfies {Record<string, StatDef>} */
export const allStats = {
    "head": {
        label: "Head",
        defaultMax: 5,
    },
    "dorsal": {
        label: "Dorsal",
        defaultMax: 5,
    },
    "belly": {
        label: "Belly",
        defaultMax: 5,
    },
    "fins": {
        label: "Fins",
        defaultMax: 5,
    },
    "tail": {
        label: "Tail",
        defaultMax: 5,
    },
}

/**
 * @typedef StatDef
 * @prop {string} label The string displayed in the UI
 * @prop {number} defaultMax The default maximum for this stat
 */
/** @typedef {keyof typeof allStats} StatName */

/** @param {string} name @returns {name is StatName} */
export function isStatName(name) {
    return Object.hasOwn(allStats, name);
}

export class Stat {
    /** @type {StatName} */
    name;

    /** @type {"s" | ""} */
    s;

    /** @type {"its" | "their"} */
    its;

    #current = 10;
    #max = 10;

    get current() {
        return this.equippedItem?.durability ?? this.#current;
    }
    set current(v) {
        if (this.equippedItem) this.equippedItem.durability = v;
        else this.#current = v;
    }
    get max() {
        return this.equippedItem?.durability ?? this.#max;
    }
    set max(v) {
        if (this.equippedItem) this.equippedItem.maxDurability = v;
        else this.#max = v;
    }

    /** @type {Item} */
    equippedItem;

    /** @type {import("./items.js").EquipmentDefinition} */
    get equipDef() {
        return equipment[this.equippedItem?.itemName]?.[this.name];
    }

    /** @overload @param {StatName} name @param {Overrides<Stat>} [options] */
    /** @param {StatName} nameArgument @param {Overrides<Stat>} [options] */
    constructor(nameArgument, options = {}, {name = nameArgument, max = allStats[name].defaultMax, current = max} = options) {
        this.name = name;
        this.current = current;
        this.max = max;
        this.s = name === "fins" ? "" : "s";
        this.its = name === "fins" ? "their" : "its";
    }

    /** @param {Item} item  */
    equipItem(item) {
        if (this.equippedItem) {
            item.stackSize += this.equippedItem.durability;
            this.equippedItem.releaseFromOwner();
        }
        item.releaseFromOwner();
        item.durability = item.maxDurability = item.stackSize;
        this.equippedItem = item;
    }
}

export class StatUI {
    stat;

    /** @type {HTMLElement} */
    container;
    title;
    meter;
    curOutput;
    maxOutput;

    get label() {
        return allStats[this.stat.name].label;
    }

    /** @param {StatLike} stat @param {string|Element} container  */
    constructor(stat, container, template = "bodypartTemplate") {
        this.stat = stat;
        this.container = htmlElement(container);

        if (!this.container.querySelector("dt")) {
            this.container.appendChild(cloneTemplate(template));
        }
        this.title = this.container.querySelector("dt");
        this.meter = meterElement(this.container.querySelector(".hpmeter"));
        this.curOutput = outputElement(this.container.querySelector(".curhp"));
        this.maxOutput = outputElement(this.container.querySelector(".maxhp"));
        this.update();
    }

    update() {
        const {current, max, equipDef} = this.stat;
        this.title.textContent = equipDef?.label ?? this.label;
        this.meter.max = max;
        this.meter.optimum = max;
        this.meter.low = max / 4 + 0.01;
        this.meter.high = max * 3 / 4 - 0.01;
        this.meter.value = current;
        this.curOutput.value = String(current);
        this.maxOutput.value = String(max);
        this.container.classList.toggle("broken", current <= 0);
        this.container.classList.toggle("full", current === max);
    }
}

/** @typedef {{durability: number, maxDurability: number}} DurableObject */

export class SoulUI extends StatUI {
    get label() {
        return "Soul";
    }

    /** @param {DurableObject} prop @param {string|Element} container  */
    constructor(prop, container, template = "bodypartTemplate") {
        super({
            name: null,
            s: null,
            equipDef: null,
            get current() { return prop.durability; },
            get max() { return prop.maxDurability; },
        }, container, template);
   }
}