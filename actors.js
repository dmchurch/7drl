import { RNG } from "rot-js";
import { scheduler } from "./engine.js";
import { mapEntries } from "./helpers.js";
import { Item, Prop } from "./props.js";
import { roles } from "./roles.js";
import { Stat, allStats } from "./stats.js";
import { WorldMap } from "./worldmap.js";
import { player } from "./main.js";
import { Astar3D } from "./rot3d.js";

export class Actor extends Prop {
    /** @type {RoleName} */
    roleName;
    label = "Something odd";
    plural = "odd things";
    description = "Indescribable.";
    collision = true;
    baseDamage = 1;

    get role() {
        return roles[this.roleName];
    }

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
        this.baseDamage = this.role.baseDamage ?? this.baseDamage;
    }

    toString() {
        return `${this.constructor.name} "${this.roleName}" @ ${this.x},${this.y},${this.z}`;
    }

    /** @param {Prop} target */
    attack(target) {
        const roll = Math.round(RNG.getNormal(this.baseDamage, this.baseDamage / 2));
        target.takeDamage(roll, this);
    }

    move(dx = 0, dy = 0, dz = 0) {
        if (!dx && !dy && !dz) return false;

        const {x, y, z, collision, worldMap} = this;

        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;

        if (collision && !worldMap.isPassable(nx, ny, nz)) {
            if (worldMap.blockingSprite instanceof Prop) {
                worldMap.blockingSprite.getCollidedWith(this);
            }
            return false;
        }

        this.x = nx;
        this.y = ny;
        this.z = nz;

        if (this.visible) {
            worldMap.drawTile(x, y, z);
            worldMap.drawTile(nx, ny, nz);
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

    /** @param {Actor} collider */
    getCollidedWith(collider) {
        if (collider instanceof Creature) {
            collider.attack(this);
        }
    }

    async act(time=0) {
        if (!this.worldMap?.hasSprite(this)) return this.die(null);

        const {role} = this;
        let roll = RNG.getPercentage();

        const {
            aggression = 0,
            distraction = 0,
        } = role;

        if ((roll -= distraction) <= 0) {
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
            return true;
        }

        if ((roll -= aggression) <= 0) {
            let foundMove = false;
            let nx = this.x, ny = this.y, nz = this.z;
            this.tangible = false;
            player.tangible = false;
            const path = new Astar3D(this.x, this.y, this.z, this.worldMap.isPassable);
            path.compute3D(player.x, player.y, player.z, (x, y, z) => {
                if (x === this.x && y === this.y && z === this.z) {
                    foundMove = true;
                } else if (!foundMove) {
                    nx = x;
                    ny = y;
                    nz = z;
                }
            });
            this.tangible = true;
            player.tangible = true;
            if (foundMove) {
                const dx = nx - this.x, dy = ny - this.y, dz = nz - this.z;
                this.move(dx, dy, dz);
            }
        }

        return true;
    }
}

Object.assign(self, {Actor, Creature});