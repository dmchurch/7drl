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
export const tiles = {
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
}

Object.assign(self, {wallRules, tiles, tileSheets})