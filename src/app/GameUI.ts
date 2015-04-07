/// <reference path="definitions/phaser.d.ts"/>

module SpaceTac {
    "use strict";

    // Router between game views
    export class GameUI extends Phaser.Game {
        // Current game session
        session: Game.GameSession;

        // Current focused star system
        star: Game.Star;

        constructor() {
            super(1280, 720, Phaser.AUTO, '-space-tac');

            this.session = new Game.GameSession();
            this.star = null;

            this.state.add('boot', View.Boot);
            this.state.add('preload', View.Preload);
            this.state.add('mainmenu', View.MainMenu);
            this.state.add('router', View.Router);
            this.state.add('battle', View.BattleView);
            this.state.add('universe', View.UniverseMapView);
            this.state.add('starsystem', View.StarSystemView);

            this.state.start('boot');
        }

        // Save current game in local browser storage
        saveGame(): boolean {
            if (typeof(Storage) !== "undefined") {
                localStorage.setItem("spacetac-savegame", this.session.saveToString());
                console.log("Game saved");
                return true;
            } else {
                console.error("localStorage not available");
            }
        }

        // Load current game from local browser storage
        loadGame(): boolean {
            if (typeof(Storage) !== "undefined") {
                var loaded = localStorage.getItem("spacetac-savegame");
                if (loaded) {
                    this.session = Game.GameSession.loadFromString(loaded);
                    console.log("Game loaded");
                    return true;
                } else {
                    console.error("No saved game found");
                    return false;
                }
            } else {
                console.error("localStorage not available");
            }
        }

        // Get the focuses star system
        getFocusedStar(): Game.Star {
            if (this.star && this.star.universe === this.session.universe) {
                return this.star;
            } else {
                return null;
            }
        }
    }
}
