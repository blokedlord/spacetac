module SpaceTac.View {
    // Interactive view of a Battle
    export class BattleView extends Phaser.State {

        // Displayed battle
        battle: Game.Battle;

        // Interacting player
        player: Game.Player;

        // UI container
        ui: UIGroup;

        // Battleground container
        arena: Phaser.Group;

        // Targetting mode (null if we're not in this mode)
        targetting: Targetting;

        // Init the view, binding it to a specific battle
        init(player, battle) {
            this.player = player;
            this.battle = battle;
            this.targetting = null;
        }

        // Create view graphics
        create() {
            var game = this.game;
            var player = this.player;

            this.ui = new UIGroup(game);
            game.add.existing(this.ui);
            var ui = this.ui;

            this.arena = new Phaser.Group(game);
            game.add.existing(this.arena);
            var arena = this.arena;

            game.stage.backgroundColor = 0x000000;

            // Add ship buttons to UI
            this.battle.play_order.forEach(function(ship: Game.Ship, rank: number){
                new Widgets.ShipListItem(ui, 0, rank * 50, ship.getPlayer() === player);
            });

            // Add ship sprites to arena
            this.battle.play_order.forEach(function(ship: Game.Ship){
                new Arena.ShipArenaSprite(arena, ship);
            });
        }

        // Leaving the view, we unbind the battle
        shutdown() {
            this.battle = null;

            this.ui.destroy();
            this.ui = null;

            this.arena.destroy();
            this.arena = null;
        }

        // Enter targetting mode
        //  While in this mode, the Targetting object will receive hover and click events, and handle them
        enterTargettingMode(): Targetting {
            this.targetting = new Targetting(this);
            return this.targetting;
        }

        // Exit targetting mode
        exitTargettingMode(): void {
            this.targetting = null;
        }
    }
}
