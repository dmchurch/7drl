import { MapSprite } from "./worldmap.js";

export class Player extends MapSprite {
    constructor(x = 0, y = 0, z = 0) {
        super("PCfish", x, y, z, 0, true);
    }

    move(dx = 0, dy = 0, dz = 0) {
        if (!dx && !dy && !dz) return;

        const nx = this.x + dx;
        const ny = this.y + dy;
        const nz = this.z + dz;

        if (this.worldMap.getBase(nx, ny, nz)) {
            return false;
        }
        this.x = nx;
        this.y = ny;
        this.z = nz;
        const {mainViewport} = this.worldMap;
        mainViewport.centerOn(nx, ny, nz, true);
        return true;
    }
}