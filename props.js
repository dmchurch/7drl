import { MapSprite, WorldMap } from "./worldmap.js";

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
    inventoryLabel = "A jar of peanut butter";

    /** @overload @param {TileName} spriteTile @param {Overrides<Item>} [options] */
    /** @param {TileName} spriteTile @param {Overrides<Item>} options */
    constructor(spriteTile, options, {inventoryLabel, ...rest} = options ?? {}) {
        super(spriteTile, rest);
        this.inventoryLabel = inventoryLabel ?? this.inventoryLabel;
    }
}

Object.assign(self, {Prop, Item});