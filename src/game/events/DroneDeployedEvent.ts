/// <reference path="BaseLogEvent.ts"/>

module TS.SpaceTac.Game {
    // Event logged when a drone is deployed by a ship
    export class DroneDeployedEvent extends BaseLogEvent {
        // Pointer to the drone
        drone: Drone;

        constructor(drone: Drone) {
            super("droneadd", drone.owner);

            this.drone = drone;
        }
    }
}
