import { Scheduler } from "rot-js";
import { Actor } from "./actors.js";

/** @type {import("rot-js/lib/scheduler/simple").default<Actor>} */
export const scheduler = new Scheduler.Simple();

export async function mainLoop() {
    while (true) {
        /** @type {Actor} */
        const actor = scheduler.next();
        let result;
        try {
            result = await actor.act(scheduler.getTime());
        } catch (e) {
            console.error("Actor threw exception during act, removing from scheduler", actor, e);
            scheduler.remove(actor);
        }
        if (result === false) {
            scheduler.remove(actor);
        }
    }
}

Object.assign(self, {scheduler, mainLoop});