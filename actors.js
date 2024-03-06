import { mapEntries } from "./helpers.js";
import { Item, Prop } from "./props.js";
import { Stat, allStats } from "./stats.js";

export class Actor extends Prop {
    collision = true;

    /** @overload @param {TileName} spriteTile @param {Overrides<Actor>} [options] */
    /** @param {TileName} spriteTile @param {Overrides<Actor>} options */
    constructor(spriteTile, options, {collision, ...rest} = options ?? {}) {
        super(spriteTile, {blocksActors: true, ...rest});
        this.collision = collision ?? this.collision;
    }

    move(dx = 0, dy = 0, dz = 0) {
        if (!dx && !dy && !dz) return false;

        const {x, y, z, collision} = this;

        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;

        if (collision) {
            const baseTile = this.worldMap.getBaseTile(nx, ny, nz);
            if (baseTile && !baseTile.insubstantial) {
                return false;
            }
            for (const sprite of this.worldMap.getSpritesAt(nx, ny, nz)) {
                if (sprite instanceof Prop && sprite.blocksActors) {
                    return false;
                }
            }
        }

        this.x = nx;
        this.y = ny;
        this.z = nz;

        if (this.visible) {
            this.worldMap.drawTile(x, y, z);
            this.worldMap.drawTile(nx, ny, nz);
        }

        return true;
    }
}

export class Creature extends Actor {
    /** @type {Record<StatName, Stat>} */
    stats;

    /** @type {Item[]} */
    inventory = [];

    /** @overload @param {TileName} spriteTile @param {Overrides<Creature>} [options]  */
    /** @param {TileName} spriteTile @param {Overrides<Creature>} [options]  */
    constructor(spriteTile, options, {stats, inventory, ...rest} = options ?? {}) {
        super(spriteTile, {animated: true, ...rest});
        this.stats = mapEntries(allStats, (_def, name) => new Stat(name, stats?.[name]));
        if (inventory) this.inventory.push(...inventory);
    }

    /** @param {Item} item  */
    takeItem(item) {
        if (this.hasItem(item)) return false;
        this.inventory.push(item);
        item.container = this;
    }

    /** @param {Item} item  */
    hasItem(item) {
        return this.inventory.includes(item);
    }

    /** @param {Item} item  */
    relinquishItem(item) {
        if (!this.hasItem(item)) {
            return false;
        }
        this.inventory.splice(this.inventory.indexOf(item), 1);
        return true;
    }

    /** @param {Item} item  */
    dropItem(item) {
        if (!this.relinquishItem(item)) {
            return false;
        }

        const {x, y, z, worldMap} = this;
        worldMap.addSprite(item, {x, y, z})
        return true;
    }
}

Object.assign(self, {Actor, Creature});