import { RNG } from "rot-js";
import { after, indexInArray, mapToEntries, mapToValues } from "./helpers.js";
import { fixPopDefinition, popDefinitions, pops } from "~data/pops.js";
import { MapSprite, WorldMap } from "./worldmap.js";
import { Item } from "./props.js";
import { Actor } from "./actors.js";
import { Player } from "./player.js";
import { Cellular3D } from "./cellular3d.js";
import { viewport } from "./globals.js";
import { ArrayCoordSet, BoundingBox, Coord, NearbyCoords, SpreadCoords } from "./geometry.js";

export function getSpawnablePops(popDef: PopDefinition, includeInventories = false, result: { item?: Set<ItemName>; role?: Set<RoleName>; } = {}) {
    popDef = fixPopDefinition(popDef);
    const {type} = popDef;
    switch (type) {
        case "item":
            (result.item ??= new Set()).add(popDef.item);
            break;
        case "role":
            (result.role ??= new Set()).add(popDef.role);
            break;
        case "pickeach":
        case "pickone":
            for (const subDef of type === "pickeach" ? popDef.pickeach : popDef.pickone) {
                getSpawnablePops(subDef, includeInventories, result);
            }
            break;
        case "pop":
            const subDef = pops[popDef.pop];
            getSpawnablePops(subDef, includeInventories, result);
            break;
    }
    if (includeInventories && popDef.inventory) {
        getSpawnablePops(popDef.inventory, true, result);
    }
    return result;
}

export function createSpriteFor(pop: ItemPopDefinition | RolePopDefinition) {
    if (pop.type === "item") {
        return Item.create(pop.item, pop.overrides);
    } else if (pop.type === "role") {
        return Actor.create(pop.role, pop.overrides);
    } else {
        throw new Error("Bad pop type?", pop);
    }
}

export interface SpawnRecord {
    popDef: PopDefinition;
    spawnContext: SpawnContext;
    startSprite: number;
    sizeRegion?: CoordSet;
    spriteCount?: number;       // When the popdef only generates single sprites
    spriteCounts?: number[];
    subDef?: SpawnRecord;       // When there is only one
    subDefs?: SpawnRecord[][];  // When there are multiple and/or multiple instances
    inventories?: SpawnRecord[];
}

export interface SpawnContext {
    reservedCoords: Set<Coord>;
    spawnedSprites: MapSprite[];
    rootPopDef: PopDefinition;
    worldMap: WorldMap;
}

export function spawnSprite(worldMap: WorldMap, sprite: MapSprite, spawnRegion: CoordSet, spawnContext?: SpawnContext, randomizeCoords = true) {
    const {reservedCoords, spawnedSprites, rootPopDef} = spawnContext ?? {};

    if (spawnRegion.potentiallyUnbounded) {
        spawnRegion = spawnRegion.limitCoords(50000);
    }

    if (randomizeCoords) {
        spawnRegion.randomizeCoords();
    }

    let spawned = false;
    spawnRegion.rewindCoords();
    for (let coord = spawnRegion.nextCoord(); coord; coord = spawnRegion.nextCoord()) {
        if (spawnContext?.reservedCoords.has(coord)) continue;
        const {x, y, z} = coord;
        if (sprite.canSpawnAt(x, y, z, worldMap, null, rootPopDef)) {
            worldMap.addSprite(sprite, {x, y, z});
            reservedCoords?.add(coord);
            spawnedSprites?.push(sprite);
            spawned = true;
            break;
        }
    }

    return spawned ? sprite : null;
}

