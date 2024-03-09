import { RNG } from "rot-js";
import { indexInArray } from "./helpers.js";
import { fixPopDefinition, pops } from "./pops.js";
import { MapSprite, WorldMap } from "./worldmap.js";
import { Item } from "./props.js";
import { Actor } from "./actors.js";

/** @param {PopDefinition} popDef @returns {Generator<ItemPopDefinition | RolePopDefinition, void>} */
export function *generatePops(popDef) {
    popDef = fixPopDefinition(popDef);
    let {
        chance = 100,
        count = 1,
    } = popDef;

    if (!Array.isArray(chance)) {
        chance = [chance];
    }

    if (Array.isArray(count)) {
        count = RNG.getUniformInt(count[0], count[1]);
    }

    while (count-- > 0) {
        for (const p of chance) {
            if (p < 100 && RNG.getPercentage() > p) {
                continue;
            }
            switch(popDef.type) {
                case "pickeach":
                    for (const subDef of popDef.pickeach) {
                        yield *generatePops(subDef);
                    }
                    break;
                case "pickone":
                    const index = parseInt(RNG.getWeightedValue(Object.fromEntries(popDef.pickone.map(def => def.weight).entries())));
                    console.log(`Picked index ${index} of pops`,popDef.pickone);
                    if (indexInArray(index, popDef.pickone)) {
                        yield *generatePops(popDef.pickone[index]);
                    }
                    break;
                case "role":
                    yield popDef;
                    break;
                case "item":
                    yield popDef;
                    break;
                case "pop":
                    const subDef = pops[popDef.pop];
                    yield *generatePops(subDef);
                    break;
            }
        }
    }
}

/** @param {ItemPopDefinition|RolePopDefinition} pop  */
export function createSpriteFor(pop) {
    if (pop.type === "item") {
        return Item.create(pop.item, pop.overrides);
    } else if (pop.type === "role") {
        return Actor.create(pop.role, pop.overrides);
    } else {
        throw new Error("Bad pop type?", pop);
    }
}

/**
 * @param {WorldMap} worldMap 
 * @param {PopDefinition} popDef
 * @param {Generator<[x:number,y:number,z:number][], void>} distribution
 * @param {MapSprite} [context]
 */
export function spawnPops(worldMap, popDef, distribution, context) {
    const generator = generatePops(popDef);
    let cells = distribution.next()?.value;
    let pop = generator.next()?.value;
    let sprite = pop ? createSpriteFor(pop) : null;
    const sprites = [];
    while (pop && cells) {
        for (const index of RNG.shuffle(Array.from(cells.keys()))) {
            const [x, y, z] = cells[index];
            if (sprite.canSpawnAt(x, y, z, worldMap, pop, popDef, context)) {
                // success
                worldMap.addSprite(sprite, {x, y, z});
                cells.splice(index, 1);
                sprites.push(sprite);
                sprite = null;
                break;
            }
        }
        if (sprite) {
            // couldn't find anywhere in this cell list, let's get another
            cells = distribution.next()?.value;
        } else {
            pop = generator.next()?.value;
            sprite = pop ? createSpriteFor(pop) : null;
        }
    }
    return sprites;
}

/** @param {MapSprite} sprite @param {PopDefinition} popDef @param {Parameters<MapSprite["distributeNearby"]>[0]} [options] */
export function spawnNearby(sprite, popDef, options) {
    return spawnPops(sprite.worldMap, popDef, sprite.distributeNearby(options), sprite);
}