import { cloneTemplate, getElement, htmlElement, meterElement, outputElement } from "./helpers.js";

/** @satisfies {Record<string, StatDef>} */
export const allStats = {
    "head": {
        label: "Head",
        defaultMax: 6,
    },
    "dorsal": {
        label: "Dorsal",
        defaultMax: 5,
    },
    "belly": {
        label: "Belly",
        defaultMax: 4,
    },
    "fins": {
        label: "Fins",
        defaultMax: 4,
    },
    "tail": {
        label: "Tail",
        defaultMax: 7,
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

    current = 10;
    max = 10;

    /** @overload @param {StatName} name @param {Overrides<Stat>} [options] */
    /** @param {StatName} nameArgument @param {Overrides<Stat>} [options] */
    constructor(nameArgument, options = {}, {name = nameArgument, max = allStats[name].defaultMax, current = max} = options) {
        this.name = name;
        this.current = current;
        this.max = max;
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

    /** @param {Stat} stat @param {string|Element} container  */
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
        const {name, current, max} = this.stat;
        this.title.textContent = allStats[name].label;
        this.meter.max = max;
        this.meter.optimum = max;
        this.meter.low = max / 4 + 0.01;
        this.meter.high = max * 3 / 4 - 0.01;
        this.meter.value = current;
        this.curOutput.value = String(current);
        this.maxOutput.value = String(max);
    }
}