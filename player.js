import { mapEntries } from "./helpers.js";
import { Stat, allStats } from "./stats.js";
import { MapSprite } from "./worldmap.js";

export class Player extends MapSprite {
    /** @type {Record<StatName, Stat>} */
    stats;

    constructor(x = 0, y = 0, z = 0) {
        super("PCfish", x, y, z, 0, true);
        this.stats = mapEntries(allStats, (def, name) => new Stat(name));
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