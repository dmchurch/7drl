/**
 * @typedef RoleDefinition
 * @prop {TileName} spriteTile
 * @prop {number} [spriteFrame]
 * @prop {string} label
 * @prop {string} plural
 * @prop {"creature"|"actor"|"player"} [type]
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
        drops: {
            pop: "commonSoul",
            chance: 50,
        }
    },
    crab: {
        spriteTile: "crab",
        label: "A crab",
        plural: "crabs",
        aggression: 30,
        distraction: 5,
        drops: {
            pickeach: [
                {pop: "commonSoul", chance: 95},
                {pop: "rareSoul", chance: 5},
            ],
        }
    },
    bigFish: {
        spriteTile: "bigFish",
        label: "A big fish",
        plural: "big fish",
        aggression: 30,
        distraction: 15,
        drops: {
            pickeach: [
                {pop: "commonSoul", chance: 75},
                {pop: "rareSoul", chance: 25},
            ],
        }
    },
    toothFish: {
        spriteTile: "toothFish",
        label: "A toothy fish",
        plural: "toothy fish",
        aggression: 75,
        distraction: 5,
        drops: {
            pickeach: [
                {pop: "commonSoul", chance: 50},
                {pop: "rareSoul", chance: 50},
            ],
        }
    },
    player: {
        spriteTile: "PCfish",
        label: "You",
        plural: "instances of you",
        type: "player",
    }
};

/** @typedef {keyof typeof roleDefinitions} RoleName */

/** @type {Record<RoleName, RoleDefinition>} */
export const roles = roleDefinitions;

Object.assign(self, {roles});