function findSpawnRegion(popDef: PopDefinition, spawnRegion: CoordSet, spawnContext?: SpawnContext) {
    const {size} = popDef;

    if (!size) return spawnRegion;

    const wantsSize = Array.isArray(size) ? RNG.getUniformInt(size[0], size[1]) : size;
    if (!wantsSize) {
        console.warn("Bad size spec? popdef has size that resolves to 0", popDef, spawnContext);
        return null;
    }

    const spawns = getSpawnablePops(popDef);
    if (!spawns.item && !spawns.role) {
        console.warn("popdef has size but no spawned entities?", popDef, spawnContext);
        return new ArrayCoordSet();
    }

    const sprites: MapSprite[] = [];
    for (const itemName of spawns.item ?? []) {
        sprites.push(Item.create(itemName));
    }
    for (const roleName of spawns.role ?? []) {
        sprites.push(Actor.create(roleName));
    }

    const {worldMap, reservedCoords, rootPopDef} = spawnContext;

    if (spawnRegion.potentiallyUnbounded) {
        spawnRegion = spawnRegion.limitCoords(50000);
    }

    const isValidSpawn = (coord: Coord, {x, y, z} = coord) =>
        reservedCoords.has(coord) ? false :
        sprites.some(s => s.canSpawnAt(x, y, z, worldMap, popDef, rootPopDef)) ? true :
        worldMap.isEmpty(x, y, z) ? null
        : false;

    const spreadRegion = new SpreadCoords(Coord.Zero, isValidSpawn, spawnRegion);
    spawnRegion.rewindCoords();

    for (const startCoord of spawnRegion) {
        if (!isValidSpawn(startCoord)) continue;
        // found a valid starting location, try to get coords from it
        spreadRegion.origin = startCoord;
        
        const coords = spreadRegion.getCoords(wantsSize, true);
        if (coords?.length === wantsSize) {
            coords.randomizeCoords();
            return coords;
        }
    }

    return null;
}

/**
 * Spawn a single instance (unmodified by chance or count) of a given popdef
 */
export function spawnPopDefInstance(popDef: PopDefinition, spawnRegion: CoordSet, spawnContext: SpawnContext, spawnRecord: SpawnRecord) {
    const {type, size, inventory} = popDef;
    const {reservedCoords, spawnedSprites, worldMap} = spawnContext;

    if (size) {
        spawnRegion = findSpawnRegion(popDef, spawnRegion, spawnContext);
        if (!spawnRegion) {
            console.warn("Could not find spawn region for popDef:", popDef)
            return;
        }
        console.log(`Reserved ${spawnRegion.countCoords(true)} coords around ${spawnRegion.getCenterCoord()} for`, spawnRecord);
    }

    const spriteIndex = spawnedSprites.length; // any new sprites spawned will be after this index
    let sprite;
    let subDefs;

    switch (type) {
        case "pickeach": 
            subDefs = popDef.pickeach;
            break;
        case "pickone":
            const weights: Record<number, number> = popDef.pickone.map(def => def.weight);
            const index = parseInt(RNG.getWeightedValue(weights));
            if (indexInArray(index, popDef.pickone)) {
                subDefs = [popDef.pickone[index]]
            }
            break;
        case "role":
            sprite = Actor.create(popDef.role, popDef.overrides);
            break;
        case "item":
            sprite = Item.create(popDef.item, popDef.overrides);
            break;
        case "pop":
            subDefs = [pops[popDef.pop]];
    }

    if (subDefs) {
        (spawnRecord.subDefs ??= []).push(subDefs.map(def => spawnPops(worldMap, def, spawnRegion, spawnContext, false)));
    }
    if (sprite) {
        spawnSprite(worldMap, sprite, spawnRegion, spawnContext, false);
        spawnRecord.spriteCount ??= 0;
        spawnRecord.spriteCount++;
    } else if (spawnedSprites.length !== spriteIndex) {
        (spawnRecord.spriteCounts ??= []).push(spawnedSprites.length - spriteIndex);
    }

    if (inventory) {
        // do this later
    }

    if (size) {
        // reserve all spawnRegion coords
        for (const c of spawnRegion) {
            reservedCoords.add(c);
        }
    }
}

/**
 * Spawn all instances of a given popdef
 */
export function spawnPops(worldMap: WorldMap, popDef: PopDefinition, spawnRegion: CoordSet, spawnContext?: SpawnContext, randomizeCoords = true): SpawnRecord {
    spawnContext ??= {
        reservedCoords: new Set(),
        rootPopDef: popDef instanceof MapSprite ? null : popDef,
        spawnedSprites: [],
        worldMap,
    };

    const spawnRecord: SpawnRecord = {
        popDef,
        spawnContext,
        startSprite: spawnContext.spawnedSprites.length,
    }

    if (randomizeCoords) {
        spawnRegion.randomizeCoords();
    }

    let {
        chance = 100,
        count = 1,
    } = popDef = fixPopDefinition(popDef);

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
            spawnPopDefInstance(popDef, spawnRegion, spawnContext, spawnRecord);
        }
    }
    
    if (spawnRecord.subDefs?.length === 1 && spawnRecord.subDefs[0].length === 1) {
        spawnRecord.subDef = spawnRecord.subDefs[0][0];
        delete spawnRecord.subDefs;
    }

    return spawnRecord;
}

