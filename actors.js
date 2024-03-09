import { RNG } from "rot-js";
import { Item, Prop } from "./props.js";
import { roles } from "./roles.js";
import { WorldMap } from "./worldmap.js";
import { Astar3D } from "./rot3d.js";
import { scheduler } from "./engine.js";
import { isConsumableItemDefinition, isEquippableItemDefinition, isMetaEffectName, isNumericEffectName, isVoidEffectName, items } from "./items.js";
import { typedEntries, typedKeys } from "./helpers.js";

console.debug("Starting actors.js");

export class Actor extends Prop {
    /** @type {RoleName} */
    roleName;
    collision = true;
    baseDamage = 1;
    /** @type {Partial<Record<ItemEffectName|NumericItemEffectName, number>>} */
    roundEffects = {};

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
                    singular = roles[roleName].label ?? "An odd thing",
                    plural = roles[roleName].plural ?? "odd things",
                    description = roles[roleName].description ?? "Indescribable.",
                    collision,
                    ...rest
                } = options ?? {}) {
        super(spriteTile, {blocksActors: true, displayLayer: 2, singular, plural, description, ...rest});
        this.roleName = roleName;
        this.collision = collision ?? this.collision;
        this.baseDamage = this.role.baseDamage ?? this.baseDamage;
    }

    toString() {
        return `${this.constructor.name} "${this.roleName}" @ ${this.x},${this.y},${this.z}`;
    }

    /** @param {Prop} target */
    attack(target) {
        const roll = Math.round(RNG.getNormal(this.baseDamage, this.baseDamage / 2));
        target.takeDamage(roll, this, null);
        return roll;
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

    /** @param {ItemEffectName} effect @returns {effect is "fear"|"poison"|"stun"} */
    isRoundEffect(effect) {
        return effect === "fear"
            || effect === "poison"
            || effect === "stun"
    }

    /** @param {VoidItemEffectName|NumericItemEffectName} effect @param {number} strength  @param {Item} item @param {Actor} source */
    applyEffect(effect, strength, item, source) {
        if (effect === "health") {
            if (strength < 0) {
                return this.takeDamage(-strength, source, item);
            } else if (strength > 0) {
                this.healDamage(strength, source, item);
            }
        } else if (effect === "satiety") {
            // no default behavior for satiety effect
        } else if (this.isRoundEffect(effect)) {
            this.applyRoundEffect(effect, strength, item, source);
        } else if (effect === "summon") {
            // this needs to execute pop generation
        } else if (effect === "clean") {
            for (const [e, v] of typedEntries(this.roundEffects)) {
                if (!v) continue;
                this.applyRoundEffect(e, -v, item, source);
            }
        } else if (effect === "sight") {
            this.visibilityRadius += strength;
        }
    }

    /** @param {ItemEffectName|NumericItemEffectName} effect @param {number} rounds @param {Item} item @param {Actor} source */
    applyRoundEffect(effect, rounds, item, source) {
        this.roundEffects[effect] ??= 0;
        this.roundEffects[effect] += rounds;
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
    /** @type {import("./player.js").Player} */
    static activePlayer;

    /** @type {Item[]} */
    inventory = [];

    get validInventory() {
        return this.inventory.filter(i => this.hasItem(i));
    }

    /** @overload @param {RoleName} roleName @param {Overrides<Creature>} [options]  */
    /** @param {RoleName} roleName @param {Overrides<Creature>} [options]  */
    constructor(roleName, options, {inventory, ...rest} = options ?? {}) {
        super(roleName, {animated: true, displayLayer: 4, ...rest});
        inventory?.forEach(this.takeItem.bind(this));
    }

    /** @param {Item} item  */
    takeItem(item) {
        if (this.hasItem(item)) return false;
        this.inventory.push(item);
        item.container = this;
    }

    /** @param {Item} item  */
    hasItem(item) {
        if (this.inventory.includes(item)) {
            if (item.container === this) {
                return true;
            } else {
                this.relinquishItem(item);
            }
        }
        return false;
    }

    /** @param {Item} item  */
    relinquishItem(item) {
        if (!this.inventory.includes(item)) {
            return false;
        }
        this.inventory.splice(this.inventory.indexOf(item), 1);
        item.container = null;
        return true;
    }

    /** @param {Item} item  */
    splitItemStack(item, count = 1) {
        if (!this.hasItem(item)) {
            return null;
        }
        return item.takeStack(count);
    }

    /** @param {Item} item  */
    dropItem(item, count=1) {
        const stack = this.splitItemStack(item, count);
        if (!stack) {
            return null;
        }

        const {x, y, z, worldMap} = this;
        for (const sprite of worldMap.getSpritesAt(x, y, z)) {
            if (sprite instanceof Item && sprite.visible && sprite.tangible && sprite.itemName === item.itemName) {
                sprite.stackSize += stack.stackSize;
                return [stack, sprite];
            }
        }
        worldMap.addSprite(stack, {x, y, z})
        return stack;
    }

    /** @param {Item} item  */
    eatItem(item, count=1) {
        const stack = this.splitItemStack(item, count);
        if (!stack) {
            return false;
        }

        this.digestItemStack(stack);
        return true;
    }

    /** @param {Item} stack */
    digestItemStack(stack) {
        const {itemDef} = stack;
        // default behavior for equippable items is to heal 1 durability
        let behaviors = isConsumableItemDefinition(itemDef) ? itemDef.behavior : itemDef.equipBehavior ?? {health: 1};
        if (!Array.isArray(behaviors)) {
            behaviors = behaviors ? [behaviors] : [];
        }

        for (const behavior of behaviors) {
            this.performItemBehavior(behavior, stack);
        }
        
        if (this.durability < this.maxDurability) {
            this.durability = Math.min(this.maxDurability, this.durability + stack.stackSize);
        }
    }

    /** @param {ItemBehavior} behavior @param {Item} item  */
    performItemBehavior(behavior, item) {
        for (const name of typedKeys(behavior)) {
            if (isVoidEffectName(name)) {
                this.performVoidEffect(name, behavior[name], item);
            } else if (isNumericEffectName(name)) {
                this.performNumericEffect(name, behavior[name], item);
            } else if (isMetaEffectName(name)) {
                this.performMetaEffect(name, behavior[name].r, behavior[name], item);
            }
        }
    }

    /** @param {VoidItemEffectName} effect @param {boolean} sense @param {Item} item */
    performVoidEffect(effect, sense, item) {
        // default behavior for numeric effects is to apply to self at strength 1 or -1
        this.applyEffect(effect, sense ? 1 : -1, item, this)
    }
    /** @param {NumericItemEffectName} effect @param {number} value @param {Item} item */
    performNumericEffect(effect, value, item) {
        // default behavior for numeric effects is to apply to self
        this.applyEffect(effect, value, item, this);
    }
    /** @param {MetaItemEffectName} effect @param {number} r @param {ItemBehavior} behavior @param {Item} item */
    performMetaEffect(effect, r, behavior, item) {
        if (effect === "burst") {
            // panic
            console.error("Burst effects not implemented yet");
        } else {
            // even more panic
            throw Error("Bad meta effect", effect);
        }
    }

    /** @param {Actor} collider */
    getCollidedWith(collider) {
        if (collider instanceof Creature) {
            collider.attack(this);
        }
    }

    async act(time=0) {
        if (!this.worldMap?.hasSprite(this)) return this.die(null, null);

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

        const player = Creature.activePlayer;

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