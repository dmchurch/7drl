import { items } from "./items.js";
import { MapSprite } from "./worldmap.js";

console.debug("Starting props.js");

export class Prop extends MapSprite {
    singular = "An prop";
    label = "prop";
    plural = "props";
    description = "It's a prop.";
    blocksActors = false;

    durability = 5;
    maxDurability = 5;

    /** @overload @param {TileName} spriteTile @param {Overrides<Prop>} [options] */
    /** @param {TileName} spriteTile @param {Overrides<Prop>} options */
    constructor(spriteTile,
                options,
                {
                    blocksActors,
                    singular,
                    label,
                    plural,
                    description,
                    ...rest
                } = options ?? {}) {
        super(spriteTile, rest);
        this.singular = singular ?? this.singular;
        this.label = label ?? this.singular?.replace(/^(An?|Some) /, "") ?? this.label;
        this.plural = plural ?? this.plural;
        this.description = description ?? this.description;
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

    /** @overload @param {ItemName} itemName @param {Overrides<Item>} [options] */
    /** @param {TileName} explicitItemName @param {Overrides<Item>} options */
    constructor(explicitItemName,
                options,
                {
                    itemName = explicitItemName,
                    spriteTile = items[itemName].spriteTile,
                    singular = items[itemName].label ?? "A jar of peanut butter",
                    plural = items[itemName].plural ?? "jars of peanut butter",
                    description = items[itemName].description ?? "Hard to open.",
                    stackSize,
                    ...rest
                } = options ?? {}) {
        super(spriteTile, {
            singular, plural, description,
            ...rest
        });
        this.stackSize = stackSize ?? this.stackSize;
    }

    getInventoryLabel() {
        return this.stackSize === 1 ? this.label : `${this.stackSize} ${this.plural}`;
    }

    getDefiniteLabel(capitalize = false) {
        return this.stackSize === 1 ? `${capitalize ? "The" : "the"} ${this.label}` : `${this.stackSize} ${this.plural}`;
    }

    takeStack(count = 1) {
        count = Math.min(count, this.stackSize);
        if (count <= 0) return null;
        if (count === this.stackSize) {
            this.releaseFromOwner();
            return this;
        }
        const newStack = new Item(this.itemName, {...this, stackSize: count});
        this.stackSize -= newStack.stackSize;
        return newStack;
    }
}

Object.assign(self, {Prop, Item});