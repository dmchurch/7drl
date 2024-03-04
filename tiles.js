

/** @satisfies {Record<string, string | [string, string]>} */
export const tileSheets = {
    tiles1: ["tiles-1", "tiles-1-dark"],
    walls: "tiles-walls",
    props: "tiles-props",
}

/** @satisfies {Record<string, WallRule[]>} */
export const wallRules = {
    standard: [
        "QWEASDZXC", // fully surrounded
        " weaSDzXC", // northwest corner
        "qw ASdZXc", // northeast corner
    ]
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

