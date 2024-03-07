/**
 * @typedef ItemDefinition
 * @prop {TileName} spriteTile
 * @prop {number} [spriteFrame]
 * @prop {string} label
 * @prop {string} plural
 * @prop {string} [description]
 * @prop {boolean} [equippable]
 */

/** @satisfies {Record<string, ItemDefinition>} */
export const itemDefinitions = {
    geodeSoul: {
        spriteTile: "geodeSoul",
        label: "A geode soul",
        plural: "geode souls",
        description: "Some text goes here.",
        equippable: true,
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
            description: "What does a geode maw look like anyway?",
        },
    }
}

/** @type {Record<string, ItemDefinition>} */
export const items = itemDefinitions;
/** @type {Partial<Record<ItemName, Partial<Record<StatName, EquipmentDefinition>>>>} */
export const equipment = equipmentDefinitions;

Object.assign(self, {items, equipment});