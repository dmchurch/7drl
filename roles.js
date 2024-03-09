/**
 * @typedef RoleDefinition
 * @prop {TileName} spriteTile
 * @prop {number} [spriteFrame]
 * @prop {string} label
 * @prop {string} plural
 * @prop {number} [durability]
 * @prop {"creature"|"actor"|"player"|"decor"} [type]
 * @prop {string} [destroyMessage] 
 * @prop {boolean} [insubstantial]
 * @prop {string} [description]
 * @prop {number} [aggression] Percentage chance that this mob will approach the player if it moves
 * @prop {number} [bloodlust]  How much does aggression increase by every time the player attacks this mob? default 10
 * @prop {number} [distraction] Percentage chance that this mob will move randomly
 * @prop {number} [baseDamage] Base amount of damage this mob will do (default 1)
 * @prop {PopDefinition} [drops] What drops when this dies?
 * @prop {("onGround" | "inGround" | "touchingWall" | "onCeiling")[]} [spawnRestrictions]
 */

/** @satisfies {Record<string, RoleDefinition>} */
const roleDefinitions = {
    fish: {
        spriteTile: "fish",
        label: "A fish",
        plural: "fish",
        destroyMessage: "The fish dies!",
        durability: 2,
        aggression: 10,
        bloodlust: 5,
        distraction: 50,
        baseDamage: 1,
        drops: {
            pop: "commonSoul",
            chance: 5,
        }
    },
    crab: {
        spriteTile: "crab",
        label: "A crab",
        plural: "crabs",
        destroyMessage: "The crab dies!",
        durability: 8,
        aggression: 10,
        bloodlust: 15,
        distraction: 50,
        baseDamage: 1,
        drops: {
            pickone: [
                {pop: "commonSoul", weight: 95},
                {pop: "rareSoul", weight: 5},
            ],
            chance: 10,
        }
    },
    bigFish: {
        spriteTile: "bigFish",
        label: "A big fish",
        plural: "big fish",
        destroyMessage: "The big fish dies!",
        durability: 10,
        aggression: 10,
        bloodlust: 5,
        distraction: 50,
        baseDamage: 2,
        drops: {
            pickone: [
                {pop: "commonSoul", weight: 75},
                {pop: "rareSoul", weight: 25},
            ],
            chance: 15,
        }
    },
    toothFish: {
        spriteTile: "toothFish",
        label: "A toothy fish",
        plural: "toothy fish",
        destroyMessage: "The toothy fish dies!",
        durability: 5,
        aggression: 20,
        bloodlust: 20,
        distraction: 10,
        baseDamage: 3,
        drops: {
            pickone: [
                {pop: "commonSoul", weight: 50},
                {pop: "rareSoul", weight: 50},
            ],
            chance: 25,
        }
    },
    eel: {
        spriteTile: "fish",
        label: "An eel",
        plural: "eel",
        destroyMessage: "The eel dies!",
        durability: 5,
        aggression: 10,
        bloodlust: 25,
        distraction: 10,
        baseDamage: 1,
        drops: {
            pop: "commonSoul",
            chance: 15,
        }
    },

    godFish: {
        spriteTile: "godFish",
        label: "Godfish",
        plural: "Godfish",
        destroyMessage: "You devour God!",
        durability: 40,
        aggression: 100,
        bloodlust: 100,
        distraction: 5,
        baseDamage: 5
    },

    player: {
        spriteTile: "PCfish",
        label: "You",
        plural: "instances of you",
        type: "player",
    },

    weeds: {
        spriteTile: "weeds1",
        label: "Weeds",
        plural: "clumps of weeds",
        type: "decor",
        insubstantial: true,
        spawnRestrictions: ["onGround"],
    },

    ground: {
        spriteTile: "ground",
        label: "",
        plural: "",
        type: "decor",
        insubstantial: true,
        spawnRestrictions: ["onGround"],
    },

    pottery: {
        spriteTile: "pottery",
        label: "Some pottery",
        plural: "piles of pottery",
        type: "decor",
        durability: 1,
        spawnRestrictions: ["onGround"],
        drops: {
            pickone: [
                {pop: "commonSoul", weight: 70},
                {pop: "rareSoul", weight: 30},
            ],
            chance: 25,
        }
    },

    litter: {
        spriteTile: "litter",
        label: "Some litter",
        plural: "heaps of trash",
        type: "decor",
        insubstantial: true,
        spawnRestrictions: ["onGround"],
    }
};

/** @typedef {keyof typeof roleDefinitions} RoleName */

/** @type {Record<RoleName, RoleDefinition>} */
export const roles = roleDefinitions;

Object.assign(self, {roles});