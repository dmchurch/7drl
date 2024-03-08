import { items } from "./items.js";
import { MapSprite } from "./worldmap.js";

console.debug("Starting props.js");

export class Prop extends MapSprite {
    blocksActors = false;

    durability = 5;

    /** @overload @param {TileName} spriteTile @param {Overrides<Prop>} [options] */
    /** @param {TileName} spriteTile @param {Overrides<Prop>} options */
    constructor(spriteTile, options, {blocksActors, ...rest} = options ?? {}) {
        super(spriteTile, rest);
        this.blocksActors = blocksActors ?? this.blocksActors;
    }

    /** @param {import("./actors.js").Actor} collider */
    getCollidedWith(collider) {
        console.warn("probably shouldn't have collided with something that doesn't know how to get collided with");
    }

    /** @param {number} amount @param {import("./actors.js").Actor} source */
    takeDamage(amount, source) {
        this.durability -= amount;
        if (this.durability <= 0) {
            this.die(source);
        }
    }

    /** @param {import("./actors.js").Actor} killer  */
    die(killer) {
        this.releaseFromOwner();
        return false;
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
        this.plural = plural ?? this.plural;
        this.description = description ?? this.description;
        this.stackSize = stackSize ?? this.stackSize;
    }

    getInventoryLabel() {
        return this.stackSize === 1 ? this.label : `${this.stackSize} ${this.plural}`;
    }
}

Object.assign(self, {Prop, Item});