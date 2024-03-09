import { typedEntries, typedKeys } from "./helpers.js"
import { WallRule } from "./walls.js"

/**
 * @typedef TileSheetDef
 * @prop {string} filename
 * @prop {string} [filenameDark]
 * @prop {"frames"|"walls"} [mode]
 * @prop {WallRuleName} [wallRules]
 */

/** @satisfies {Record<string, string | [string, string] | TileSheetDef>} */
export const tileSheets = {
    tiles1: ["tiles-1", "tiles-1-dark"],
    walls: {
        filename: "tiles-walls",
        mode: "walls",
        wallRules: "standard",
    },
    props: "tiles-props",
    souls: "tiles-souls",
    eggs: "tiles-eggs",
    god: "tiles-god",
    stairs: "stairs",
}
/*
 o: 1
 u, r, d, l: 1 each = 4
 ur, rd, dl, lu: 2 each = 8
 ud, lr: 1 each = 2
 urd, rdl, dlu, lur: 4 each = 16
 urdl: 16
*/

/** @satisfies {Record<string, WallRule>} */
export const wallRules = {
    standard: WallRule.template`
    #########.##.#.##
    #.#.###.#.#######
    ##.#.#.##..#####.
    #######.#.###.###
    ##.###.##.#######
    #.#######....#...
    ##.#.#.##.#.###..
    #.###.#.#....#...
    #########........`,
}

/**
 * @typedef TileInfo
 * @prop {TileSheetName} sheet
 * @prop {string} [layerName] If different from the tile name
 * @prop {number} [frameIndex] If this is a non-animation tile
 * @prop {"animation"|"walls"|"variants"} [frameType]
 * @prop {WallRuleName} [wallRules]
 * @prop {boolean} [insubstantial] Whether Actors can pass through this tile, default false.
 *                                 Only matters for tiles that can go on the base tilemap, not for sprites.
 * @prop {boolean|"opaquefloor"} [transparent] Whether light passes through this tile.
 *                                             "opaquefloor" means light won't go from this tile to the next one down
 */

/** @satisfies {Record<string, TileInfo>} */
export const tileDefinitions = {
    PCfish: {
        sheet: "tiles1",
        frameType: "animation",
    },
    
    bigFish: {
        sheet: "tiles1",
        frameType: "animation"
    },

    toothFish: {
        sheet: "tiles1",
        frameType: "animation"
    },


    fish: {
        sheet: "tiles1",
        frameType: "animation",
    },
    
    crab: {
        sheet: "tiles1",
        frameType: "animation",
    },
    
    egg: {
        sheet: "tiles1",
        frameType: "animation",
    },
    
    weeds1: {
        sheet: "tiles1",
        frameType: "animation",
    },
    
    eel: {
        sheet: "tiles1",
        frameType: "animation",
    },
    
    bubble1: {
        sheet: "tiles1",
        frameType: "animation",
    },
    
    solidwall: {
        sheet: "walls",
        frameType: "walls",
        wallRules: "standard",
    },
    outlinedwall: {
        sheet: "walls",
        frameType: "walls",
        wallRules: "standard",
    },
    roughwall: {
        sheet: "walls",
        frameType: "walls",
        wallRules: "standard",
    },
    
    ground: {
        sheet: "props",
        frameType: "variants",
    },
    
    pottery: {
        sheet: "props",
        frameType: "variants",
    },
    
    litter: {
        sheet: "props",
        frameType: "variants",
    },

    geodeSoul: {
        sheet: "souls",
        layerName: "geode-soul",
    },
    cavitationSoul: {
        sheet: "souls",
        layerName: "cavitation-soul",
    },
    slimeSoul: {
        sheet: "souls",
        layerName: "slime-soul",
    },
    venomSoul: {
        sheet: "souls",
        layerName: "venom-soul",
    },
    dreadSoul: {
        sheet: "souls",
        layerName: "dread-soul",
    },
    spineSoul: {
        sheet: "souls",
        layerName: "spine-soul",
    },
    wiseSoul: {
        sheet: "souls",
        layerName: "wise-soul",
    },
    sightSoul: {
        sheet: "souls",
        layerName: "sight-soul",
    },
    mendingSoul: {
        sheet: "souls",
        layerName: "mending-soul",
    },
    sustenanceSoul: {
        sheet: "souls",
        layerName: "sustenance-soul",
    },
    deliciousSoul: {
        sheet: "souls",
        layerName: "delicious-soul",
    },
    disgustingSoul: {
        sheet: "souls",
        layerName: "disgusting-soul",
    },
    terrorSoul: {
        sheet: "souls",
        layerName: "terror-soul",
    },
    summonSoul: {
        sheet: "souls",
        layerName: "summon-soul",
    },
    sickSoul: {
        sheet: "souls",
        layerName: "sick-soul",
    },
    flashSoul: {
        sheet: "souls",
        layerName: "flash-soul",
    },
    wildSoul: {
        sheet: "souls",
        layerName: "wild-soul",
    },
    readySoul: {
        sheet: "souls",
        layerName: "ready-soul",
    },
    cleanSoul: {
        sheet: "souls",
        layerName: "clean-soul",
    },
    shuffleSoul: {
        sheet: "souls",
        layerName: "shuffle-soul",
    },

    emptyEgg: {
        sheet: "eggs",
    },
    flickeringEgg: {
        sheet: "eggs",
    },
    blinkingEgg: {
        sheet: "eggs",
    },
    writhingEgg: {
        sheet: "eggs",
    },
    mistyEgg: {
        sheet: "eggs",
    },
    buzzingEgg: {
        sheet: "eggs",
    },
    pouringEgg: {
        sheet: "eggs",
    },
    wavingEgg: {
        sheet: "eggs",
    },
    pacingEgg: {
        sheet: "eggs",
    },
    twitchingEgg: {
        sheet: "eggs",
    },
    boilingEgg: {
        sheet: "eggs",
    },
    twinklingEgg: {
        sheet: "eggs",
    },
    tidalEgg: {
        sheet: "eggs",
    },
    gleamingEgg: {
        sheet: "eggs",
    },
    pulsingEgg: {
        sheet: "eggs",
    },
    rollingEgg: {
        sheet: "eggs",
    },
    spinningEgg: {
        sheet: "eggs",
    },
    swirlingEgg: {
        sheet: "eggs",
    },
    fizzingEgg: {
        sheet: "eggs",
    },
    godFish: {
        sheet: "god",
        frameType: "animation"
    },
    stairs: {
        sheet: "stairs"
    }
}

/** @type {Record<TileName, TileInfo>} */
export const tiles = tileDefinitions;

/** @type {readonly TileName[]} */
export const soulTiles = typedEntries(tileDefinitions).flatMap((([k, v]) => (v.sheet === "souls" ? k : [])))
/** @type {readonly TileName[]} */
export const eggTiles = typedEntries(tileDefinitions).flatMap((([k, v]) => (v.sheet === "eggs" ? k : [])))

Object.assign(self, {wallRules, tiles, tileSheets})