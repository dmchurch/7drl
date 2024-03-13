import { RNG } from "rot-js";
import { after, animationFrame, indexInArray, newBBox, setBBox, walkBBox } from "./helpers.js";
import { fixPopDefinition, pops } from "./pops.js";
import { MapSprite, WorldMap } from "./worldmap.js";
import { Item } from "./props.js";
import { Actor } from "./actors.js";
import { Player } from "./player.js";
import { Cellular3D } from "./cellular3d.js";
import { viewport } from "./globals.js";

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
 * @param {PopDefinition|MapSprite} popDef
 * @param {Iterable<[x:number,y:number,z:number][], void>} distribution
 * @param {MapSprite} [context]
 */
export function spawnPops(worldMap, popDef, distribution, context) {
    const generator = popDef instanceof MapSprite ? null : generatePops(popDef);
    /** @type {Iterator<[x:number,y:number,z:number][], void>} */
    const distributor = distribution[Symbol.iterator]();
    let cells = distributor.next()?.value;
    let pop = generator?.next()?.value;
    let sprite = popDef instanceof MapSprite ? popDef : pop ? createSpriteFor(pop) : null;
    const sprites = [];
    while (sprite && cells) {
        for (const index of RNG.shuffle(Array.from(cells.keys()))) {
            const [x, y, z] = cells[index];
            // @ts-ignore
            if (sprite.canSpawnAt(x, y, z, worldMap, pop, popDef instanceof MapSprite ? null : popDef, context)) {
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
            cells = distributor.next()?.value;
        } else {
            pop = generator?.next()?.value;
            sprite = pop ? createSpriteFor(pop) : null;
        }
    }
    return sprites;
}

/** @param {MapSprite} sprite @param {PopDefinition|MapSprite} popDef @param {Parameters<MapSprite["distributeNearby"]>[0]} [options] */
export function spawnNearby(sprite, popDef, options, worldMap = sprite.worldMap) {
    // console.log("spawning nearby", sprite, popDef, worldMap);
    return spawnPops(worldMap, popDef, sprite.distributeNearby(options, worldMap), sprite);
}

MapSprite.spawnNearbyFunction = spawnNearby;

/** @param {BoundingBox} bbox */
export function distributeBBox(bbox) {
    /** @type {[number, number, number][]} */
    const cells = [];
    walkBBox(bbox, (x, y, z) => cells.push([x, y, z]));
    return [cells];
}

/** @param {MapSprite} sprite @param {PopDefinition} popDef @param {BoundingBox} bbox */
export function spawninBBox(sprite, popDef, bbox) {
    // console.log("spawning in bbox", bbox, popDef, sprite);
    return spawnPops(sprite.worldMap, popDef, distributeBBox(bbox), sprite);
}

/** @param {Cellular3D} generator */
export function *iterateMap(generator, iters = 5, randomizeProb = 0.5) {
    const {width, height, depth} = generator;
    console.groupCollapsed(`Generating cellular map of size ${width}×${height}×${depth} using ${iters} iterations`);
    performance.mark("generate-start");
    generator.randomize(randomizeProb);
    performance.mark("randomized")
    console.log(`Randomized starting conditions, pop ${generator.population()}`);
    performance.measure("randomize-map", "generate-start", "randomized");
    for (let i = 1; i <= iters; i++) {
        yield i;
        console.log(`Running iteration ${i}, pop ${generator.population()}`);
        performance.mark("create-start");
        generator.create();
        performance.mark("create-end");
        performance.measure("iterate-map", "create-start", "create-end");
    }
    performance.mark("generate-end");
    const measure = performance.measure("generate-map", "generate-start", "generate-end");
    console.log(`Generation complete, pop ${generator.population()}, total time ${measure.duration} ms`);
    console.groupEnd();
}

/** @param {Cellular3D} generator @param {(iteration: number, generator: Cellular3D) => void} [initFunction] */
export async function generateMap(generator, iters = 5, randomizeProb = 0.5, initFunction) {
    for (const i of iterateMap(generator, iters, randomizeProb)) {
        if (i > 1) await after(10); // the first yield comes before the first create
        initFunction?.(i, generator);
    }
}

/** @param {WorldMap} worldMap */
export function analyzeMap(worldMap) {

}

/** @param {WorldMap} worldMap @param {Player} player */
export async function generateWorld(worldMap, player) {
    worldMap.clearAll();
    const {width, height, depth} = worldMap;

    player.z = depth - Math.round(depth / 10);
    player.x = Math.round(width / 10);
    player.y = Math.round(height / 10);

    console.group(`Generating ${width}×${height}×${depth} world with ${player}`);

    const generator = new Cellular3D(worldMap.width, worldMap.height, worldMap.depth);
    const setBaseCallback = worldMap.makeSetBaseCallback(0, 0, 0, {0: "roughwall", 1: null});

    await generateMap(generator);
    generator.export(setBaseCallback);

    analyzeMap(worldMap);

    const playerSpawn = spawnNearby(player, player, {maxRadius: 50}, worldMap);

    const totalDistance = Math.max(width, height) + depth;
    console.log("player spawned, popping pops", playerSpawn);

    const bbox = newBBox();
    for (let xOrg = 0; xOrg < width; xOrg += 10) {
        for (let yOrg = 0; yOrg < height; yOrg += 10) {
            for (let zOrg = 0; zOrg < depth; zOrg += 10) {
                setBBox(bbox, xOrg, yOrg, zOrg, 10, 10, 10);
                const playerDistance = Math.max(Math.abs(xOrg - player.x), Math.abs(yOrg - player.y)) + Math.abs(zOrg - player.z);
                if (playerDistance / totalDistance < 0.25) {
                    // spawn easy region
                    // console.debug("spawning easy at",{xOrg, yOrg, zOrg});
                    spawninBBox(player, {pop: "easyPlace"}, bbox);
                } else if (playerDistance / totalDistance < 0.75) {
                    // spawn moderate region
                    // console.debug("spawning mid at",{xOrg, yOrg, zOrg});
                    spawninBBox(player, {pop: "mediumPlace"}, bbox);
                } else {
                    // spawn hard region
                    // console.debug("spawning hard at",{xOrg, yOrg, zOrg});
                    spawninBBox(player, {pop: "hardPlace", chance: 50}, bbox);
                }
            }        
        }
    }

    console.log("World generation complete");
    console.groupEnd();

    viewport.centerOn(player.x, player.y, player.z, true);
}

// make all these accessible from the console
Object.assign(self, {
    generatePops,
    createSpriteFor,
    spawnPops,
    spawnNearby,
    distributeBBox,
    spawninBBox,
    iterateMap,
    generateMap,
    analyzeMap,
    generateWorld,
})