import { WallRule } from "./walls.js"


/** @satisfies {Record<string, string | [string, string]>} */
export const tileSheets = {
    tiles1: ["tiles-1", "tiles-1-dark"],
    walls: "tiles-walls",
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
    standard: WallRule.new`O QECZWDXA o qeczwdxa tgfr ↑→↓← 12
    .................................
    ....QWE.......↑......QE..........
    ....AOD..o...QwE.....Z#E.....#1#.
    ....ZXC.....QqOeE.....ZC.....2.2.
    ........↑..←aOOOd→........↑..#1#.
    ..↑....Qt→..ZzOcC...←1→..←#→.....
    .←rE..←fC....ZxC...↑......↓......
    ..Zg→..↓......↓....2..QE.........
    ...↓...............↓.Q#C.........
    .....................ZC..........
    `, 
}

/**
 * @typedef TileInfo
 * @prop {TileSheetName} sheet
 * @prop {string} [layerName] If different from the tile name
 * @prop {number} [frameIndex] If this is a non-animation tile
 * @prop {"animation"|"walls"|"variants"} [frameType]
 * @prop {WallRuleName} [wallRules]
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