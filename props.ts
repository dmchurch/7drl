import { RNG } from "rot-js";
import { filterEntries, mapEntries, typedEntries } from "./helpers.js";
import { items } from "./items.js";
import { eggTiles, soulTiles } from "./tiles.js";
import { MapSprite, WorldMap, isSpriteContainer } from "./worldmap.js";

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
                    durability,
                    maxDurability,
                    ...rest
                } = options ?? {}) {
        super(spriteTile, {displayLayer: 1, ...rest});
        this.singular = singular ?? this.singular;
        this.label = label ?? this.singular?.replace(/^(An?|Some) /, "") ?? this.label;
        this.plural = plural ?? this.plural;
        this.description = description ?? this.description;
        this.blocksActors = blocksActors ?? this.blocksActors;
        this.durability = durability ?? this.durability;
        this.maxDurability = maxDurability ?? this.maxDurability;
    }

    /** @param {import("./actors.js").Actor} collider */
    getCollidedWith(collider) {
        console.warn("probably shouldn't have collided with something that doesn't know how to get collided with");
    }

    /** @param {number} amount @param {import("./actors.js").Actor} source @param {Item} item */
    takeDamage(amount, source, item) {
        this.durability -= amount;
        if (this.durability <= 0) {
            this.die(source, item);
        }
    }

    /** @param {number} amount @param {import("./actors.js").Actor} source @param {Item} item */
    healDamage(amount, source, item) {
        if (this.durability <= this.maxDurability) {
            this.durability = Math.min(this.maxDurability, this.durability + amount);
        }
    }

    /** @param {import("./actors.js").Actor} killer @param {Item} item */
    die(killer, item) {
        this.releaseFromOwner();
        return false;
    }
}

export class Item extends Prop {
    /** @type {Partial<Record<ItemName, boolean>>} */
    static known = {};

    /** @param {ItemName} itemName @param {Overrides<Item>} [options] @returns {Item} */
    static create(itemName, options) {
        itemName = options?.itemName ?? itemName;
        const spriteTile = options?.spriteTile ?? items[itemName].spriteTile;
        if (soulTiles.includes(spriteTile) && !(this.prototype instanceof SoulItem)) {
            return SoulItem.create(itemName, options);
        } else if (eggTiles.includes(spriteTile) && !(this.prototype instanceof EggItem)) {
            return EggItem.create(itemName, options);
        } else {
            return new this(itemName, options);
        }
    }

    /** @type {ItemName} */
    itemName;
    #stackSize = 1;
    get stackSize() {
        return this.#stackSize;
    }
    set stackSize(v) {
        this.#stackSize = v;
    }

    get itemDef() {
        return items[this.itemName];
    }

    get s() {
        return this.stackSize === 1 ? "s" : "";
    }

    seen = false;

    /** @overload @param {ItemName} itemName @param {Overrides<Item>} [options] */
    /** @param {ItemName} explicitItemName @param {Overrides<Item>} options */
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
            displayLayer: 3,
            singular, plural, description,
            ...rest
        });
        this.itemName = itemName;
        this.stackSize = stackSize ?? this.stackSize;
    }

    discover() {
        this.seen = true;
        if (!Item.known[this.itemName]) {
            Item.known[this.itemName] = true;
            return true;
        }
        return false;
    }

    getIndefiniteLabel(capitalized = true) {
        return this.stackSize === 1 ? (capitalized ? this.singular : this.singular.replace(/^(A|An|Some) /, s => s.toLowerCase())) : `${this.stackSize} ${this.plural}`;
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
        const newStack = Item.create(this.itemName, {...this, stackSize: count});
        this.stackSize -= newStack.stackSize;
        return newStack;
    }
}

export class EggItem extends Item {
    /** @param {ItemName} itemName @param {Overrides<EggItem>} [options] */
    static create(itemName, options) {
        const {stackSize} = options;
        return SoulItem.create(SoulItem.eggsToSouls[itemName], {stackSize, eggItem: options}).eggItem;
    }
    /** @type {SoulItem} */
    soulItem;

    get eggItem() {return this;}

