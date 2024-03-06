import { mapEntries } from "./helpers.js";
import { Item, Prop } from "./props.js";
import { Stat, allStats } from "./stats.js";

export class Actor extends Prop {
    collision = true;

    move(dx = 0, dy = 0, dz = 0) {
        if (!dx && !dy && !dz) return false;

        const {x, y, z, collision} = this;

        const nx = x + dx;
        const ny = y + dy;
        const nz = z + dz;

        if (collision) {
            const baseTile = this.worldMap.getBaseTile(nx, ny, nz);
            if (baseTile && !baseTile.insubstantial) {
                return false;
            }
            for (const sprite of this.worldMap.getSpritesAt(nx, ny, nz)) {
                if (sprite instanceof Prop && sprite.blocksActors) {
                    return false;
                }
            }
        }

        this.x = nx;
        this.y = ny;
        this.z = nz;

        if (this.visible) {
            this.worldMap.drawTile(x, y, z);
            this.worldMap.drawTile(nx, ny, nz);
        }

        return true;
    }
}

export class Creature extends Actor {
    /** @type {Record<StatName, Stat>} */
    stats;

    /** @type {Item[]} */
    inventory = [];

    /** @param {TileName} spriteTile */
    constructor(spriteTile, x = 0, y = 0, z = 0, frame = 0, animated = true) {
        super(spriteTile, x, y, z, frame, animated);
        this.stats = mapEntries(allStats, (def, name) => new Stat(name));
    }
}

Object.assign(self, {Actor, Creature});