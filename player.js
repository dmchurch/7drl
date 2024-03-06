import { Creature } from "./actors.js";
import { mapEntries } from "./helpers.js";
import { Stat, allStats } from "./stats.js";

export class Player extends Creature {
    constructor(x = 0, y = 0, z = 0) {
        super("PCfish", x, y, z, 0, true);
    }

    move(dx = 0, dy = 0, dz = 0) {
        if (!super.move(dx, dy, dz)) {
            return false;
        }
        const {x, y, z} = this;
        this.worldMap.mainViewport.centerOn(x, y, z, true);
        return true;

    }
}

Object.assign(self, {Player});