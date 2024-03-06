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
 */

/** @satisfies {Record<string, TileInfo>} */
export const tileDefinitions = {
    PCfish: {
        sheet: "tiles1",
        frameType: "animation",
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
}

/** @type {Record<TileName, TileInfo>} */
export const tiles = tileDefinitions;

Object.assign(self, {wallRules, tiles, tileSheets})