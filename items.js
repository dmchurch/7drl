// text snippet constants
const bEggining = "An egg containing one of the innumerable souls of Abyssal Gods past."
const justYolks = "Within this egg sits the soul of a lowly godlet consumed by the abyss."
const transmEggrify = "You feel your body changing."

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
        message: transmEggrify,
        equippable: true,
    },
    cavitationSoul: {
        spriteTile: "cavitationSoul",
        label: "A cavitation soul",
        plural: "cavitation souls",
        description: `${bEggining} This warped bubble of nothingness, this cracking void, is a memory of when God was the killing force of emptiness, and we called it Mantis.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        message: transmEggrify,
        equippable: true,
    },
    slimeSoul: {
        spriteTile: "slimeSoul",
        label: "A slime soul",
        plural: "slime souls",
        description: `${bEggining} The wad of dripping mucus floating within is a memory of when God was amorphous and bade us be slow, when he was named Cyclost.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        message: transmEggrify,
        equippable: true,
    },
    venomSoul: {
        spriteTile: "venomSoul",
        label: "A venom soul",
        plural: "venom souls",
        description: `${bEggining} This syrupy draught that burns the tongue and stops the heart is a memory of when God was a bringer of slow death, and we called it Iruka.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        message: transmEggrify,
        equippable: true,
    },
    dreadSoul: {
        spriteTile: "dreadSoul",
        label: "A dread soul",
        plural: "dread souls",
        description: `${bEggining} Something within stares back: the memory of when God was every fear we knew, and he named himself Pit.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        message: transmEggrify,
        equippable: true,
    },
    spineSoul: {
        spriteTile: "spineSoul",
        label: "A spine soul",
        plural: "spine souls",
        description: `${bEggining} Spines floating within gleam with the memory of when God was a vengeful impaler, and she took the name Xeka.`,
        effect: "Upon consumption, transforms the body part of your choice.",
        message: transmEggrify,
        equippable: true,
    },
    wiseSoul: {
        spriteTile: "wiseSoul",
        label: "A wise soul",
        plural: "wise souls",
        description: `${bEggining} Taking the shape of a crystalline disc set in a chained ring of gold, this memory is of God's wisdom, their remaining insight from the time when they were named Index.`,
        effect: "Upon consumption, identifies a soul.",
         message: "Ancient knowledge flashes through your mind and you grasp for a scrap of it.",
        equippable: false,
    },
    sightSoul: {
        spriteTile: "sightSoul",
        label: "A sight soul",
        plural: "sight souls",
        description: `${bEggining} The unblinking eye within stares, pulling you into the memory of when God was all-seeing and we knew no peace, calling him Aiel.`,
        effect: "Upon consumption, increases your sight radius.",
        message: "Ancient knowledge flashes through your mind, and you grasp for meaning.",
        equippable: false,
    },
    mendingSoul: {
        spriteTile: "mendingSoul",
        label: "A mending soul",
        plural: "mending souls",
        description: `${bEggining} The two-sided capsule of this soul is the twin memory of when God was nature and nurture, kindly guardians Vel and Daut.`,
        effect: "Upon consumption, heals you.",
        message: "The warm heat of ancient love flows through you.",
        equippable: false,
    },
    sustenanceSoul: {
        spriteTile: "sustenanceSoul",
        label: "A sustenance soul",
        plural: "sustenance souls",
        description: `${justYolks} Their name, like the meager satiety they provide, was too easily forgotten.`,
        effect: "Upon consumption, reduces your hunger somewhat.",
        message: "The meal was adequate.",
        equippable: false,
    },
    deliciousSoul: {
        spriteTile: "sustenanceSoul",
        label: "A sustenance soul",
        plural: "sustenance souls",
        description: `${justYolks} Their name is forgotten, but the sweet virtuous fruit of their life remains.`,
        effect: "Upon consumption, reduces your hunger a lot and heals you.",
        message: "Delicious!",
        equippable: false,
    },
    disgustingSoul: {
        spriteTile: "disgustingSoul",
        label: "A disgusting soul",
        plural: "disgusting souls",
        description: `${justYolks} Rank betrayal plagued this soul's life, souring it terribly.`,
        effect: "Upon consumption, reduces your hunger somewhat but poisons you.",
        message: "You feel less hungry, but the accompanying nausea brings some regret.",
        equippable: false,
    },
    terrorSoul: {
        spriteTile: "terrorSoul",
        label: "A terror soul",
        plural: "terror souls",
        description: `${bEggining} Within, a ghastly vision glares: the lingering rage-memory of when God was the tyrant named Zanback.`,
        effect: "Upon consumption, terrifies all who behold you.",
        message: "Eons of rage pour across the veil for a terrible moment.",
        equippable: false,
    },
    summonSoul: {
        spriteTile: "summonSoul",
        label: "A summon soul",
        plural: "summon souls",
        description: `${bEggining} Pinpoint eyes from the depths evoke the memory of when God was the school itself, innumerable bodies together named We.`,
        effect: "Upon consumption, summons hostile mobs.",
        message: "You ring the dinner bell.",
        equippable: false,
    },
    sickSoul: {
        spriteTile: "sickSoul",
        label: "A sick soul",
        plural: "sicks souls",
        description: `${justYolks} God is not always brought low by its successor. Some fall prey to the very smallest fish, too small to possess ambition, and so they rot in the deep.`,
        effect: "Upon consumption, poisons all who behold you.",
        message: "Vile miasma clouds the water.",
        equippable: false,
    },
    flashSoul: {
        spriteTile: "terrorSoul",
        label: "A terror soul",
        plural: "terror souls",
        description: `${bEggining} Dazzling and brief is the memory of when God was the most bright. May we remember its name tomorrow.`,
        effect: "Upon consumption, stuns all who behold you.",
        message: "Divine billiance halts your foes!",
        equippable: false,
    },
    cleanSoul: {
        spriteTile: "cleanSoul",
        label: "A clean soul",
        plural: "clean souls",
        description: `${bEggining} Intangible shine glitters, the memory of the God who undid what had been done, who made whole too much, who we called Catrolzy.`,
        effect: "Upon consumption, returns your body to its base form, returning equipped souls as eggs.",
        message: "Undone.",
        equippable: false,
    },
    shuffleSoul: {
        spriteTile: "shuffleSoul",
        label: "A shuffle soul",
        plural: "shuffle souls",
        description: `${bEggining} The discordant, pulsing colors within form the memory of when God was raw chaos, when God refused every name or claimed all of them.`,
        effect: "Upon consumption, all of your transformed limbs change to a random other form.",
        message: "Your body wrenches into new shapes!",
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
        dorsal: {
            label: "Geode backfin",
            description: "Crystal outcroppings glow with hissing light.",
        },
        belly: {
            label: "Geode belly",
            description: "Oh, how you shine! Beacon in the dark, beware.",
        },
        fins: {
            label: "Geode fins",
            description: "Glittering fans of crystal break the light into glitterdust.",
        },
        tail: {
            label: "Geode tail",
            description: "A crystal sickle slices through the water and light alike, leaving blades of sharp color behind.", 
        },
    },
    cavitationSoul: {
        head: {
            label: "Cavitation maw",
            description: "Cartilage latches hold a spring-loaded guillotine ready to snap down with stunning force."
        },
        dorsal: {
            label: "Cavitation backfin",
            description: "Rigid plates articulate to form a pair of supersonic cymbals that don't have to enclose prey to hurt them."
        },
        belly: {
            label: "Cavitation belly",
            description: "Stretchy skin and strong lungs can apply surprising force to would-be attackers."
        },
        fins: {
            label: "Cavitation fins",
            description: "The stretchy membrane and flexible cartilage of your lateral fins can hold tremendous tension... and release it all at once."
        },
        tail: {
            label: "Cavitation tail",
            description: "Cartilaginous tension snaps you through the water at terrible speed, and woe betide anything behind you."
        },
    },
    slimeSoul: {
        head: {
            label: "Slime maw",
            description: "Soft, suffocating, toothless death."
        },
        dorsal: {
            label: "Slime backfin",
            description: "From a surge of back muscle, a clump of mucus is poised to be propelled at deadly speeds."
        },
        belly: {
            label: "Slime belly",
            description: "A soft, squishy body provides little purchase for fang and claw."
        },
        fins: {
            label: "Slime fins",
            description: "From pressurized glands, expanding slime fills your surroundings."
        },
        tail: {
            label: "Slime tail",
            description: "Radial tentacles explore the water at a more ponderous pace, but more hands bring greater safety."
        },
    },
    venomSoul: {
        head: {
            label: "Venom maw",
            description: "Slick needlepoints deliver a final gift."
        },
        dorsal: {
            label: "Venom backfin",
            description: "Mottled spines loosen in their sockets and prepare to let fly."
        },
        belly: {
            label: "Venom belly",
            description: "Skin like an oil slick, impenetrable and permanent."
        },
        fins: {
            label: "Venom fins",
            description: "Even a scratch from these thin needles takes its toll."
        },
        tail: {
            label: "Venom tail",
            description: "A singular syringe of a spine packed with venom invites sneak-attackers."
        },
    },
    dreadSoul: {
        head: {
            label: "Dread maw",
            description: "Spikes from drawn flesh and staring eyes form a striking final vision."
        },
        dorsal: {
            label: "Dread backfin",
            description: "A quiver full of barbed bolts provides little stability but makes a strong impression."
        },
        belly: {
            label: "Dread belly",
            description: "You are unpleasant to approach."
        },
        fins: {
            label: "Dread fins",
            description: "Curling digits clutch a numbing venom within themselves."
        },
        tail: {
            label: "Dread tail",
            description: "Lumpy channels excrete a sooty liquid from limp fins."
        },
    },
    spineSoul: {
        head: {
            label: "Spine Maw",
            description: "Each black spike on each row is a strong cone tapering to a point of microscopic sharpness."
        },
        dorsal: {
            label: "Spine backfin",
            description: "You bristle with a coat of ready menace."
        },
        belly: {
            label: "Spine belly",
            description: "Your prickly hide gifts your assailants with quick regret."
        },
        fins: {
            label: "Spine fins",
            description: "A mere shake of your fins looses a needle-sharp perimeter."
        },
        tail: {
            label: "Spine tail",
            description: "The loose burs of your tail can be expelled with a strong shake, menacing any who would dare give chase."
        },
    }
}

/** @type {Record<string, ItemDefinition>} */
export const items = itemDefinitions;
/** @type {Partial<Record<ItemName, Partial<Record<StatName, EquipmentDefinition>>>>} */
export const equipment = equipmentDefinitions;

Object.assign(self, {items, equipment});