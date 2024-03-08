/**
 * @typedef RoleDefinition
 * @prop {TileName} spriteTile
 * @prop {number} [spriteFrame]
 * @prop {string} label
 * @prop {string} plural
 * @prop {string} [description]
 * @prop {number} [aggression] Percentage chance that this mob will approach the player if it moves
 * @prop {number} [distraction] Percentage chance that this mob will move randomly
 * @prop {number} [baseDamage] Base amount of damage this mob will do (default 1)
 * @prop {PopDefinition} [drops] What drops when this dies?
 */

/** @satisfies {Record<string, RoleDefinition>} */
const roleDefinitions = {
    fish: {
        spriteTile: "fish",
        label: "A fish",
        plural: "fish",
        aggression: 10,
        distraction: 50,
    },
    crab: {
        spriteTile: "crab",
        label: "A crab",
        plural: "crabs",
        aggression: 30,
        distraction: 5,
        drops: {
            pop: "commonSoul",
        }
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