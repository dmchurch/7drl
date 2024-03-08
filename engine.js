import { Scheduler } from "rot-js";
import { Actor } from "./actors.js";
import { player } from "./main.js";

/** @type {import("rot-js/lib/scheduler/simple").default<Actor>} */
export const scheduler = new Scheduler.Simple();

export async function mainLoop() {
    while (true) {
        /** @type {Actor} */
        const actor = scheduler.next();
        if (!actor) {
            console.error("No actors remaining! Exiting main loop");
            break;
        }
        if (actor !== player && scheduler.getTimeOf(player) == null) {
            console.warn("Player not scheduled, exiting main loop");
            break;
        }
        let result;
        console.log(`Scheduling ${actor.roleName} at ${actor.x},${actor.y},${actor.z} at time ${scheduler.getTime()}`);
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