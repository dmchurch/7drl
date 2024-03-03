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

// extra info put in 
declare interface TileFrame extends AsepriteFrame {
    layerName: string;
    frameIndex: number;
    char: string;
}

declare type LayerName = "Background" | "bubble1" | "eel" | "weeds1" | "egg" | "crab" | "fish" | "PCfish" | "solidwall" | "linewall";