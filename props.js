import { MapSprite } from "./worldmap.js";

export class Prop extends MapSprite {
    blocksActors = false;
}

export class Item extends Prop {
    inventoryLabel = "A jar of peanut butter";
}

Object.assign(self, {Prop, Item});