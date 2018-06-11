/// <reference path="../BaseView.ts"/>

module TK.SpaceTac.UI {
    /**
     * Interface for interacting with a ship (hover and click)
     */
    export interface IShipButton {
        cursorOnShip: (ship: Ship) => void;
        cursorOffShip: (ship: Ship) => void;
        cursorClicked: () => void;
    }

    /**
     * Interactive view of a Battle
     */
    export class BattleView extends BaseView implements IShipButton {
        // Internal battle state
        actual_battle!: Battle

        // Displayed battle state
        battle!: Battle

        // Interacting player
        player!: Player

        // Multiplayer sharing
        multi!: MultiBattle

        // Layers
        layer_background!: UIContainer
        layer_arena!: UIContainer
        layer_borders!: UIContainer
        layer_overlay!: UIContainer
        layer_sheets!: UIContainer

        // Battleground container
        arena!: Arena

        // Background image
        background!: UIImage | null

        // Targetting mode (null if we're not in this mode)
        targetting!: Targetting

        // Ship list
        ship_list!: ShipList

        // Action bar
        action_bar!: ActionBar

        // Currently hovered ship
        ship_hovered!: Ship | null

        // Ship tooltip
        ship_tooltip!: ShipTooltip

        // Character sheet
        character_sheet!: CharacterSheet

        // Subscription to the battle log
        log_processor!: LogProcessor

        // True if player interaction is allowed
        interacting!: boolean

        // Tactical mode toggle
        toggle_tactical_mode!: Toggle

        // Toggle for the splash screen display
        splash = true

        // Init the view, binding it to a specific battle
        init(data: { player: Player, battle: Battle }) {
            super.init(data);

            this.player = data.player;
            this.actual_battle = data.battle;
            this.battle = duplicate(data.battle, <any>TK.SpaceTac);
            this.ship_hovered = null;
            this.background = null;
            this.multi = new MultiBattle();

            this.toggle_tactical_mode = new Toggle(
                () => this.arena.setTacticalMode(true),
                () => this.arena.setTacticalMode(false)
            );
        }

        // Create view graphics
        create() {
            super.create();

            var game = this.game;
            this.interacting = false;
            this.log_processor = new LogProcessor(this);

            let builder = new UIBuilder(this);

            // Add layers
            this.layer_background = this.getLayer("background");
            this.layer_arena = this.getLayer("arena");
            this.layer_borders = this.getLayer("borders");
            this.layer_overlay = this.getLayer("overlay");
            this.layer_sheets = this.getLayer("character_sheet");

            // Background
            this.background = builder.in(this.layer_background).image("battle-background");

            // Add arena (local battlefield map)
            this.arena = new Arena(this, this.layer_arena);
            this.arena.callbacks_hover.push(bound(this, "cursorHovered"));
            this.arena.callbacks_click.push(bound(this, "cursorClicked"));

            // Add UI elements
            this.action_bar = new ActionBar(this);
            this.action_bar.setPosition(0, this.getHeight() - 132);
            this.ship_list = new ShipList(this, this.battle, this.player, this.toggle_tactical_mode, this,
                this.layer_borders, this.getWidth() - 112, 0);
            this.ship_list.bindToLog(this.log_processor);
            this.ship_tooltip = new ShipTooltip(this);
            this.character_sheet = new CharacterSheet(this, CharacterSheetMode.DISPLAY);
            this.character_sheet.moveToLayer(this.layer_sheets);

            // Targetting info
            this.targetting = new Targetting(this, this.action_bar, this.toggle_tactical_mode, this.arena.range_hint);
            this.targetting.moveToLayer(this.arena.layer_targetting);

            // BGM
            this.audio.startMusic("mechanolith", 0.2);

            // Key mapping
            this.inputs.bind("t", "Show tactical view", () => this.toggle_tactical_mode.manipulate("keyboard")(3000));
            this.inputs.bind("Enter", "Validate action", () => this.validationPressed());
            this.inputs.bind(" ", "Validate action", () => this.validationPressed());
            this.inputs.bind("Escape", "Cancel action", () => this.action_bar.actionEnded());
            range(10).forEach(i => this.inputs.bind(`Numpad${i % 10}`, `Action/target ${i}`, () => this.numberPressed(i)));
            range(10).forEach(i => this.inputs.bind(`Digit${i % 10}`, `Action/target ${i}`, () => this.numberPressed(i)));
            this.inputs.bindCheat("w", "Win current battle", () => {
                nn(this.player.getCheats()).win();
                this.log_processor.fastForward();
            });
            this.inputs.bindCheat("x", "Lose current battle", () => {
                nn(this.player.getCheats()).lose();
                this.log_processor.fastForward();
            });
            this.inputs.bindCheat("a", "Use AI to play", () => this.playAI());

            // "Battle" animation, then start processing the log
            if (this.battle.ended) {
                this.endBattle();
            } else if (this.splash) {
                this.showSplash().then(() => {
                    this.log_processor.start();
                });
            } else {
                this.log_processor.start();
            }

            // If we are on a remote session, start the exchange
            if (!this.session.primary && this.gameui.session_token) {
                // TODO handle errors or timeout
                this.multi.setup(this, this.actual_battle, this.gameui.session_token, false);
            }
        }

        shutdown() {
            super.shutdown();

            this.log_processor.destroy();
        }

