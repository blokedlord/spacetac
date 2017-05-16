module TS.SpaceTac {
    /**
     * A game session, binding a universe and a player
     * 
     * This represents the current state of game
     */
    export class GameSession {
        // "Hopefully"" unique session id
        id: string

        // Game universe
        universe: Universe

        // Current connected player
        player: Player

        constructor() {
            this.id = RandomGenerator.global.id(20);
            this.universe = new Universe();
            this.player = new Player(this.universe);
        }

        /**
         * Get an indicative description of the session (to help identify game saves)
         */
        getDescription(): string {
            let level = this.player.fleet.getLevel();
            let ships = this.player.fleet.ships.length;
            return `Level ${level} - ${ships} ships`;
        }

        // Load a game state from a string
        static loadFromString(serialized: string): GameSession {
            var serializer = new Serializer(TS.SpaceTac);
            return <GameSession>serializer.unserialize(serialized);
        }

        // Serializes the game state to a string
        saveToString(): string {
            var serializer = new Serializer(TS.SpaceTac);
            return serializer.serialize(this);
        }

        // Generate a real single player game (campaign)
        startNewGame(): void {
            var fleet_generator = new FleetGenerator();

            this.universe = new Universe();
            this.universe.generate();

            var start_location = this.universe.getStartLocation();
            start_location.clearEncounter();
            start_location.addShop();

            this.player = new Player(this.universe);
            this.player.fleet = fleet_generator.generate(1, this.player);
            this.player.fleet.setLocation(start_location);
            this.player.fleet.credits = 500;
        }

        // Start a new "quick battle" game
        startQuickBattle(with_ai: boolean = false): void {
            var battle = Battle.newQuickRandom();
            this.player = battle.fleets[0].player;
            this.player.setBattle(battle);
        }

        // Get currently played battle, null when none is in progress
        getBattle(): Battle | null {
            return this.player.getBattle();
        }

        /**
         * Set the end of current battle
         */
        setBattleEnded() {
            let battle = this.getBattle();

            if (battle && battle.ended) {
                // Generate experience
                battle.outcome.grantExperience(battle.fleets);

                if (battle.outcome.winner == this.player.fleet) {
                    // In case of victory, generate loot
                    battle.outcome.createLoot(battle);

                    // In case of victorious encounter, clear the encouter
                    let location = this.player.fleet.location;
                    if (location) {
                        location.clearEncounter();
                    }
                }
            }
        }

        /**
         * Return true if the session has a universe to explore
         */
        hasUniverse(): boolean {
            return this.universe.stars.length > 0;
        }
    }
}
