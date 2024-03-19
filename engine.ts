import { Scheduler } from "rot-js";

console.debug("Starting engine.js");
/** @extends Scheduler.Simple<Actor>  */
export class Engine extends Scheduler.Simple {
    /** @typedef {import("./actors.js").Actor} Actor */
    /** @typedef {import("./player.js").Player} Player */

    /** @type {Player} */
    player;

    time = 0;

    constructor() {
        super();
        this.add(this, true); // self-entry for round-timing!
    }

    /** @returns {Actor} */
    next() {
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

    getTimeOf(actor) {
        return super.getTimeOf(actor) == null ? null : this.getTime();
    }

    async mainLoop() {
        while (!this.player?.wonGame) {
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
            if (actor !== this.player && !actor.canAct()) {
                continue;
            }
            let result;
            console.debug(`Scheduling ${actor.toString()} at time ${this.getTime()}`);
            try {
                this.currentAction = [actor.toString(), actor];
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