    get stackSize() {
        return this.soulItem?.stackSize ?? 1;
    }
    set stackSize(v) {
        if (this.soulItem) {
            this.soulItem.stackSize = v;
        }
    }

    /** @param {SoulItem} soulItem @param {ItemName} itemName @param {Overrides<EggItem>} [options] */
    constructor(soulItem, itemName, options) {
        super(itemName, {animated: true, ...options});
        this.soulItem = soulItem;
    }

    /** @param {WorldMap} worldMap */
    addedToWorldMap(worldMap) {
        if (SoulItem.identifiedSouls[this.soulItem.itemName]) {
            worldMap.swapSprite(this, this.soulItem);
        }
    }

    /** @param {import("./worldmap.js").SpriteContainer} container */
    addedToContainer(container) {
        if (SoulItem.identifiedSouls[this.soulItem.itemName]) {
            container.replaceItem(this, this.soulItem);
        }
    }

    /** @param {WorldMap} worldMap  */
    identify(worldMap) {
        if (!SoulItem.identifiedSouls[this.soulItem.itemName] && worldMap) {
            SoulItem.identifiedSouls[this.soulItem.itemName] = true;
            this.soulItem.discover(); // don't repeat the discovery message next time you see one
            const seen = new Set();
            const toIdentify = worldMap.sprites.slice(0);
            while (toIdentify.length) {
                const sprite = toIdentify.pop();
                if (seen.has(sprite)) continue;
                seen.add(sprite);
                if (sprite instanceof EggItem && sprite.itemName === this.itemName) {
                    sprite.identify(null);
                } else if (isSpriteContainer(sprite)) {
                    toIdentify.push(...sprite.inventory);
                }
            }
        }
        if (this.container) {
            this.container.replaceItem(this, this.soulItem);
        } else if (this.worldMap) {
            this.worldMap.swapSprite(this, this.soulItem);
        }
        return this.soulItem;
    }
}

export class SoulItem extends Item {
    /** @type {Partial<Record<ItemName, ItemName>>} */
    static soulsToEggs = {};
    /** @type {Partial<Record<ItemName, ItemName>>} */
    static eggsToSouls = {};
    
    /** @type {Partial<Record<ItemName, boolean>>} */
    static identifiedSouls = {};

    static get eggsRemaining() {
        const value =
            RNG.shuffle(
                typedEntries(items).filter(([k, egg]) => eggTiles.includes(egg.spriteTile)))
               .map(([k, egg]) => k);

        Object.defineProperty(SoulItem, "eggsRemaining", {value, configurable: true});
        return value;
    }

    /** @param {ItemName} itemName @param {Overrides<SoulItem>} [options] */
    static create(itemName, options) {
        const item = new this(itemName, options);
        if (!this.identifiedSouls[itemName]) {
            return item.eggItem;
        }
        return item;
    }

    /** @type {EggItem} */
    eggItem;
    get soulItem() {return this;}

    /** @overload @param {ItemName} itemName @param {Overrides<SoulItem>} [options] */
    /** @param {ItemName} itemName @param {Overrides<SoulItem>} options */
    constructor(itemName, {eggItem, ...rest} = {}) {
        super(itemName, {displayLayer: 3.5, ...rest});
        itemName = this.itemName ?? itemName;

        if (!new.target.soulsToEggs[itemName]) {
            const egg = new.target.eggsRemaining.pop();
            new.target.soulsToEggs[itemName] = egg;
            new.target.eggsToSouls[egg] = itemName;
        }

        this.eggItem = new EggItem(this, new.target.soulsToEggs[itemName]);
    }

    /** @param {WorldMap} worldMap */
    addedToWorldMap(worldMap) {
        if (!SoulItem.identifiedSouls[this.itemName]) {
            worldMap.swapSprite(this, this.eggItem);
        }
    }

    /** @param {import("./worldmap.js").SpriteContainer} container */
    addedToContainer(container) {
        if (!SoulItem.identifiedSouls[this.itemName]) {
            container.replaceItem(this, this.eggItem);
        }
    }
}

Object.assign(self, {Prop, Item, EggItem, SoulItem});