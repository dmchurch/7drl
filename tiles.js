

/** @satisfies {Record<string, string | [string, string]>} */
export const tileSheets = {
    tiles1: ["tiles-1", "tiles-1-dark"],
    walls: "tiles-walls",
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
 * @prop {"animation"|"walls"} [frameType]
 * @prop {WallRuleName} [wallRules]
 */

/** @satisfies {Record<string, TileInfo>} */
export const tiles = {
    PCfish: {
        sheet: "tiles1",
        frameType: "animation",
    },
    solidwall: {
        sheet: "walls",
        frameType: "walls",
        wallRules: "standard",
    }
    roughwall: {
        sheet: "walls",
        frameType: "walls",
        wallRules: "standard",
}

/** @typedef {keyof typeof tileSheets} TileSheetName */
/** @typedef {keyof typeof wallRules} WallRuleName */
/** @typedef {keyof typeof tiles} TileName */
