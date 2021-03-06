module TK.SpaceTac.UI {
    /**
     * Ship sprite in the arena, with corresponding HUD
     */
    export class ArenaShip extends UIContainer {
        // Link to the view
        arena: Arena
        battleview: BattleView

        // Link to displayed ship
        ship: Ship

        // Boolean to indicate if it is an enemy ship
        enemy: boolean

        // Ship sprite
        sprite: UIImage

        // Stasis effect
        stasis: UIImage

        // HSP display
        hsp: UIContainer
        power_text: UIText
        life_hull: UIContainer
        life_shield: UIContainer
        life_evasion: UIContainer
        toggle_hsp: Toggle

        // Play order
        play_order_container: UIContainer
        play_order: UIText
        toggle_play_order: Toggle

        // Frames to indicate the owner, if the ship is hovered, and if it is hovered
        frame_owner: UIImage
        frame_hover: UIImage

        // Effects display
        active_effects_display: UIContainer
        effects_radius: UIGraphics
        effects_messages: UIContainer
        effects_messages_toggle: Toggle

        // Create a ship sprite usable in the Arena
        constructor(parent: Arena, ship: Ship) {
            super(parent.view);
            this.arena = parent;
            this.battleview = parent.view;

            let builder = new UIBuilder(this.battleview).in(this);

            this.ship = ship;
            this.enemy = !this.battleview.player.is(this.ship.fleet.player);

            // Add effects radius
            this.effects_radius = builder.graphics("effect-radius");

            // Add frame indicating which side this ship is on
            this.frame_owner = builder.image(this.enemy ? "battle-hud-ship-enemy" : "battle-hud-ship-own", 0, 0, true);
            this.setPlaying(false);
            this.frame_hover = builder.image("battle-hud-ship-hover", 0, 0, true);
            this.frame_hover.setVisible(false);

            // Add ship sprite
            this.sprite = builder.image(`ship-${ship.model.code}-sprite`, 0, 0, true);
            this.sprite.setRotation(ship.arena_angle);

            // Add stasis effect
            this.stasis = builder.image("battle-hud-ship-stasis", 0, 0, true);
            this.stasis.setAlpha(0.9);
            this.stasis.setVisible(!ship.alive);

            // HSP display
            this.hsp = builder.container("hsp", 0, 34);
            builder.in(this.hsp).image("battle-hud-hsp-background", 0, 0, true);
            this.power_text = builder.in(this.hsp).text(`${ship.getValue("power")}`, -42, 0,
                { size: 13, color: "#ffdd4b", bold: true, shadow: true, center: true });
            this.life_hull = builder.in(this.hsp).container("hull");
            this.life_shield = builder.in(this.hsp).container("shield");
            this.life_evasion = builder.in(this.hsp).container("evasion");
            this.toggle_hsp = this.battleview.animations.newVisibilityToggle(this.hsp, 200, false);

            // Play order display
            this.play_order_container = builder.container("play_order", -44, 0);
            builder.in(this.play_order_container).image("battle-hud-ship-play-order", 0, 0, true);
            this.play_order = builder.in(this.play_order_container).text("", -2, 1, {
                size: 12, bold: true, color: "#d1d1d1", shadow: true, center: true
            });
            this.toggle_play_order = this.battleview.animations.newVisibilityToggle(this.play_order_container, 200, false);

            // Effects display
            this.active_effects_display = builder.container("active-effects", 0, -44);
            this.effects_messages = builder.container("effects-messages");
            this.effects_messages_toggle = this.battleview.animations.newVisibilityToggle(this.effects_messages, 500, false);

            this.updatePlayOrder();
            this.updateHull(this.ship.getValue("hull"));
            this.updateShield(this.ship.getValue("shield"));
            this.updateEvasion(this.ship.getAttribute("evasion"));
            this.updateActiveEffects();
            this.updateEffectsRadius();

            // Set location
            if (this.battleview.battle.cycle == 1 && this.battleview.battle.play_index == 0 && ship.alive && this.battleview.player.is(ship.fleet.player)) {
                this.setPosition(ship.arena_x - 500 * Math.cos(ship.arena_angle), ship.arena_y - 500 * Math.sin(ship.arena_angle));
                this.moveToArenaLocation(ship.arena_x, ship.arena_y, ship.arena_angle, 1);
            } else {
                this.moveToArenaLocation(ship.arena_x, ship.arena_y, ship.arena_angle, 0);
            }

            // Log processing
            this.battleview.log_processor.register(diff => this.processBattleDiff(diff));
            this.battleview.log_processor.registerForShip(ship, diff => this.processShipDiff(diff));
        }

        jasmineToString(): string {
            return `ArenaShip ${this.ship.jasmineToString()}`;
        }

        /**
         * Process a battle diff
         */
        private processBattleDiff(diff: BaseBattleDiff) {
            if (diff instanceof ShipChangeDiff) {
                this.updatePlayOrder();
            }
            return {};
        }

        /**
         * Process a ship diff
         */
        private processShipDiff(diff: BaseBattleShipDiff): LogProcessorDelegate {
            let timer = this.battleview.timer;

            if (diff instanceof ShipEffectAddedDiff || diff instanceof ShipEffectRemovedDiff) {
                return {
                    background: async () => this.updateActiveEffects()
                }
            } else if (diff instanceof ShipValueDiff) {
                return {
                    background: async (speed: number) => {
                        if (speed) {
                            this.toggle_hsp.manipulate("value")(true);
                        }

                        if (diff.code == "hull") {
                            if (speed) {
                                this.updateHull(this.ship.getValue("hull") - diff.diff, diff.diff);
                                await timer.sleep(1000 / speed);
                                this.updateHull(this.ship.getValue("hull"));
                                await timer.sleep(500 / speed);
                            } else {
                                this.updateHull(this.ship.getValue("hull"));
                            }
                        } else if (diff.code == "shield") {
                            if (speed) {
                                this.updateShield(this.ship.getValue("shield") - diff.diff, diff.diff);
                                await timer.sleep(1000 / speed);
                                this.updateShield(this.ship.getValue("shield"));
                                await timer.sleep(500 / speed);
                            } else {
                                this.updateShield(this.ship.getValue("shield"));
                            }
                        } else if (diff.code == "power") {
                            this.power_text.setText(`${this.ship.getValue("power")}`);
                            if (speed) {
                                await this.battleview.animations.blink(this.power_text, { speed: speed });
                            }
                        }

                        if (speed) {
                            await timer.sleep(500 / speed);
                            this.toggle_hsp.manipulate("value")(false);
                        }
                    }
                }
            } else if (diff instanceof ShipAttributeDiff) {
                return {
                    background: async (speed: number) => {
                        if (speed) {
                            this.displayAttributeChanged(diff, speed);
                            if (diff.code == "evasion") {
                                // TODO diff
                                this.updateEvasion(this.ship.getAttribute("evasion"));
                                this.toggle_hsp.manipulate("attribute")(2000 / speed);
                            }
                            await timer.sleep(2000 / speed);
                        }
                    }
                }
            } else if (diff instanceof ShipDamageDiff) {
                return {
                    background: async (speed: number) => {
                        if (speed) {
                            await this.displayEffect(`${diff.theoretical} damage`, false, speed);
                            await timer.sleep(1000 / speed);
                        }
                    }
                }
            } else if (diff instanceof ShipActionToggleDiff) {
                return {
                    foreground: async (speed: number) => {
                        let action = this.ship.actions.getById(diff.action);
                        if (action) {
                            if (speed) {
                                if (diff.activated) {
                                    await this.displayEffect(`${action.name} ON`, true, speed);
                                } else {
                                    await this.displayEffect(`${action.name} OFF`, false, speed);
                                }
                            }

                            this.updateEffectsRadius();
                            await timer.sleep(500 / speed);
                        }
                    }
                }
            } else if (diff instanceof ShipActionUsedDiff) {
                let action = this.ship.actions.getById(diff.action);
                if (action) {
                    if (action instanceof EndTurnAction) {
                        return {
                            foreground: async (speed: number) => {
                                if (speed) {
                                    await this.displayEffect("End turn", true, speed);
                                    await timer.sleep(500 / speed);
                                }
                            }
                        }
                    } else if (!(action instanceof ToggleAction)) {
                        let action_name = action.name;
                        return {
                            foreground: async (speed: number) => {
                                if (speed) {
                                    await this.displayEffect(action_name, true, speed);
                                    await timer.sleep(300 / speed);
                                }
                            }
                        }
                    } else {
                        return {};
                    }
                } else {
                    return {};
                }
            } else if (diff instanceof ShipMoveDiff) {
                let func = async (speed: number) => {
                    if (speed) {
                        await this.moveToArenaLocation(diff.start.x, diff.start.y, diff.start.angle, 0);
                        await this.moveToArenaLocation(diff.end.x, diff.end.y, diff.end.angle, speed, !!diff.engine);
                    } else {
                        await this.moveToArenaLocation(diff.end.x, diff.end.y, diff.end.angle, 0);
                    }
                };
                if (diff.engine) {
                    return { foreground: func };
                } else {
                    return { background: func };
                }
            } else if (diff instanceof VigilanceAppliedDiff) {
                let action = this.ship.actions.getById(diff.action);
                return {
                    foreground: async (speed: number) => {
                        if (speed && action) {
                            await this.displayEffect(`${action.name} (vigilance)`, true, speed);
                            await timer.sleep(300 / speed);
                        }
                    }
                }
            } else {
                return {};
            }
        }

        /**
         * Set the hovered state on this ship
         * 
         * This will show the information HUD accordingly
         */
        setHovered(hovered: boolean, tactical: boolean) {
            let client = tactical ? "tactical" : "hover";

            if (hovered && this.ship.alive) {
                this.toggle_hsp.manipulate(client)(true);
                if (tactical) {
                    this.toggle_play_order.manipulate(client)(true);
                }
            } else {
                this.toggle_hsp.manipulate(client)(false);
                this.toggle_play_order.manipulate(client)(false);
            }

            this.battleview.animations.setVisible(this.frame_hover, hovered && this.ship.alive && !tactical, 200);
        }

        /**
         * Set the playing state on this ship
         * 
         * This will alter the HUD frame to show this state
         */
        async setPlaying(playing: boolean, animate = true): Promise<void> {
            this.frame_owner.alpha = playing ? 1 : 0.35;
            this.frame_owner.visible = this.ship.alive;

            if (playing && animate) {
                this.battleview.audio.playOnce("battle-ship-change");
                await this.battleview.animations.blink(this.frame_owner);
            }
        }

        /**
         * Activate the dead effect (stasis)
         */
        setDead(dead = true) {
            if (dead) {
                //this.displayEffect("stasis", false);
                this.stasis.visible = true;
                this.stasis.alpha = 0;
                this.battleview.animations.blink(this.stasis, { alpha_on: 0.9, alpha_off: 0.7 });
            } else {
                this.stasis.visible = false;
            }
            this.setPlaying(false);
        }

        /**
         * Move the sprite to a location
         * 
         * Return the duration of animation
         */
        async moveToArenaLocation(x: number, y: number, facing_angle: number, speed = 1, engine = true): Promise<void> {
            if (speed) {
                if (engine) {
                    await this.arena.view.animations.moveInSpace(this, x, y, facing_angle, this.sprite, speed);
                } else {
                    await this.arena.view.animations.moveTo(this, x, y, facing_angle, this.sprite, speed);
                }
            } else {
                this.setPosition(x, y);
                this.sprite.setRotation(facing_angle);
            }
        }

        /**
         * Briefly show an effect on this ship
         */
        async displayEffect(message: string, beneficial: boolean, speed: number) {
            if (!this.effects_messages.visible) {
                this.effects_messages.removeAll(true);
            }

            if (!speed) {
                return;
            }

            let builder = new UIBuilder(this.arena.view, this.effects_messages);
            builder.text(message, 0, 20 * this.effects_messages.length, {
                color: beneficial ? "#afe9c6" : "#e9afaf"
            });

            let arena = this.battleview.arena.getBoundaries();
            this.effects_messages.setPosition(
                (this.ship.arena_x < 100) ? 0 : ((this.ship.arena_x > arena.width - 100) ? (-this.effects_messages.width) : (-this.effects_messages.width * 0.5)),
                (this.ship.arena_y < arena.height * 0.9) ? 60 : (-60 - this.effects_messages.height)
            );

            this.effects_messages_toggle.manipulate("added")(1400 / speed);
            await this.battleview.timer.sleep(1500 / speed);
        }

        /**
         * Display interesting changes in ship attributes
         */
        displayAttributeChanged(event: ShipAttributeDiff, speed = 1) {
            // TODO show final diff, not just cumulative one
            let diff = (event.added.cumulative || 0) - (event.removed.cumulative || 0);
            if (diff) {
                let name = SHIP_VALUES_NAMES[event.code];
                this.displayEffect(`${name} ${diff < 0 ? "-" : "+"}${Math.abs(diff)}`, diff >= 0, speed);
            }
        }

        /**
         * Update the play order indicator
         */
        updatePlayOrder(): void {
            let play_order = this.battleview.battle.getPlayOrder(this.ship);
            if (play_order == 0) {
                this.play_order.setText("-");
            } else {
                this.play_order.setText(play_order.toString());
            }
        }

        /**
         * Reposition the HSP indicators
         */
        repositionLifeIndicators(): void {
            this.life_hull.x = -25;
            this.life_shield.x = this.life_hull.x + (this.life_hull.length * 9);
            this.life_evasion.x = this.life_shield.x + (this.life_shield.length * 9);
        }

        /**
         * Update the hull indicator
         */
        updateHull(current: number, diff = 0): void {
            let builder = new UIBuilder(this.battleview, this.life_hull);
            builder.clear();

            range(current).forEach(i => {
                builder.image("battle-hud-hsp-hull", i * 9, 0, true);
            });

            this.repositionLifeIndicators();
        }

        /**
         * Update the shield indicator
         */
        updateShield(current: number, diff = 0): void {
            let builder = new UIBuilder(this.battleview, this.life_shield);
            builder.clear();

            range(current).forEach(i => {
                builder.image("battle-hud-hsp-shield", i * 9, 0, true);
            });

            this.repositionLifeIndicators();
        }

        /**
         * Update the evasion indicator
         */
        updateEvasion(current: number, diff = 0): void {
            let builder = new UIBuilder(this.battleview, this.life_evasion);
            builder.clear();

            range(current).forEach(i => {
                builder.image("battle-hud-hsp-evasion", i * 9, 0, true);
            });

            this.repositionLifeIndicators();
        }

        /**
         * Update the list of effects active on the ship
         */
        updateActiveEffects() {
            this.active_effects_display.removeAll();

            let effects = this.ship.active_effects.list().filter(effect => !effect.isInternal());

            let count = effects.length;
            if (count) {
                let positions = UITools.evenlySpace(70, 17, count);

                effects.forEach((effect, index) => {
                    let name = effect.isBeneficial() ? "battle-hud-ship-effect-good" : "battle-hud-ship-effect-bad";
                    let dot = this.battleview.newImage(name, positions[index] - 35, 0);
                    this.active_effects_display.add(dot);
                });
            }
        }

        /**
         * Update the activated effects radius
         */
        updateEffectsRadius(): void {
            this.effects_radius.clear();
            this.ship.actions.listToggled().forEach(action => {
                let color = (action instanceof VigilanceAction) ? 0xf4bf42 : 0xe9f2f9;
                this.effects_radius.lineStyle(2, color, 0.5);
                this.effects_radius.fillStyle(color, 0.1);
                this.effects_radius.fillCircle(0, 0, action.radius);
            });
        }
    }
}
