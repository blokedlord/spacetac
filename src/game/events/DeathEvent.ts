/// <reference path="BaseLogEvent.ts"/>

module TS.SpaceTac.Game {
    // Event logged when a ship is dead
    export class DeathEvent extends BaseLogEvent {
        constructor(ship: Ship) {
            super("death", ship);
        }
    }
}
