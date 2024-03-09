// text snippet constants
const bEggining = "An egg containing one of the innumerable souls of Abyssal Gods past."
const justYolks = "Within this egg sits the soul of a lowly godlet consumed by the abyss."
const transmEggrify = "You feel your body changing."
const transformDescription = "Upon consumption, transforms a random body part.";
const eggDescription = ""
const eggMessage = "You eagerly bite into the egg."
const discoveryMessage = "It is {indefinite}!";
export const winMessage = "Deiphage, you have fulfilled your quest. As your jaws wrench divine life from the God once called Yendor, you are suffused with holy power. Your descent complete, you now settle in to wait the centuries until your devourer arrives...";

/**
 * @typedef ItemDefinitionCommon
 * @prop {TileName} spriteTile
 * @prop {number} [spriteFrame]
 * @prop {string} label
 * @prop {string} plural
 * @prop {string} [description]
 * @prop {string} [effect]
 * @prop {string} [message]
 * @prop {string} [discoveryMessage]
 * 
 * @typedef ItemDefinitionEquipment
 * @prop {true} equippable
 * @prop {ItemBehavior|ItemBehavior[]} [equipBehavior]
 * 
 * @typedef ItemDefinitionConsumable
 * @prop {false} [equippable]
 * @prop {ItemBehavior|ItemBehavior[]} behavior
 * 
 * @typedef {ItemDefinitionCommon & ItemDefinitionEquipment} EquippableItemDefinition
 * @typedef {ItemDefinitionCommon & ItemDefinitionConsumable} ConsumableItemDefinition
 * 
 * @typedef {EquippableItemDefinition | ConsumableItemDefinition} ItemDefinition
 */

/** @param {ItemDefinition} itemDef @returns {itemDef is EquippableItemDefinition} */
export function isEquippableItemDefinition(itemDef) {
    return itemDef.equippable;
}
/** @param {ItemDefinition} itemDef @returns {itemDef is ConsumableItemDefinition} */
export function isConsumableItemDefinition(itemDef) {
    return !itemDef.equippable;
}

export const voidItemEffects = /** @type {const} */([
    "identify",
    "poison",
    "stun",
    "fear",
    "clean",
    "shuffle",
    "egg",
]);
export const numericItemEffects = /** @type {const} */([
    "sight",
    "health",
    "satiety",
    "summon",
]);
export const metaItemEffects = /** @type {const} */([
    "burst",
]);

/** @returns {name is VoidItemEffectName} */
export function isVoidEffectName(name) {
    return voidItemEffects.includes(name);
}
/** @returns {name is NumericItemEffectName} */
export function isNumericEffectName(name) {
    return numericItemEffects.includes(name);
}
/** @returns {name is MetaItemEffectName} */
export function isMetaEffectName(name) {
    return metaItemEffects.includes(name);
}

// default values for the void behaviors
const identify = true;
const poison = true;
const stun = true;
const fear = true;
const clean = true;
const shuffle = true;
const egg = true;

