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

declare interface BoundingBoxLike {
    xLimits: [number, number];
    yLimits: [number, number];
    zLimits: [number, number];
}

declare type TileSheetDef = import("./tiles.js").TileSheetDef;
declare type TileSheetName = keyof (typeof import("./tiles.js"))["tileSheets"];
declare type WallRuleName = keyof (typeof import("./tiles.js"))["wallRules"];
declare type TileName = keyof (typeof import("./tiles.js"))["tileDefinitions"];
declare type ItemDefinition = import("./items.js").ItemDefinition;
declare type EquippableItemDefinition = import("./items.js").EquippableItemDefinition;
declare type ConsumableItemDefinition = import("./items.js").ConsumableItemDefinition;
declare type ItemName = import("./items.js").ItemName;
type _AllItemDefinitions = typeof import("./items.js").itemDefinitions;
declare type EquipmentName = {[K in keyof _AllItemDefinitions]: _AllItemDefinitions[K] extends {equippable: true} ? K : never}[keyof _AllItemDefinitions]
declare type EquipmentDefinition = import("./items.js").EquipmentDefinition;
declare type RoleDefinition = import("./roles.js").RoleDefinition;
declare type RoleName = import("./roles.js").RoleName;
declare type KeyboardCueName = keyof typeof import("./uicomponents.js").KeyboardCueElement["keysToDOMCodes"];
declare type DOMKeyCode = keyof typeof import("./input.js").InputManager["keyCodesToKeyCues"];
declare type PopDefinition = import("./pops.js").PopDefinition;
declare type ItemPopDefinition = import("./pops.js").ItemPopDefinition;
declare type RolePopDefinition = import("./pops.js").RolePopDefinition;
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

declare type VoidItemEffectName = typeof import("./items.js").voidItemEffects[number];
declare type NumericItemEffectName = typeof import("./items.js").numericItemEffects[number];
declare type MetaItemEffectName = typeof import("./items.js").metaItemEffects[number];
declare type ItemEffectName = VoidItemEffectName | NumericItemEffectName | MetaItemEffectName;
declare type ItemEffectValue<E extends ItemEffectName>
    = E extends VoidItemEffectName ? boolean
    : E extends NumericItemEffectName ? number
    : E extends MetaItemEffectName ? {r: number} & ItemBehavior
    : never;

declare type ItemBehavior = {
    [E in ItemEffectName]?: ItemEffectValue<E>
};

declare interface StatLike {
    current: number;
    max: number;
    name?: StatName;
    s?: string;
    readonly equipDef: EquipmentDefinition;
}

declare interface ReadonlyBoundingBox {
    readonly xLimits: [number, number];
    readonly yLimits: [number, number];
    readonly zLimits: [number, number];
    get xMin(): number; get yMin(): number; get zMin(): number;
    get xMax(): number; get yMax(): number; get zMax(): number;

    get x(): number; get y(): number; get z(): number;
    get w(): number; get h(): number; get d(): number;

    get centerX(): number; get centerY(): number; get centerZ(): number;
    get radiusX(): number; get radiusY(): number; get radiusZ(): number;
    get diameterX(): number; get diameterY(): number; get diameterZ(): number;

    countCoords(): number;

    copy(): import("./geometry.js").BoundingBox;
    makeWritable(): import("./geometry.js").BoundingBox;
    contains(x?: number, y?: number, z?: number): boolean;
    walk(callback: (x: number, y: number, z: number) => any): void;
}

type Coord = import("./geometry.js").Coord;
type CoordAbortSymbol = typeof import("./geometry.js").Coord.ABORT

declare interface CoordSet extends IterableIterator<Coord> {
    get potentiallyUnbounded(): boolean;
    includes(coord: Coord): boolean;
    nextCoord(): Coord | null;
    rewindCoords(): void;
    resetCoords(rewind?: boolewn = true): void;
    randomizeCoords(rewind?: boolewn = true): void;
    countCoords(exact?: boolean): number;
    getCoords(limit?: number): readonly Coord[] & CoordSet;
    getCenterCoord(): Coord; // might not be in the set
    walkCoords(callback: (c: Coord) => unknown | CoordAbortSymbol): void;
    mapCoords<T>(callback: (c: Coord) => T | CoordAbortSymbol): T[];
    filterCoords(predicate: (c: Coord) => boolean | CoordAbortSymbol): CoordSet;
    limitCoords(limit: number): CoordSet;
}

declare interface CoordLike {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}