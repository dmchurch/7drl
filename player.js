import { MapSprite } from "./worldmap.js";

export class Player extends MapSprite {
    constructor(x = 0, y = 0, z = 0) {
        super("PCfish", x, y, z, 0, true);
    }
}