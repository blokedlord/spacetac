/// <reference path="Serializable.ts"/>

module SpaceTac.Game {
    "use strict";

    // A turn-based battle between fleets
    export class Battle extends Serializable {
        // Flag indicating if the battle is ended
        ended: boolean;

        // Battle outcome, if *ended* is true
        outcome: BattleOutcome;

        // Log of all battle events
        log: BattleLog;

        // List of fleets engaged in battle
        fleets: Fleet[];

        // List of ships, sorted by their initiative throw
        play_order: Ship[];

        // Current ship whose turn it is to play
        playing_ship_index: number;
        playing_ship: Ship;

        // Boolean indicating if its the first turn
        first_turn: boolean;

        // Create a battle between two fleets
        constructor(fleet1: Fleet = null, fleet2: Fleet = null) {
            super();

            this.log = new BattleLog();
            this.fleets = [fleet1 || new Fleet(), fleet2 || new Fleet()];
            this.play_order = [];
            this.playing_ship_index = null;
            this.playing_ship = null;
            this.first_turn = true;
            this.ended = false;

            this.fleets.forEach((fleet: Fleet) => {
                fleet.setBattle(this);
            });
        }

        // Create a quick random battle, for testing purposes
        static newQuickRandom(with_ai: boolean = false): Battle {
            var player1 = Player.newQuickRandom("John");
            var player2 = Player.newQuickRandom("Carl");

            var result = new Battle(player1.fleet, player2.fleet);
            if (with_ai) {
                player2.ai = new AI.BullyAI(player2.fleet);
            }
            result.start();
            return result;
        }

        // Check if a player is able to play
        //  This can be used by the UI to determine if player interaction is allowed
        canPlay(player: Player): boolean {
            if (this.ended) {
                return false;
            } else if (this.playing_ship.getPlayer() === player) {
                return this.playing_ship.isAbleToPlay();
            } else {
                return false;
            }
        }

        // Create play order, performing an initiative throw
        throwInitiative(gen: RandomGenerator = new RandomGenerator()): void {
            var play_order: Ship[] = [];

            // Throw each ship's initiative
            this.fleets.forEach(function (fleet: Fleet) {
                fleet.ships.forEach(function (ship: Ship) {
                    ship.throwInitiative(gen);
                    play_order.push(ship);
                });
            });

            // Sort by throw result
            play_order.sort(function (ship1: Ship, ship2: Ship) {
                return (ship2.initiative.current - ship1.initiative.current);
            });
            this.play_order = play_order;
        }

        // Defines the initial ship positions of all engaged fleets
        placeShips(): void {
            this.first_turn = true;
            this.placeFleetShips(this.fleets[0], 50, 300, 0);
            this.placeFleetShips(this.fleets[1], 800, 300, Math.PI);
        }

        // Count the number of fleets still alive
        countAliveFleets(): number {
            var result = 0;
            this.fleets.forEach((fleet: Fleet) => {
                if (fleet.isAlive()) {
                    result += 1;
                }
            });
            return result;
        }

        // Ends a battle and sets the outcome
        endBattle(winner: Fleet, log: boolean = true) {
            this.ended = true;
            this.outcome = new BattleOutcome(winner);
            if (winner) {
                this.outcome.createLoot(this);
            }
            if (log && this.log) {
                this.log.add(new EndBattleEvent(this.outcome));
            }
        }

        // Checks end battle conditions, returns true if the battle ended
        checkEndBattle(log: boolean = true) {
            if (this.ended) {
                return true;
            }

            var alive_fleets = this.countAliveFleets();

            if (alive_fleets === 0) {
                // It's a draw
                this.endBattle(null, log);
            } else if (alive_fleets === 1) {
                // We have a winner
                var winner: Fleet = null;
                this.fleets.forEach((fleet: Fleet) => {
                    if (fleet.isAlive()) {
                        winner = fleet;
                    }
                });
                this.endBattle(winner, log);
            }

            return this.ended;
        }

        // End the current ship turn, passing control to the next one in play order
        //  If at the end of the play order, next turn will start automatically
        //  Member 'play_order' must be defined before calling this function
        advanceToNextShip(log: boolean = true): void {
            var previous_ship = this.playing_ship;

            if (this.checkEndBattle(log)) {
                return;
            }

            if (this.play_order.length === 0) {
                this.playing_ship_index = null;
                this.playing_ship = null;
            } else {
                var i = 0;
                do {
                    if (this.playing_ship_index == null) {
                        this.playing_ship_index = 0;
                    } else {
                        this.playing_ship_index += 1;
                    }
                    if (this.playing_ship_index >= this.play_order.length) {
                        this.playing_ship_index = 0;
                        this.first_turn = false;
                    }
                    this.playing_ship = this.play_order[this.playing_ship_index];
                    i++;
                } while (!this.playing_ship.alive && i < 1000);

                if (i >= 1000) {
                    throw new Error("Infinite loop in advanceToNextShip");
                }
            }

            if (this.playing_ship) {
                this.playing_ship.startTurn(this.first_turn);

                if (!this.playing_ship.isAbleToPlay()) {
                    // If the ship is not able to play, wait a little, then advance to the next one
                    setTimeout(() => {
                        this.advanceToNextShip(log);
                    }, 2000);
                } else if (this.playing_ship.getPlayer().ai) {
                    // If the ship is managed by an AI, let it get to work
                    this.playing_ship.getPlayer().ai.playShip(this.playing_ship);
                }
            }

            if (log) {
                this.log.add(new ShipChangeEvent(previous_ship, this.playing_ship));
            }
        }

        // Start the battle
        //  This will call all necessary initialization steps (initiative, placement...)
        //  This will not add any event to the battle log
        start(): void {
            this.ended = false;
            this.placeShips();
            this.throwInitiative();
            this.play_order.forEach((ship: Ship) => {
                ship.updateAttributes();
                ship.restoreHealth();
            });
            this.advanceToNextShip();
        }

        // Force an injection of events in the battle log to simulate the initial state
        //  For instance, this may be called after 'start', to use the log subscription system
        //  to initialize a battle UI
        //  Attributes 'play_order' and 'playing_ship' should be defined before calling this
        injectInitialEvents(): void {
            var log = this.log;

            // Simulate initial ship placement
            this.play_order.forEach((ship: Ship) => {
                log.add(new MoveEvent(ship, ship.arena_x, ship.arena_y));
            });

            // Simulate game turn
            log.add(new ShipChangeEvent(this.playing_ship, this.playing_ship));
        }

        // Defines the initial ship positions for one fleet
        //  x and y are the center of the fleet placement
        //  facing_angle is the forward angle in radians
        private placeFleetShips(fleet: Fleet, x: number, y: number, facing_angle: number): void {
            var side_angle = facing_angle + Math.PI * 0.5;
            var spacing = 150;
            var total_length = spacing * (fleet.ships.length - 1);
            var dx = Math.cos(side_angle);
            var dy = Math.sin(side_angle);
            x -= dx * total_length * 0.5;
            y -= dy * total_length * 0.5;
            for (var i = 0; i < fleet.ships.length; i++) {
                fleet.ships[i].setArenaPosition(x + i * dx * spacing, y + i * dy * spacing);
                fleet.ships[i].setArenaFacingAngle(facing_angle);
            }
        }
    }
}