/** @satisfies {Record<string, ItemDefinition>} */
export const itemDefinitions = /** @type {const} */({
    geodeSoul: {
        spriteTile: "geodeSoul",
        label: "A geode soul",
        plural: "geode souls",
        description: `${bEggining} This glittering stone, an egg within an egg, is a memory of when God was cold and crystalline, when she bore the name Sah-fet.`,
        effect: transformDescription,
        message: transmEggrify,
        discoveryMessage,
        equippable: true,
    },
    cavitationSoul: {
        spriteTile: "cavitationSoul",
        label: "A cavitation soul",
        plural: "cavitation souls",
        description: `${bEggining} This warped bubble of nothingness, this cracking void, is a memory of when God was the killing force of emptiness, and we called it Mantis.`,
        effect: transformDescription,
        message: transmEggrify,
        discoveryMessage,
        equippable: true,
    },
    slimeSoul: {
        spriteTile: "slimeSoul",
        label: "A slime soul",
        plural: "slime souls",
        description: `${bEggining} The wad of dripping mucus floating within is a memory of when God was amorphous and bade us be slow, when he was named Cyclost.`,
        effect: transformDescription,
        message: transmEggrify,
        discoveryMessage,
        equippable: true,
    },
    venomSoul: {
        spriteTile: "venomSoul",
        label: "A venom soul",
        plural: "venom souls",
        description: `${bEggining} This syrupy draught that burns the tongue and stops the heart is a memory of when God was a bringer of slow death, and we called it Iruka.`,
        effect: transformDescription,
        message: transmEggrify,
        discoveryMessage,
        equippable: true,
    },
    dreadSoul: {
        spriteTile: "dreadSoul",
        label: "A dread soul",
        plural: "dread souls",
        description: `${bEggining} Something within stares back: the memory of when God was every fear we knew, and he named himself Pit.`,
        effect: transformDescription,
        message: transmEggrify,
        discoveryMessage,
        equippable: true,
    },
    spineSoul: {
        spriteTile: "spineSoul",
        label: "A spine soul",
        plural: "spine souls",
        description: `${bEggining} Spines floating within gleam with the memory of when God was a vengeful impaler, and she took the name Xeka.`,
        effect: transformDescription,
        message: transmEggrify,
        discoveryMessage,
        equippable: true,
    },
    wiseSoul: {
        spriteTile: "wiseSoul",
        label: "A wise soul",
        plural: "wise souls",
        description: `${bEggining} Taking the shape of a crystalline disc set in a chained ring of gold, this memory is of God's wisdom, their remaining insight from the time when they were named Index.`,
        effect: "Upon consumption, identifies a soul.",
        message: "Ancient knowledge flashes through your mind and you grasp for a scrap of it.",
        discoveryMessage,
        behavior: {identify},
    },
    sightSoul: {
        spriteTile: "sightSoul",
        label: "A sight soul",
        plural: "sight souls",
        description: `${bEggining} The unblinking eye within stares, pulling you into the memory of when God was all-seeing and we knew no peace, calling him Aiel.`,
        effect: "Upon consumption, increases your sight radius.",
        message: "Ancient knowledge flashes through your mind, and you grasp for meaning.",
        discoveryMessage,
        behavior: {sight: 2},
    },
    mendingSoul: {
        spriteTile: "mendingSoul",
        label: "A mending soul",
        plural: "mending souls",
        description: `${bEggining} The two-sided capsule of this soul is the twin memory of when God was nature and nurture, kindly guardians Vel and Daut.`,
        effect: "Upon consumption, heals you.",
        message: "The warm heat of ancient love flows through you.",
        discoveryMessage,
        behavior: {health: 5},
    },
    sustenanceSoul: {
        spriteTile: "sustenanceSoul",
        label: "A sustenance soul",
        plural: "sustenance souls",
        description: `${justYolks} Their name, like the meager satiety they provide, was too easily forgotten.`,
        effect: "Upon consumption, reduces your satiety somewhat.",
        message: "The meal was adequate.",
        discoveryMessage: "",
        behavior: {satiety: 200},
    },
    deliciousSoul: {
        spriteTile: "deliciousSoul",
        label: "A delicious soul",
        plural: "delicious souls",
        description: `${justYolks} Their name is forgotten, but the sweet virtuous fruit of their life remains.`,
        effect: "Upon consumption, reduces your satiety a lot and heals you.",
        message: "Delicious!",
        discoveryMessage: "It is delicious.",
        behavior: {satiety: 500, health: 2},
    },
    disgustingSoul: {
        spriteTile: "disgustingSoul",
        label: "A disgusting soul",
        plural: "disgusting souls",
        description: `${justYolks} Rank betrayal plagued this soul's life, souring it terribly.`,
        effect: "Upon consumption, reduces your satiety somewhat but poisons you.",
        message: "You feel less hungry, but the accompanying nausea brings some regret.",
        discoveryMessage: "You immediately wish you hadn't.",
        behavior: {satiety: 50, poison},
    },
    terrorSoul: {
        spriteTile: "terrorSoul",
        label: "A terror soul",
        plural: "terror souls",
        description: `${bEggining} Within, a ghastly vision glares: the lingering rage-memory of when God was the tyrant named Zanback.`,
        effect: "Upon consumption, terrifies all who behold you.",
        message: "Eons of rage pour across the veil for a terrible moment.",
        discoveryMessage,
        behavior: {burst: {r: 10, fear}},
    },
    summonSoul: {
        spriteTile: "summonSoul",
        label: "A summon soul",
        plural: "summon souls",
        description: `${bEggining} Pinpoint eyes from the depths evoke the memory of when God was the school itself, innumerable bodies together named We.`,
        effect: "Upon consumption, summons hostile mobs.",
        message: "You ring the dinner bell.",
        discoveryMessage,
        behavior: {summon: 5},
    },
    sickSoul: {
        spriteTile: "sickSoul",
        label: "A sick soul",
        plural: "sicks souls",
        description: `${justYolks} God is not always brought low by its successor. Some fall prey to the very smallest fish, too small to possess ambition, and so they rot in the deep.`,
        effect: "Upon consumption, poisons all who behold you.",
        message: "Vile miasma clouds the water.",
        discoveryMessage,
        behavior: {burst: {r: 5, poison}},
    },
    flashSoul: {
        spriteTile: "flashSoul",
        label: "A flash soul",
        plural: "flash souls",
        description: `${bEggining} Dazzling and brief is the memory of when God was the most bright. May we remember its name tomorrow.`,
        effect: "Upon consumption, stuns all who behold you.",
        message: "Divine billiance halts your foes!",
        discoveryMessage,
        behavior: {burst: {r: 10, stun}},
    },
    cleanSoul: {
        spriteTile: "cleanSoul",
        label: "A clean soul",
        plural: "clean souls",
        description: `${bEggining} Intangible shine glitters, the memory of the God who undid what had been done, who made whole too much, who we called Catrolzy.`,
        effect: "Upon consumption, returns your body to its base form, returning equipped souls as eggs.",
        message: "Undone.",
        discoveryMessage,
        behavior: {clean},
    },
    shuffleSoul: {
        spriteTile: "shuffleSoul",
        label: "A shuffle soul",
        plural: "shuffle souls",
        description: `${bEggining} The discordant, pulsing colors within form the memory of when God was raw chaos, when God refused every name or claimed all of them.`,
        effect: "Upon consumption, all of your transformed limbs change to a random other form.",
        message: "Your body wrenches into new shapes!",
        discoveryMessage,
        behavior: {shuffle},
    },
    emptyEgg: {
        spriteTile: "emptyEgg",
        label: "An empty egg",
        plural: "empty eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    flickeringEgg: {
        spriteTile: "flickeringEgg",
        label: "A flickering egg",
        plural: "flickering eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    blinkingEgg: {
        spriteTile: "blinkingEgg",
        label: "A blinking egg",
        plural: "blinking eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    writhingEgg: {
        spriteTile: "writhingEgg",
        label: "A writhing egg",
        plural: "writhing eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    mistyEgg: {
        spriteTile: "mistyEgg",
        label: "A misty egg",
        plural: "misty eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    buzzingEgg: {
        spriteTile: "buzzingEgg",
        label: "A buzzing egg",
        plural: "buzzing eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    pouringEgg: {
        spriteTile: "pouringEgg",
        label: "A pouring egg",
        plural: "pouring eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    wavingEgg: {
        spriteTile: "wavingEgg",
        label: "A waving egg",
        plural: "waving eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    pacingEgg: {
        spriteTile: "pacingEgg",
        label: "A pacing egg",
        plural: "pacing eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    twitchingEgg: {
        spriteTile: "twitchingEgg",
        label: "A twitching egg",
        plural: "twitching eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    boilingEgg: {
        spriteTile: "boilingEgg",
        label: "A boiling egg",
        plural: "boiling eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    twinklingEgg: {
        spriteTile: "twinklingEgg",
        label: "A twinkling egg",
        plural: "twinkling eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    tidalEgg: {
        spriteTile: "tidalEgg",
        label: "A tidal egg",
        plural: "tidal eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    gleamingEgg: {
        spriteTile: "gleamingEgg",
        label: "A gleaming egg",
        plural: "gleaming eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    pulsingEgg: {
        spriteTile: "pulsingEgg",
        label: "A pulsing egg",
        plural: "pulsing eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    rollingEgg: {
        spriteTile: "rollingEgg",
        label: "A rolling egg",
        plural: "rolling eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    spinningEgg: {
        spriteTile: "spinningEgg",
        label: "A spinning egg",
        plural: "spinning eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    swirlingEgg: {
        spriteTile: "swirlingEgg",
        label: "A swirling egg",
        plural: "swirling eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
    fizzingEgg: {
        spriteTile: "fizzingEgg",
        label: "A fizzing egg",
        plural: "fizzing eggs",
        description: eggDescription,
        message: eggMessage,
        behavior: {egg},
    },
})

/** @typedef {keyof typeof itemDefinitions} ItemName */

/**
 * @typedef EquipmentDefinition
 * @prop {string} label
 * @prop {string} [description]
 * @prop {string} [equipMessage]
 */

/** @satisfies {Record<EquipmentName, Record<StatName, EquipmentDefinition | false>>} */
export const equipmentDefinitions = {
    geodeSoul: {
        head: {
            label: "Geode maw",
            description: "There's a glint of color from the dark. Two rows of seaglass knives open to devour the very caves.",
            equipMessage: "The cold pragmatism of Sah-fet sharpens and glassifies your teeth."
        },
        dorsal: {
            label: "Geode backfin",
            description: "Crystal outcroppings glow with hissing light.",
            equipMessage: "Your dorsal fin splits and shines with Sah-fet's cutting insight."
        },
        belly: {
            label: "Geode belly",
            description: "Oh, how you shine! Beacon in the dark, beware.",
            equipMessage: "Brilliant plastrons segment and split across your belly."
        },
        fins: {
            label: "Geode fins",
            description: "Shining fans of crystal break the light into glitterdust.",
            equipMessage: "Sah-fet's splendor turns your fin webs to stained glass, gleaming in the dark."
        },
        tail: {
            label: "Geode tail",
            description: "A crystal sickle slices through the water and light alike, leaving blades of sharp color behind.",
            equipMessage: "The crystalline edge of Sah-fet's will curls and hardens your tailfin."
        },
    },
    cavitationSoul: {
        head: {
            label: "Cavitation maw",
            description: "Cartilage latches hold a spring-loaded guillotine ready to snap down with stunning force.",
            equipMessage: "Your jaw fuses and strengthens, a temple to the crushing vacuum."
        },
        dorsal: {
            label: "Cavitation backfin",
            description: "Rigid plates articulate to form a pair of supersonic cymbals ready to crash together.",
            equipMessage: "Your dorsal fin hardens to a split ridge, forming an empty altar between."
        },
        belly: {
            label: "Cavitation belly",
            description: "Stretchy skin and strong lungs make you harder and more dangerous to hurt.",
            equipMessage: "Your belly softens and stretches, formless as Mantis was."
        },
        fins: {
            label: "Cavitation fins",
            description: "The stretchy membrane and flexible cartilage of your lateral fins can hold tremendous tension.",
            equipMessage: "Your fins at once harden and bend, lethal tension growing in their curves."
        },
        tail: {
            label: "Cavitation tail",
            description: "Cartilaginous tension snaps you through the water at terrible speed, and woe betide anything behind you.",
            equipMessage: "The tendons of your tailfin tighten even as the cartilage thickens and strengthens. You are a wound spring."
        },
    },
    slimeSoul: {
        head: {
            label: "Slime maw",
            description: "Soft, suffocating, toothless death.",
            equipMessage: "Your lips thicken, padding your jaws until, like Cyclost, your swallow is worse than your bite."
        },
        dorsal: {
            label: "Slime backfin",
            description: "Limp and sagging, your dorsal fin hides considerable muscle.",
            equipMessage: "Your dorsal fin droops, formless now but stronger than ever."
        },
        belly: {
            label: "Slime belly",
            description: "A soft, squishy body provides little purchase for fang and claw.",
            equipMessage: "Your belly is slick with slime, flexible and amorphous. Cyclost's softness protects you."
        },
        fins: {
            label: "Slime fins",
            description: "From pressurized glands, condensed slime forms hydraulic propulsion strength.",
            equipMessage: "Your fins bloat, filling with pressurized slime."
        },
        tail: {
            label: "Slime tail",
            description: "Radial tentacles explore the water at a more ponderous pace, but more hands bring greater safety.",
            equipMessage: "Your tailfin splits grotesquely into a radial array of tentacles like Cyclost's legendary halo."
        },
    },
    venomSoul: {
        head: {
            label: "Venom maw",
            description: "Slick needlepoints deliver a final gift.",
            equipMessage: "Your jaw aches as fangs descend and fill with Iruka's dizzying draught."
        },
        dorsal: {
            label: "Venom backfin",
            description: "Mottled syringe-like spines rattle as you move.",
            equipMessage: "The pin bones of your dorsal fin elongate, and the webbing between recedes."
        },
        belly: {
            label: "Venom belly",
            description: "Skin like an oil slick, impenetrable and permanent.",
            equipMessage: "Your belly darkens, tightens, shines with the refracted color of Iruka's rubbery hide."
        },
        fins: {
            label: "Venom fins",
            description: "Even a scratch from these thin needles takes its toll.",
            equipMessage: "Your fins shrink and sharpen."
        },
        tail: {
            label: "Venom tail",
            description: "A singular syringe of a spine packed with venom invites sneak-attackers.",
            equipMessage: "The very end of your tail extends into a hollow, sharp tube like one of Iruka's innumerable fingers."
        },
    },
    dreadSoul: {
        head: {
            label: "Dread maw",
            description: "Spikes from drawn flesh and staring eyes form a striking final vision.",
            equipMessage: "Your eyes sink into your head, glowing with Pit's eldritch gaze, as your skin loosens and stretches."
        },
        dorsal: {
            label: "Dread backfin",
            description: "A quiver full of barbed bolts provides little stability but makes a strong impression.",
            equipMessage: "Your dorsal fin flares and twists into a tangled, thorny bramble."
        },
        belly: {
            label: "Dread belly",
            description: "You are unpleasant to approach.",
            equipMessage: "Your belly darkens, and shadows cling unnaturally to your body."
        },
        fins: {
            label: "Dread fins",
            description: "Curling digits clutch a numbing venom within themselves.",
            equipMessage: "Your fins bend painfully into dangerous homages of Pit's grasping claw."
        },
        tail: {
            label: "Dread tail",
            description: "Lumpy channels excrete a sooty discharge from limp fins.",
            equipMessage: "Your tail shrivels into a twisted, branchlike appendage lashing the air."
        },
    },
    spineSoul: {
        head: {
            label: "Spine Maw",
            description: "Each black spike on each row is a strong cone tapering to a point of microscopic sharpness.",
            equipMessage: "Your teeth turn into sharp needles!"
        },
        dorsal: {
            label: "Spine backfin",
            description: "You bristle with a coat of ready menace.",
            equipMessage: "Spines burst from all over your back, like the coat that Xeka stole from the mammals long ago."
        },
        belly: {
            label: "Spine belly",
            description: "Your prickly hide gifts your assailants with quick regret.",
            equipMessage: "Puffer prickles spout folded along your belly."
        },
        fins: {
            label: "Spine fins",
            description: "Your lateral fins are a rattling bundle of spines.",
            equipMessage: "It is not without pain that Xeka's sharp gifts grow in prickly wads from your fins."
        },
        tail: {
            label: "Spine tail",
            description: "Your hydrodynamic tail is lined with loose burs.",
            equipMessage: "As your tail elongates and grows sleeker, clusters of spines sprout in its corners."
        },
    }
}

/** @type {Record<ItemName, ItemDefinition>} */
export const items = itemDefinitions;
/** @type {Record<EquipmentName, Record<StatName, EquipmentDefinition | false>>} */
export const equipment = equipmentDefinitions;

Object.assign(self, {items, equipment});