export function spawnNearby(sprite: MapSprite, popDef: PopDefinition | MapSprite, options?: Parameters<MapSprite["distributeNearby"]>[0], worldMap = sprite.worldMap, randomizeCoords = false) {
    // console.log("spawning nearby", sprite, popDef, worldMap);
    const nearby = new NearbyCoords(sprite.coord, options?.minRadius ?? 1, options?.maxRadius);
    if (popDef instanceof MapSprite) {
        return spawnSprite(worldMap, popDef, nearby, undefined, randomizeCoords);
    } else {
        return spawnPops(worldMap, popDef, nearby, undefined, randomizeCoords);
    }
}

MapSprite.spawnNearbyFunction = spawnNearby;

export function spawninBBox(sprite: MapSprite, popDef: PopDefinition, bbox: BoundingBox) {
    // console.log("spawning in bbox", bbox, popDef, sprite);
    return spawnPops(sprite.worldMap, popDef, bbox);
}

export function *iterateMap(generator: Cellular3D, iters = 5, randomizeProb = 0.5) {
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

export async function generateMap(generator: Cellular3D, iters = 5, randomizeProb = 0.5, initFunction?: (iteration: number, generator: Cellular3D) => void) {
    for (const i of iterateMap(generator, iters, randomizeProb)) {
        if (i > 1) await after(10); // the first yield comes before the first create
        initFunction?.(i, generator);
    }
}

export function analyzeMap(worldMap: WorldMap, bbox = worldMap.bounds, spawnRecord?: SpawnRecord) {
    let openTiles = 0;
    let groundTiles = 0;
    bbox.walk((x, y, z, base = worldMap.getBase(x, y, z)) => 
                !base ? openTiles++
                : base === 1 && !worldMap.getBase(x, y, z+1) ? groundTiles++
                : null);
    const count = bbox.countCoords();
    console.log(`World with bounds ${worldMap.bounds} section ${bbox}: Of ${count} coordinates,`,
                `${openTiles} (${(openTiles*100/count).toFixed(1)}%) are open, and`,
                `${groundTiles} (${(groundTiles*100/count).toFixed(1)}%) are ground`);
    if (spawnRecord) {
        const {spawnContext} = spawnRecord;
        console.log(`Spawned ${spawnContext.spawnedSprites.length} sprites:`, spawnRecord);
    }
}

export async function generateWorld(worldMap: WorldMap, player: Player) {
    performance.mark("generate-world-start");
    worldMap.clearAll();
    const {width, height, depth, bounds} = worldMap;

    const easyArea = bounds.copy().subdivideZ(3, 3);
    const mediumArea = bounds.copy().subdivideZ(3, 2);
    const hardArea = bounds.copy().subdivideZ(3, 1);

    player.z = depth - Math.round(depth / 10);
    player.x = Math.round(width / 10);
    player.y = Math.round(height / 10);

    console.group(`Generating ${width}×${height}×${depth} world with ${player}`);

    const generator = new Cellular3D(worldMap.width, worldMap.height, worldMap.depth);
    const setBaseCallback = worldMap.makeSetBaseCallback(0, 0, 0, {0: "roughwall", 1: null});

    await generateMap(generator);
    generator.export(setBaseCallback);

    const playerSpawn = spawnNearby(player, player, {maxRadius: 50}, worldMap);

    console.log("player spawned, popping pops", playerSpawn);

    const easySpawn = spawninBBox(player, {pop: "easyPlace"}, easyArea);
    const mediumSpawn = spawninBBox(player, {pop: "mediumPlace"}, mediumArea);
    const hardSpawn = spawninBBox(player, {pop: "hardPlace"}, hardArea);

    performance.mark("generate-world-end");
    const measure = performance.measure("generate-world-total", "generate-world-start", "generate-world-end");
    console.log(`World generation complete, total time ${measure.duration} ms`);

    analyzeMap(worldMap);
    analyzeMap(worldMap, easyArea, easySpawn);
    analyzeMap(worldMap, mediumArea, mediumSpawn);
    analyzeMap(worldMap, hardArea, hardSpawn);

    console.groupEnd();

    viewport.centerOn(player.x, player.y, player.z, true);
}

// make all these accessible from the console
Object.assign(self, {
    getSpawnablePops,
    createSpriteFor,
    spawnPops,
    spawnNearby,
    spawninBBox,
    iterateMap,
    generateMap,
    analyzeMap,
    generateWorld,
})