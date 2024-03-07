import { items } from "./items.js";
import { MapSprite } from "./worldmap.js";

export class Prop extends MapSprite {
    blocksActors = false;

    /** @overload @param {TileName} spriteTile @param {Overrides<Prop>} [options] */
    /** @param {TileName} spriteTile @param {Overrides<Prop>} options */
    constructor(spriteTile, options, {blocksActors, ...rest} = options ?? {}) {
        super(spriteTile, rest);
        this.blocksActors = blocksActors ?? this.blocksActors;
    }
}

export class Item extends Prop {
    /** @type {ItemName} */
    itemName;
    stackSize = 1;
    label = "A jar of peanut butter";
    plural = "jars of peanut butter";
    description = "Hard to open.";

    /** @overload @param {ItemName} itemName @param {Overrides<Item>} [options] */
    /** @param {TileName} explicitItemName @param {Overrides<Item>} options */
    constructor(explicitItemName,
                options,
                {
                    itemName = explicitItemName,
                    spriteTile = items[itemName].spriteTile,
                    label = items[itemName].label,
                    plural = items[itemName].plural,
                    description = items[itemName].description,
                    stackSize,
                    ...rest
                } = options ?? {}) {
        super(spriteTile, {...rest});
        this.label = label ?? this.label;
        this.plural = label ?? this.plural;
        this.description = description ?? this.description;
        this.stackSize = stackSize ?? this.stackSize;
    }

    getInventoryLabel() {
        return this.stackSize === 1 ? this.label : `${this.stackSize} ${this.plural}`;
    }
}

Object.assign(self, {Prop, Item});