        /**
         * Make the AI play current ship
         * 
         * If the AI is already playing, do nothing
         */
        playAI(): void {
            if (this.session.spectator) {
                return;
            }

            if (this.actual_battle.playAI(this.debug)) {
                if (this.interacting) {
                    this.action_bar.setShip(new Ship());
                }
                this.setInteractionEnabled(false);
            }
        }

        /**
         * Apply an action to the actual battle
         */
        applyAction(action: BaseAction, target?: Target): boolean {
            if (this.session.spectator) {
                return false;
            }

            let ship = this.actual_battle.playing_ship;
            if (ship) {
                let ship_action = ship.actions.getById(action.id);
                if (ship_action) {
                    let result = this.actual_battle.applyOneAction(action.id, target);
                    if (result) {
                        this.setInteractionEnabled(false);
                    }
                    return result;
                } else {
                    console.error("Action not found in available list", action, ship.actions);
                    return false;
                }
            } else {
                console.error("Action not applied - ship not playing");
                return false;
            }
        }

        /**
         * Display the splash screen at the start of battle
         */
        showSplash(): Promise<void> {
            let splash = new BattleSplash(this, this.battle.fleets[0], this.battle.fleets[1]);
            return splash.start(this.layer_overlay);
        }

        /**
         * Handle the pressing of a number key
         * 
         * It may first be used to select an action to play, then to select a target
         */
        numberPressed(num: number): void {
            if (this.interacting) {
                if (this.targetting.active) {
                    let ship = ifirst(this.battle.iships(true), ship => this.battle.getPlayOrder(ship) == num % 10);
                    if (ship) {
                        this.targetting.setTarget(Target.newFromShip(ship));
                    }
                } else {
                    this.action_bar.keyActionPressed(num - 1);
                }
            }
        }

        /**
         * Handle the pression of a validation key (enter or space)
         */
        validationPressed(): void {
            if (this.targetting.active) {
                this.targetting.validate((action, target) => this.applyAction(action, target));
            } else {
                this.action_bar.keyActionPressed(-1);
            }
        }

        /**
         * Method called when the arena cursor is hovered
         */
        cursorHovered(location: ArenaLocation | null, ship: Ship | null) {
            if (this.targetting.active) {
                this.targetting.setTargetFromLocation(location);
            } else {
                if (ship && this.ship_hovered != ship) {
                    this.cursorOnShip(ship);
                } else if (!ship && this.ship_hovered) {
                    this.cursorOffShip(this.ship_hovered);
                }
            }
        }

        /**
         * Method called when cursor starts hovering over a ship (or its icon)
         */
        cursorOnShip(ship: Ship): void {
            if (ship.alive) {
                this.setShipHovered(ship);
            }
        }

        /**
         * Method called when cursor stops hovering over a ship (or its icon)
         */
        cursorOffShip(ship: Ship): void {
            if (this.ship_hovered === ship) {
                this.setShipHovered(null);
            }
        }

        /**
         * Method called when cursor has been clicked (in space or on a ship)
         */
        cursorClicked(): void {
            if (this.targetting.active) {
                this.validationPressed();
            } else if (this.ship_hovered && this.player.is(this.ship_hovered.fleet.player) && this.interacting) {
                this.character_sheet.show(this.ship_hovered);
                this.setShipHovered(null);
            } else {
                this.log_processor.fastForward();
            }
        }

        /**
         * Set the currently hovered ship
         */
        setShipHovered(ship: Ship | null): void {
            this.ship_hovered = ship;
            this.arena.setShipHovered(ship);
            this.ship_list.setHovered(ship);

            if (ship) {
                this.ship_tooltip.setShip(ship);
            } else {
                this.ship_tooltip.hide();
            }
        }

        // Enable or disable the global player interaction
        //  Disable interaction when it is the AI turn, or when the current ship can't play
        setInteractionEnabled(enabled: boolean): void {
            if (this.session.spectator) {
                enabled = false;
            }

            if (enabled != this.interacting) {
                this.action_bar.setInteractivity(enabled);
                this.exitTargettingMode();
                this.interacting = enabled;

                if (!enabled) {
                    this.setShipHovered(null);
                }
            }
        }

        // Enter targetting mode
        //  While in this mode, the Targetting object will receive hover and click events, and handle them
        enterTargettingMode(ship: Ship, action: BaseAction, mode: ActionTargettingMode): Targetting | null {
            if (!this.interacting) {
                return null;
            }

            this.setShipHovered(null);

            this.targetting.setAction(ship, action, mode);
            return this.targetting;
        }

        // Exit targetting mode
        exitTargettingMode(): void {
            this.targetting.setAction(null, null);
        }

        /**
         * End the battle and show the outcome dialog
         */
        endBattle() {
            let battle = this.actual_battle;
            if (battle.outcome) {
                this.setInteractionEnabled(false);

                this.session.setBattleEnded();

                battle.stats.processLog(battle.log, this.player.fleet);

                new OutcomeDialog(this, this.player, battle.outcome, battle.stats);
            } else {
                console.error("Battle not ended !");
            }
        }

        /**
         * Exit the battle, and go back to map
         */
        exitBattle() {
            this.session.exitBattle();
            this.backToRouter();
        }

        /**
         * Revert the battle, and go back to map
         */
        revertBattle() {
            this.session.revertBattle();
            this.backToRouter();
        }
    }
}
