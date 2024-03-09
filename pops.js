/**
 * @typedef PopDefinitionCommon
 * @prop {number|[number,number]} [count=1] How many times should this get generated?
 *                                          Pair = inclusive range [min, max]
 * @prop {number|number[]}     [chance=100] What is the chance this gets generated?
 *                                          Multiple numbers = chance for multiple instances, times count
 * 
 * @typedef PickOnePopDefinition
 * @prop {"pickone"} [type]
 * @prop {(PopDefinition & {weight: number})[]} pickone
 * 
 * @typedef PickEachPopDefinition
 * @prop {"pickeach"} [type]
 * @prop {PopDefinition[]} pickeach
 * 
 * @typedef ItemPopDefinition @prop {"item"} [type] @prop {ItemName} item @prop {Record<string, any>} [overrides]
 * @typedef RolePopDefinition @prop {"role"} [type] @prop {RoleName} role @prop {Record<string, any>} [overrides]
 * @typedef PopPopDefinition  @prop {"pop"}  [type] @prop {PopName} pop
 * 
 * @typedef {(PopDefinitionCommon & PickOnePopDefinition)
 *         | (PopDefinitionCommon & PickEachPopDefinition)
 *         | (PopDefinitionCommon & ItemPopDefinition)
 *         | (PopDefinitionCommon & RolePopDefinition)
 *         | (PopDefinitionCommon & PopPopDefinition)} PopDefinition
 */

/** @satisfies {PopDefinition["type"][]} */
const popTypes = /** @type {const} */([
    "pickone",
    "pickeach",
    "item",
    "role",
    "pop",
])

const allPopNames = /** @type {const} */([
    "world",
    "easyPlace",
    "mediumPlace",
    "hardPlace",
    "sparseArea",
    "fishSchool",
    "crabGang",
    "horribleZone",
    "junkyard",
    "commonSoul",
    "rareSoul",
]);

/** @satisfies {Record<PopName, PopDefinition>} */
export const popDefinitions = {
    world: {
        pickone: [
            { pop: "sparseArea", weight: 10 },
            { pop: "fishSchool", weight: 4 },
            { pop: "crabGang", weight: 3 },
            { pop: "horribleZone", weight: 1}
        ]
    },
    easyPlace: {
        chance: [50, 10, 10, 5, 5, 5],
        pickone: [
            { pop: "sparseArea", count: [1, 2], weight: 10},
            { pop: "fishSchool", count: [1, 2], weight: 6},
            { pop: "crabGang", weight: 5},
            { pop: "horribleZone", chance: 1, weight: 1},
        ]
    },
    mediumPlace: {
        pickeach: [
            { pop: "sparseArea", count: [1, 2]},
            { pop: "fishSchool", count: [0, 4]},
            { pop: "crabGang", count: [0, 3]},
            { pop: "horribleZone", chance: [50, 5, 1, 1]}
        ]
   },
   hardPlace: {
       pickeach: [
       { pop: "sparseArea", count: [2, 4]},
       { pop: "fishSchool", count: [1, 5]},
       { pop: "crabGang", count: [1, 3]},
       { pop: "horribleZone", count: [1, 4]}
       ]
   },
    horribleZone: {
        pickeach: [
        { role: "toothFish", chance: [100, 25, 5] },
        { role: "eel", count: [4, 12]}
        ]
    },
    crabGang: {
        role: "crab",
        count: [3, 10],
    },
    fishSchool: {
        pickeach: [
            { role: "fish", count: [2, 5]},
            { role: "bigFish", chance: [5, 1]}
        ]
    },
    sparseArea: {
        pickeach: [
            { role: "crab", chance: [50, 10, 10] },
            { role: "eel", chance: 10 },
            { role: "bigFish", chance: 5},
            { role: "fish", count: [1, 6] },
        ],
    
    },
    junkyard: {
        pickeach: [
            { role: "pottery", count: [2, 5] },
            { role: "litter", count: [10, 20] },
            { role: "ground", count: [20, 30] },
            { role: "weeds", count: [3, 7] },
        ],
    },
    commonSoul: {
        pickone: [
            { item: "sustenanceSoul", weight: 50 },
            { item: "deliciousSoul", weight: 3 },
            { item: "disgustingSoul", weight: 5 },
            { item: "mendingSoul", weight: 2},
            { pop: "rareSoul", weight: 1}
        ],
    },
    rareSoul: {
        pickone: [
            { item: "geodeSoul", weight: 10},
            { item: "cavitationSoul", weight: 10},
            { item: "slimeSoul", weight: 10},
            { item: "venomSoul", weight: 10},
            { item: "dreadSoul", weight: 10},
            { item: "spineSoul", weight: 10},
            { item: "mendingSoul", weight: 20}
        ],
    },
};

/** @typedef {typeof allPopNames[number]} PopName */

/** @param {PopDefinition} popDef */
export function fixPopDefinition(popDef) {
    for (const type of popTypes) {
        if (type in popDef) {
            popDef.type = type;
            if (type === "pickeach" || type === "pickone") {
                popDef[type].forEach(fixPopDefinition);
            }
            break;
        }
    }
    return /** @type {Required<PopDefinition>} */(popDef);
}

import { mapEntries } from "./helpers.js";
/** @type {Record<PopName, Required<PopDefinition>>} */
export const pops = mapEntries(popDefinitions, fixPopDefinition);