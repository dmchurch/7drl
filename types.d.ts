declare interface AsepriteSize {
    w: number;
    h: number;
}
declare interface AsepriteRect extends AsepriteSize {
    x: number;
    y: number;
}
declare interface AsepriteFrame {
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
    layerName: string;
    frameIndex: number;
    frames: TileFrame[];
    char?: string;
    x: number;
    y: number;
    sourceFrame?: AsepriteFrame;
}

declare type W<C extends string> = C | Lowercase<C> | ' '
declare type WallRule = `${W<'Q'>}${W<'W'>}${W<'E'>}${W<'A'>}S${W<'D'>}${W<'Z'>}${W<'X'>}${W<'C'>}`;

declare type TileSheetName = keyof (typeof import("./tiles.js"))["tileSheets"];
declare type WallRuleName = keyof (typeof import("./tiles.js"))["wallRules"];
declare type TileName = keyof (typeof import("./tiles.js"))["tiles"];