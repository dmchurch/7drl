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

declare type TileSheetDef = import("./tiles.js").TileSheetDef;
declare type TileSheetName = keyof (typeof import("./tiles.js"))["tileSheets"];
declare type WallRuleName = keyof (typeof import("./tiles.js"))["wallRules"];
declare type TileName = keyof (typeof import("./tiles.js"))["tileDefinitions"];
declare type ItemDefinition = import("./items.js").ItemDefinition;
declare type ItemName = import("./items.js").ItemName;
declare type RoleDefinition = import("./roles.js").RoleDefinition;
declare type RoleName = import("./roles.js").RoleName;

declare type StatDef = import("./stats.js").StatDef;
declare type StatName = import("./stats.js").StatName;

declare type IfEquals<X, Y, T, F> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? T : F;

type NonOverridableKeys = "worldMap" | "container" | "rootSprite";
type NonOverridable = string | number | boolean | symbol | bigint | any[] | import("./worldmap.js").WorldMap;
declare type PropertyKeys<T> = {
    [K in keyof T]: T[K] extends Function ? never
                  : IfEquals<{[K2 in K]: T[K]}, {-readonly [K2 in K]: T[K]}, K, never>
}[keyof T]
declare type Overrides<T> = T extends NonOverridable ? T : {
    [K in PropertyKeys<T>]?: K extends NonOverridableKeys ? T[K] : Overrides<T[K]>
};
