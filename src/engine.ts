import { Scheduler } from "rot-js";
import type { Actor } from "./actors.js";
import type { Player } from "./player.js";

console.debug("Starting engine.js");
export class Engine extends Scheduler.Simple<Actor> {

    player: Player;

    time = 0;

    currentActor: [string, Actor];

    constructor() {
        super();
        this.add(this, true); // self-entry for round-timing!
    }

    next(): Actor {
        let next = super.next();
        if (next === this) {
            this.time++;
            next = super.next();
            if (next === this) {
                return null;
            }
        }
        return next;
    }

    getTime() {
        return this.time;
    }

    getTimeOf(actor: Actor) {
        return super.getTimeOf(actor) == null ? null : this.getTime();
    }

    async mainLoop() {
        while (!this.player?.wonGame) {
            const actor: Actor = this.next();
            if (!actor) {
                console.error("No actors remaining! Exiting main loop");
                break;
            }
            if (actor !== this.player && this.getTimeOf(this.player) == null) {
                console.warn("Player not scheduled, exiting main loop");
                break;
            }
            if (actor !== this.player && !actor.canAct()) {
                continue;
            }
            let result;
            console.debug(`Scheduling ${actor.toString()} at time ${this.getTime()}`);
            try {
                this.currentActor = [actor.toString(), actor]; // for debug purposes
                result = await actor.act(this.getTime());
            } catch (e) {
                console.error("Actor threw exception during act, removing from scheduler", actor, e);
                this.remove(actor);
            }
            if (result === false) {
                this.remove(actor);
            }
        }
        console.log("Game won! exiting loop");
    }
}

export const scheduler = new Engine();    

Object.assign(self, {Engine, scheduler});