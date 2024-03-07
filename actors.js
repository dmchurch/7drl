import { RNG } from "rot-js";
import { scheduler } from "./engine.js";
import { mapEntries } from "./helpers.js";
import { Item, Prop } from "./props.js";
import { roles } from "./roles.js";
import { Stat, allStats } from "./stats.js";
import { WorldMap } from "./worldmap.js";

export class Actor extends Prop {
    /** @type {RoleName} */
    roleName;
    label = "Something odd";
    plural = "odd things";
    description = "Indescribable.";
    collision = true;

    /** @overload @param {RoleName} roleName @param {Overrides<Actor>} [options] */
    /** @param {RoleName} explicitRoleName @param {Overrides<Actor>} options */
    constructor(explicitRoleName,
                options,
                {
                    roleName = explicitRoleName,
                    spriteTile = roles[roleName].spriteTile,
                    label = roles[roleName].label,
                    plural = roles[roleName].plural,
                    description = roles[roleName].description,
                    collision,
                    ...rest
                } = options ?? {}) {
        super(spriteTile, {blocksActors: true, ...rest});
        this.roleName = roleName;
        this.label = label ?? this.label;
        this.plural = label ?? this.plural;
        this.description = description ?? this.description;
        this.collision = collision ?? this.collision;
    }

    move(dx = 0, dy = 0, dz = 0) {
        if (!dx && !dy && !dz) return false;

        const {x, y, z, collision} = this;

        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;

        if (collision && !this.worldMap.isPassable(nx, ny, nz)) {
            return false;
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

    /** @param {WorldMap} worldMap  */
    addedToWorldMap(worldMap) {
        super.addedToWorldMap(worldMap);
        scheduler.add(this, true);
    }

    async act(time=0) {
        return false;
    }
}

export class Creature extends Actor {
    /** @type {Item[]} */
    inventory = [];

    /** @overload @param {RoleName} roleName @param {Overrides<Creature>} [options]  */
    /** @param {RoleName} roleName @param {Overrides<Creature>} [options]  */
    constructor(roleName, options, {inventory, ...rest} = options ?? {}) {
        super(roleName, {animated: true, ...rest});
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
        item.container = null;
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

    async act(time=0) {
        if (!this.worldMap?.hasSprite(this)) return false;

        if (RNG.getPercentage() <= 50) {
            const [x, y, z] = RNG.getItem([
                [1, 0, 0],
                [-1, 0, 0],
                [0, 1, 0],
                [0, -1, 0],
                [1, 1, 0],
                [-1, -1, 0],
                [-1, 1, 0],
                [1, -1, 0],
                [0, 0, 1],
                [0, 0, -1],
            ]);
            this.move(x, y, z);
        }

        return true;
    }
}

Object.assign(self, {Actor, Creature});