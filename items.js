// text snippet constants
const bEggining = "An egg containing one of the innumerable souls of Abyssal Gods past."
const justYolks = "Within this egg sits the soul of a lowly godlet consumed by the abyss."

/**
 * @typedef ItemDefinition
 * @prop {TileName} spriteTile
 * @prop {number} [spriteFrame]
 * @prop {string} label
 * @prop {string} plural
 * @prop {string} [description]
 * @prop {string} [effect]
 * @prop {string} [message]
 * @prop {boolean} [equippable]
 */

/** @satisfies {Record<string, ItemDefinition>} */
export const itemDefinitions = {
    geodeSoul: {
        spriteTile: "geodeSoul",
        label: "A geode soul",
        plural: "geode souls",
        description: `${bEggining} This glittering stone, an egg within an egg, is a memory of when God was cold and crystalline, when she bore the name Sah-fet.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        message: "You begin to transform.",
        equippable: true,
    },
    cavitationSoul: {
        spriteTile: "cavitationSoul",
        label: "A cavitation soul",
        plural: "cavitation souls",
        description: `${bEggining} This warped bubble of nothingness, this cracking void, is a memory of when God was the killing force of emptiness, and we called it Mantis.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        equippable: true,
    },
    slimeSoul: {
        spriteTile: "slimeSoul",
        label: "A slime soul",
        plural: "slime souls",
        description: `${bEggining} The wad of dripping mucus floating within is a memory of when God was amorphous and bade us be slow, when he was named Cyclost.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        equippable: true,
    },
    Soul: {
        spriteTile: "venomSoul",
        label: "A venom soul",
        plural: "venom souls",
        description: `${bEggining} This syrupy draught that burns the tongue and stops the heart is a memory of when God was a bringer of slow death, and we called it Iruk.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        equippable: true,
    },
    dreadSoul: {
        spriteTile: "dreadSoul",
        label: "A dread soul",
        plural: "dread souls",
        description: `${bEggining} Something within stares back: the memory of when God was every fear we knew, and he named himself Pit.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        equippable: true,
    },
    spineSoul: {
        spriteTile: "spineSoul",
        label: "A spine soul",
        plural: "spine souls",
        description: `${bEggining} Spines floating within gleam with the memory of when God was a vengeful impaler, and she took the name Xeka.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        equippable: true,
    },
    wiseSoul: {
        spriteTile: "wiseSoul",
        label: "A wise soul",
        plural: "wise souls",
        description: `${bEggining} Taking the shape of a crystalline disc set in a chained ring of gold, this memory is of God's wisdom, their remaining insight from the time when they were named Index.`,
        effect: "Upon consumption, identifies a soul.",
        equippable: false,
    },
    sightSoul: {
        spriteTile: "sightSoul",
        label: "A sight soul",
        plural: "sight souls",
        description: `${bEggining} The unblinking eye within stares, pulling you into the memory of when God was all-seeing and we knew no peace, calling him Aiel.`,
        effect: "Upon consumption, increases your sight radius.",
        equippable: false,
    },
    mendingSoul: {
        spriteTile: "mendingSoul",
        label: "A mending soul",
        plural: "mending souls",
        description: `${bEggining} The two-sided capsule of this soul is the twin memory of when God was nature and nurture, kindly guardians Vel and Daut.`,
        effect: "Upon consumption, heals you.",
        equippable: false,
    },
    sustenanceSoul: {
        spriteTile: "sustenanceSoul",
        label: "A sustenance soul",
        plural: "sustenance souls",
        description: `${justYolks} Their name, like the meager satiety they provide, was too easily forgotten.`,
        effect: "Upon consumption, reduces your hunger somewhat.",
        equippable: false,
    },
    deliciousSoul: {
        spriteTile: "sustenanceSoul",
        label: "A sustenance soul",
        plural: "sustenance souls",
        description: `${justYolks} Their name is forgotten, but the sweet virtuous fruit of their life remains.`,
        effect: "Upon consumption, reduces your hunger a lot and heals you.",
        equippable: false,
    },
    disgustingSoul: {
        spriteTile: "disgustingSoul",
        label: "A disgusting soul",
        plural: "disgusting souls",
        description: `${justYolks} Rank betrayal plagued this soul's life, souring it terribly.`,
        effect: "Upon consumption, reduces your hunger somewhat but poisons you.",
        equippable: false,
    },
    terrorSoul: {
        spriteTile: "terrorSoul",
        label: "A terror soul",
        plural: "terror souls",
        description: `${bEggining} Within, a ghastly vision glares: the lingering rage-memory of when God was the tyrant named Zanback.`,
        effect: "Upon consumption, terrifies all who behold you.",
        equippable: false,
    },
    summonSoul: {
        spriteTile: "summonSoul",
        label: "A summon soul",
        plural: "summon souls",
        description: `${bEggining} Pinpoint eyes from the depths evoke the memory of when God was the school itself, innumerable bodies together named We.`,
        effect: "Upon consumption, summons hostile mobs.",
        equippable: false,
    },
    sickSoul: {
        spriteTile: "sickSoul",
        label: "A sick soul",
        plural: "sicks souls",
        description: `${justYolks} God is not always brought low by its successor. Some fall prey to the very smallest fish, too small to possess ambition, and so they rot in the deep.`,
        effect: "Upon consumption, poisons all who behold you.",
        equippable: false,
    },
    flashSoul: {
        spriteTile: "terrorSoul",
        label: "A terror soul",
        plural: "terror souls",
        description: `${bEggining} Dazzling and brief is the memory of when God was the most bright. May we remember its name tomorrow.`,
        effect: "Upon consumption, stuns all who behold you.",
        equippable: false,
    },
    cleanSoul: {
        spriteTile: "cleanSoul",
        label: "A clean soul",
        plural: "clean souls",
        description: `${bEggining} Intangible shine glitters, the memory of the God who undid what had been done, who made whole too much, who we called Catrolzy.`,
        effect: "Upon consumption, returns your body to its base form, returning equipped souls as eggs.",
        equippable: false,
    },
    shuffleSoul: {
        spriteTile: "shuffleSoul",
        label: "A shuffle soul",
        plural: "shuffle souls",
        description: `${bEggining} The discordant, pulsing colors within form the memory of when God was raw chaos, when God refused every name or claimed all of them.`,
        effect: "Upon consumption, all of your transformed limbs change to a random other form.",
        equippable: false,
    },
}

/** @typedef {keyof typeof itemDefinitions} ItemName */

/**
 * @typedef EquipmentDefinition
 * @prop {string} label
 * @prop {string} [description]
 */

/** @satisfies {Partial<Record<ItemName, Partial<Record<StatName, EquipmentDefinition>>>>} */
export const equipmentDefinitions = {
    geodeSoul: {
        head: {
            label: "Geode maw",
            description: "There's a glint of color from the dark. Two rows of seaglass knives open to devour the very caves.",
        },
    }
}

/** @type {Record<string, ItemDefinition>} */
export const items = itemDefinitions;
/** @type {Partial<Record<ItemName, Partial<Record<StatName, EquipmentDefinition>>>>} */
export const equipment = equipmentDefinitions;

Object.assign(self, {items, equipment});