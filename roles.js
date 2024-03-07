/**
 * @typedef RoleDefinition
 * @prop {TileName} spriteTile
 * @prop {number} [spriteFrame]
 * @prop {string} label
 * @prop {string} plural
 * @prop {string} [description]
 */

/** @satisfies {Record<string, RoleDefinition>} */
const roleDefinitions = {
    fish: {
        spriteTile: "fish",
        label: "A fish",
        plural: "fish",
    },
    crab: {
        spriteTile: "crab",
        label: "A crab",
        plural: "crabs",
    },
    player: {
        spriteTile: "PCfish",
        label: "You",
        plural: "instances of you",
    }
};

/** @typedef {keyof typeof roleDefinitions} RoleName */

/** @type {Record<RoleName, RoleDefinition>} */
export const roles = roleDefinitions;

Object.assign(self, {roles});