import { RNG } from "rot-js";
import { EggItem, Item, Prop } from "./props.js";
import { roles } from "~data/roles.js";
import { SpriteContainer, WorldMap } from "./worldmap.js";
import { Astar3D } from "./rot3d.js";
import { scheduler } from "./engine.js";
import { isConsumableItemDefinition, isMetaEffectName, isNumericEffectName, isVoidEffectName } from "~data/items.js";
import { typedEntries, typedKeys } from "./helpers.js";
import type { Player } from "./player.js";

console.debug("Starting actors.js");

export class Actor extends Prop {
    static nextActorId = 1;

    static create(roleName: RoleName, options?: Overrides<Actor>): Actor {
        roleName = options?.roleName ?? roleName;
        const roleType = roles[roleName]?.type ?? "creature";
        if (roleType === "decor" && this !== Decor) {
            return Decor.create(roleName, options);
        } else if (roleType !== "actor" && this === Actor) {
            return Creature.create(roleName, options);
        }
        return new this(roleName, options);
    }

    #id = Actor.nextActorId++;
    get id() { return this.#id; }

    roleName: RoleName;
    collision = true;
    baseDamage = 1;
    roundEffects: Partial<Record<ItemEffectName | NumericItemEffectName, number>> = {};

    get role() {
        return roles[this.roleName];
    }

    protected constructor(explicitRoleName: RoleName, options?: Overrides<Actor>);
    protected constructor(explicitRoleName: RoleName,
                options?: Overrides<Actor>,
                {
                    roleName = explicitRoleName,
                    spriteTile = roles[roleName].spriteTile,
                    singular = roles[roleName].label ?? "An odd thing",
                    plural = roles[roleName].plural ?? "odd things",
                    description = roles[roleName].description ?? "Indescribable.",
                    collision,
                    ...rest
                }: Overrides<Actor> = options ?? {}) {
        super(spriteTile, {
            blocksActors: !roles[roleName].insubstantial,
            durability: roles[roleName].durability,
            maxDurability: roles[roleName].durability,
            displayLayer: 2,
            singular,
            plural,
            description,
            ...rest});
        this.roleName = roleName;
        this.collision = collision ?? this.collision;
        this.baseDamage = this.role.baseDamage ?? this.baseDamage;
    }

    toString() {
        return `${this.constructor.name}#${this.id} "${this.roleName}" @ ${this.x},${this.y},${this.z}`;
    }

    attack(target: Prop) {
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

    isRoundEffect(effect: ItemEffectName): effect is "fear" | "poison" | "stun" {
        return effect === "fear"
            || effect === "poison"
            || effect === "stun"
    }

    applyEffect(effect: VoidItemEffectName | NumericItemEffectName, strength: number, item: Item, source: Actor) {
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

    applyRoundEffect(effect: ItemEffectName | NumericItemEffectName, rounds: number, item: Item, source: Actor) {
        this.roundEffects[effect] ??= 0;
        this.roundEffects[effect] += rounds;
        if (this.roundEffects[effect] === 0) {
            delete this.roundEffects[effect];
        }
    }

    procRoundEffects() {
        for (let [effect, rounds] of typedEntries(this.roundEffects)) {
            if (rounds) {
                this.procRoundEffect(effect, rounds);
                if (rounds < 0) rounds++;
                else if (rounds > 0) rounds--;
            }
            if (!rounds) {
                delete this.roundEffects[effect];
            } else {
                this.roundEffects[effect] = rounds;
            }
        }
    }

    procRoundEffect(effect: ItemEffectName, roundsLeft: number) {
    }

    addedToWorldMap(worldMap: WorldMap) {
        super.addedToWorldMap(worldMap);
        scheduler.add(this, true);
    }

    canSpawnAt(x=0, y=0, z=0, worldMap: WorldMap, popDef: PopDefinition, rootPopDef: PopDefinition) {
        const {spawnRestrictions} = this.role;
        if (spawnRestrictions && spawnRestrictions.length) {
            for (const restriction of spawnRestrictions) {
                if (this.checkRestriction(restriction, x, y, z, worldMap)) {
                    return true;
                }
            }
        } else {
            return super.canSpawnAt(x, y, z, worldMap, popDef, rootPopDef);
        }
        return false;
    }
    checkRestriction(restriction: RoleDefinition["spawnRestrictions"][number], x: number, y: number, z: number, worldMap: WorldMap) {
        if (restriction === "inGround") {
            const thisTile = worldMap.getBaseTile(x, y, z);
            const upTile = worldMap.getBaseTile(x, y, z+1);
            return thisTile && !thisTile.insubstantial && !upTile;
        } else if (restriction === "onGround") {
            const thisTile = worldMap.getBaseTile(x, y, z);
            const downTile = worldMap.getBaseTile(x, y, z-1);
            return !thisTile && downTile && !downTile.insubstantial && worldMap.isEmpty(x, y, z);
        } else if (restriction === "onCeiling") {
            const thisTile = worldMap.getBaseTile(x, y, z);
            const upTile = worldMap.getBaseTile(x, y, z+1);
            return !thisTile && upTile && !upTile.insubstantial && worldMap.isEmpty(x, y, z);
        } else if (restriction === "touchingWall") {
            return false; // not yet implemented
        }
    }

    canAct() {
        return false;
    }

    async act(time=0) {
        this.procRoundEffects();
        return false;
    }

    die(killer?: Actor | Player, item?: Item): false {
        this.tangible = false;
        this.visible = false;
        const {destroyMessage, drops} = this.role;
        if (killer && ("receiveDestroyMessage" in killer) && destroyMessage) {
            console.log("sendingdestroy message to", killer, destroyMessage);
            killer.receiveDestroyMessage(destroyMessage, this);
        }
        if (drops && this.worldMap?.hasSprite(this)) {
            console.log("spawning drops", this, drops);
            this.spawnNearby(drops, {minRadius: 0}, this.worldMap);
        }
        return super.die(killer, item)
    }
}

export class Decor extends Actor {
    constructor(roleName: RoleName, options?: Overrides<Decor>) {
        super(roleName, {displayLayer: 2.5, ...options});
    }
    
    getCollidedWith(collider: Actor) {
        if (collider instanceof Creature) {
            collider.attack(this);
        }
    }
}

export class Creature extends Actor implements SpriteContainer {
    static activePlayer: Player;

    inventory: Item[] = [];

    get validInventory() {
        return this.inventory.filter(i => this.hasItem(i));
    }

    protected constructor(roleName: RoleName, options?: Overrides<Creature>);
    protected constructor(roleName: RoleName, options?: Overrides<Creature>, {inventory, ...rest} = options ?? {}) {
        super(roleName, {animated: true, displayLayer: 4, ...rest});
        inventory?.forEach(this.takeItem.bind(this));
    }

    takeItem(item: Item) {
        if (this.hasItem(item)) return false;
        const addToStack = this.inventory.find(i => i.itemName === item.itemName);
        if (addToStack) {
            addToStack.stackSize += item.stackSize;
            item.releaseFromOwner();
            return true;
        }
        this.inventory.push(item);
        item.container = this;
        return true;
    }

    takeItems() {
        let success = null;
        for (const sprite of this.worldMap.getSpritesAt(this.x, this.y, this.z)) {
            if (sprite instanceof Item && sprite.tangible) {
                success ??= true;
                if (!this.takeItem(sprite)) {
                    success = false;
                }
            }
        }
        return success;
    }

    hasItem(item: Item) {
        if (this.inventory.includes(item)) {
            if (item.container === this) {
                return true;
            } else {
                this.relinquishItem(item);
            }
        }
        return false;
    }

    relinquishItem(item: Item) {
        if (!this.inventory.includes(item)) {
            return false;
        }
        this.inventory.splice(this.inventory.indexOf(item), 1);
        item.container = null;
        return true;
    }

    replaceItem(item: Item, withItem: Item) {
        const index = this.inventory.indexOf(item);
        if (index < 0 || this.inventory.includes(withItem)) {
            return false;
        }
        this.inventory[index] = withItem;
        item.container = null;
        withItem.container = this;
        return true;
    }

    splitItemStack(item: Item, count = 1) {
        if (!this.hasItem(item)) {
            return null;
        }
        return item.takeStack(count);
    }

    dropItem(item: Item, count=1) {
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

    eatItem(item: Item, count=1) {
        const stack = this.splitItemStack(item, count);
        if (!stack) {
            return false;
        }

        this.digestItemStack(stack);
        return true;
    }

    digestItemStack(stack: Item) {
        if (stack instanceof EggItem) {
            // default egg behavior is to just eat the soul.
            this.digestItemStack(stack.soulItem);
            return;
        }

        const {itemDef} = stack;
        // default behavior for equippable items is to do nothing
        let behaviors = isConsumableItemDefinition(itemDef) ? itemDef.behavior : itemDef.equipBehavior;
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

    performItemBehavior(behavior: ItemBehavior, item: Item) {
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

    performVoidEffect(effect: VoidItemEffectName, sense: boolean, item: Item) {
        // default behavior for numeric effects is to apply to self at strength 1 or -1
        this.applyEffect(effect, sense ? 1 : -1, item, this)
    }
    performNumericEffect(effect: NumericItemEffectName, value: number, item: Item) {
        // default behavior for numeric effects is to apply to self
        this.applyEffect(effect, value, item, this);
    }
    performMetaEffect(effect: MetaItemEffectName, r: number, behavior: ItemBehavior, item: Item) {
        if (effect === "burst") {
            // panic
            console.error("Burst effects not implemented yet");
        } else {
            // even more panic
            throw Error("Bad meta effect", effect);
        }
    }

    getCollidedWith(collider: Actor) {
        if (collider instanceof Creature) {
            collider.attack(this);
        }
    }

    canAct() {
        return this.worldMap?.pathingBounds.contains(this.x, this.y, this.z);
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
            const [dx, dy, dz] = RNG.getItem([
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
            this.move(dx, dy, dz);
            this.procRoundEffects();
            return true;
        }

        const player = Creature.activePlayer;

        if ((roll -= aggression) <= 0 && player) {
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

        this.procRoundEffects();
        return true;
    }
}

Object.assign(self, {Actor, Creature});