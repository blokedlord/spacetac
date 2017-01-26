/// <reference path="Serializable.ts"/>

module TS.SpaceTac.Game {
    // A fleet of ships
    export class Fleet extends Serializable {
        // Fleet owner
        player: Player;

        // List of ships
        ships: Ship[];

        // Current fleet location
        location: StarLocation;

        // Current battle in which the fleet is engaged (null if not fighting)
        battle: Battle;

        // Create a fleet, bound to a player
        constructor(player: Player = null) {
            super();

            this.player = player || new Player();
            this.ships = [];
            this.location = null;
            this.battle = null;
        }

        // Set the current location of the fleet
        setLocation(location: StarLocation): void {
            this.location = location;
            this.player.setVisited(this.location.star);

            // Check encounter
            var battle = this.location.enterLocation(this.player.fleet);
            if (battle) {
                this.player.setBattle(battle);
            }
        }

        // Add a ship in this fleet
        addShip(ship: Ship): void {
            if (this.ships.indexOf(ship) < 0) {
                this.ships.push(ship);
            }
            ship.fleet = this;
        }

        // Set the current battle
        setBattle(battle: Battle): void {
            this.battle = battle;
        }

        // Get the average level of this fleet
        getLevel(): number {
            if (this.ships.length === 0) {
                return 0;
            }

            var sum = 0;
            this.ships.forEach((ship: Ship) => {
                sum += ship.level;
            });
            var avg = sum / this.ships.length;
            return Math.round(avg);
        }

        // Check if the fleet still has living ships
        isAlive(): boolean {
            var count = 0;
            this.ships.forEach((ship: Ship) => {
                if (ship.alive) {
                    count += 1;
                }
            });
            return (count > 0);
        }

        // Use the current warp location to make a jump to another star
        jump(): boolean {
            if (this.location && this.location.type === StarLocationType.WARP && this.location.jump_dest) {
                this.player.fleet.setLocation(this.player.fleet.location.jump_dest);
                return true;
            } else {
                return false;
            }
        }
    }
}
