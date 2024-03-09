declare interface AsepriteSize {
    w: number;
    h: number;
}
declare interface AsepriteRect extends AsepriteSize {
    x: number;
    y: number;
}
declare interface AsepriteFrame {
    filename?: string;
    frame: AsepriteRect;
    rotated: boolean;
    trimmed: boolean;
    spriteSourceSize: AsepriteRect;
    sourceSize: AsepriteSize;
    duration: number;
}
declare interface AsepriteLayer {
    name: string;
    opacity: number; // 0-255
    blendMode: string; // "normal"
}
declare interface AsepriteMeta {
    app: string;
    version: string;
    image: string;
    format: string;
    size: AsepriteSize;
    scale: string;
    frameTags: never[];
    layers: AsepriteLayer[];
    slices: never[];
}
declare type AsepriteFrameName<ImageName extends string = string, SpriteName extends string = string, Layer extends number = number> = `${ImageName} (${SpriteName}) ${Layer}.aseprite`
declare interface AsepriteExport {
    frames: Record<AsepriteFrameName, AsepriteFrame>;
    meta: AsepriteMeta;
}

declare type TileInfo = import ("./tiles.js").TileInfo;

declare interface TileFrame extends TileInfo {
    tileName: TileName;
    layerName: string;
    frameIndex: number;
    frames: TileFrame[];
    char?: string;
    x: number;
    y: number;
    sourceFrame?: AsepriteFrame;
}

declare type BoundingBox = {
    x: [xMin: number, xMax: number],
    y: [yMin: number, yMax: number],
    z: [zMin: number, zMax: number],
}

declare type TileSheetDef = import("./tiles.js").TileSheetDef;
declare type TileSheetName = keyof (typeof import("./tiles.js"))["tileSheets"];
declare type WallRuleName = keyof (typeof import("./tiles.js"))["wallRules"];
declare type TileName = keyof (typeof import("./tiles.js"))["tileDefinitions"];
declare type ItemDefinition = import("./items.js").ItemDefinition;
declare type ItemName = import("./items.js").ItemName;
type _AllItemDefinitions = typeof import("./items.js").itemDefinitions;
declare type EquipmentName = {[K in keyof _AllItemDefinitions]: _AllItemDefinitions[K] extends {equippable: true} ? K : never}[keyof _AllItemDefinitions]
declare type RoleDefinition = import("./roles.js").RoleDefinition;
declare type RoleName = import("./roles.js").RoleName;
declare type KeyboardCueName = keyof typeof import("./uicomponents.js").KeyboardCueElement["keysToDOMCodes"];
declare type DOMKeyCode = keyof typeof import("./input.js").InputManager["keyCodesToKeyCues"];
declare type PopDefinition = import("./pops.js").PopDefinition;
declare type PopName = import("./pops.js").PopName;

declare type StatDef = import("./stats.js").StatDef;
declare type StatName = import("./stats.js").StatName;

declare type IfEquals<X, Y, T, F = never> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? T : F;

type NonOverridableKeys = "worldMap" | "container" | "rootSprite";
type NonOverridable = string | number | boolean | symbol | bigint | any[] | import("./worldmap.js").WorldMap;
declare type PropertyKeys<T> = {
    [K in keyof T]: T[K] extends Function ? never
                  : IfEquals<{[K2 in K]: T[K]}, {-readonly [K2 in K]: T[K]}, K>
}[keyof T]
declare type Overrides<T> = T extends NonOverridable ? T : {
    [K in PropertyKeys<T>]?: K extends NonOverridableKeys ? T[K] : Overrides<T[K]>
};

declare type VoidItemBehaviorName = typeof import("./items.js").voidItemBehaviors[number];
declare type NumericItemBehaviorName = typeof import("./items.js").numericItemBehaviors[number];
declare type MetaItemBehaviorName = typeof import("./items.js").metaItemBehaviors[number];

declare type ItemBehavior = {
    [B in VoidItemBehaviorName]?: boolean
} & {
    [B in NumericItemBehaviorName]?: number
} & {
    [B in MetaItemBehaviorName]?: {r: number} & ItemBehavior
};