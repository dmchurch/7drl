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
    "sparseArea",
    "fishSchool",
    "crabGang",
    "junkyard",
    "commonSoul",
    "rareSoul",
]);

/** @satisfies {Record<PopName, PopDefinition>} */
export const popDefinitions = {
    world: {
        pickone: [
            { pop: "sparseArea", weight: 5 },
            { pop: "fishSchool", weight: 2 },
            { pop: "crabGang", weight: 1 },
        ]
    },
    crabGang: {
        role: "crab",
        count: [5, 10],
    },
    fishSchool: {
        role: "fish",
        count: [20, 30],
    },
    sparseArea: {
        pickeach: [
            { role: "crab", chance: [50, 10, 10] },
            { role: "fish", count: [2, 8] },
        ],
    },
    junkyard: {
        pickeach: [
            { role: "pottery", count: [2, 5] },
            { role: "litter", count: [20, 30] },
            { role: "ground", count: [20, 30] },
            { role: "weeds", count: [3, 7] },
        ],
    },
    commonSoul: {
        pickone: [
            { item: "sustenanceSoul", weight: 10 },
            { item: "deliciousSoul", weight: 1 },
            { item: "disgustingSoul", weight: 2 },
        ],
    },
    rareSoul: {
        pickone: [
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