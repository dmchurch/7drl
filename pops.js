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
 * @typedef ItemPopDefinition @prop {"item"} [type] @prop {ItemName} item
 * @typedef RolePopDefinition @prop {"role"} [type] @prop {RoleName} role
 * @typedef PopPopDefinition  @prop {"pop"}  [type] @prop {PopName} pop
 * 
 * @typedef {(PopDefinitionCommon & PickOnePopDefinition)
 *         | (PopDefinitionCommon & PickEachPopDefinition)
 *         | (PopDefinitionCommon & ItemPopDefinition)
 *         | (PopDefinitionCommon & RolePopDefinition)
 *         | (PopDefinitionCommon & PopPopDefinition)} PopDefinition
 */

const allPopNames = /** @type {const} */([
    "world",
    "sparseArea",
    "fishSchool",
    "crabGang",
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
/** @type {Record<PopName, PopDefinition>} */

export const pops = popDefinitions;