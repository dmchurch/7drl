import { Scheduler } from "rot-js";

console.debug("Starting engine.js");
/** @extends Scheduler.Simple<Actor>  */
export class Engine extends Scheduler.Simple {
    /** @typedef {import("./actors.js").Actor} Actor */
    /** @typedef {import("./player.js").Player} Player */

    /** @type {Player} */
    player;

    async mainLoop() {
        while (true) {
            /** @type {Actor} */
            const actor = this.next();
            if (!actor) {
                console.error("No actors remaining! Exiting main loop");
                break;
            }
            if (actor !== this.player && this.getTimeOf(this.player) == null) {
                console.warn("Player not scheduled, exiting main loop");
                break;
            }
            let result;
            console.log(`Scheduling ${actor.roleName} at ${actor.x},${actor.y},${actor.z} at time ${this.getTime()}`);
            try {
                result = await actor.act(this.getTime());
            } catch (e) {
                console.error("Actor threw exception during act, removing from scheduler", actor, e);
                this.remove(actor);
            }
            if (result === false) {
                this.remove(actor);
            }
        }
    }
}

export const scheduler = new Engine();    

Object.assign(self, {Engine, scheduler});