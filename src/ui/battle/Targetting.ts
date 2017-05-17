module TS.SpaceTac.UI {
    // Targetting system
    //  Allows to pick a target for an action
    export class Targetting {
        // Initial target (as pointed by the user)
        target_initial: Target | null;
        line_initial: Phaser.Graphics;

        // Corrected target (applying action rules)
        target_corrected: Target | null;
        line_corrected: Phaser.Graphics;

        // Circle for effect radius
        blast_radius: number;
        blast: Phaser.Image;

        // Signal to receive hovering events
        targetHovered: Phaser.Signal;

        // Signal to receive targetting events
        targetSelected: Phaser.Signal;

        // AP usage display
        ap_interval: number = 0;
        ap_indicators: Phaser.Image[] = [];

        // Access to the parent battle view
        private battleview: BattleView | null;

        // Source of the targetting
        private source: PIXI.DisplayObject | null;

        // Create a default targetting mode
        constructor(battleview: BattleView | null) {
            this.battleview = battleview;
            this.targetHovered = new Phaser.Signal();
            this.targetSelected = new Phaser.Signal();

            // Visual effects
            if (battleview) {
                this.blast = new Phaser.Image(battleview.game, 0, 0, "battle-arena-blast");
                this.blast.anchor.set(0.5, 0.5);
                this.blast.visible = false;
                battleview.arena.layer_targetting.add(this.blast);
                this.line_initial = new Phaser.Graphics(battleview.game, 0, 0);
                this.line_initial.visible = false;
                battleview.arena.layer_targetting.add(this.line_initial);
                this.line_corrected = new Phaser.Graphics(battleview.game, 0, 0);
                this.line_corrected.visible = false;
                battleview.arena.layer_targetting.add(this.line_corrected);
            }

            this.source = null;
            this.target_initial = null;
            this.target_corrected = null;
        }

        // Destructor
        destroy(): void {
            this.targetHovered.dispose();
            this.targetSelected.dispose();
            if (this.line_initial) {
                this.line_initial.destroy();
            }
            if (this.line_corrected) {
                this.line_corrected.destroy();
            }
            if (this.blast) {
                this.blast.destroy();
            }
            this.ap_indicators.forEach(indicator => indicator.destroy());
            if (this.battleview) {
                this.battleview.arena.highlightTargets([]);
            }
        }

        // Set AP indicators to display at fixed interval along the line
        setApIndicatorsInterval(interval: number) {
            this.ap_interval = interval;
            this.updateApIndicators();
        }

        // Update visual effects for current targetting
        update(): void {
            if (this.battleview) {
                if (this.source && this.target_initial) {
                    this.line_initial.clear();
                    this.line_initial.lineStyle(3, 0x666666);
                    this.line_initial.moveTo(this.source.x, this.source.y);
                    this.line_initial.lineTo(this.target_initial.x, this.target_initial.y);
                    this.line_initial.visible = true;
                } else {
                    this.line_initial.visible = false;
                }

                if (this.source && this.target_corrected) {
                    this.line_corrected.clear();
                    this.line_corrected.lineStyle(6, this.ap_interval ? 0xe09c47 : 0xDC6441);
                    this.line_corrected.moveTo(this.source.x, this.source.y);
                    this.line_corrected.lineTo(this.target_corrected.x, this.target_corrected.y);
                    this.line_corrected.visible = true;
                } else {
                    this.line_corrected.visible = false;
                }

                if (this.target_corrected && this.blast_radius) {
                    this.blast.position.set(this.target_corrected.x, this.target_corrected.y);
                    this.blast.scale.set(this.blast_radius * 2 / 365);
                    this.blast.visible = true;

                    let targets = this.battleview.battle.collectShipsInCircle(this.target_corrected, this.blast_radius, true);
                    this.battleview.arena.highlightTargets(targets);
                } else {
                    this.blast.visible = false;

                    this.battleview.arena.highlightTargets(this.target_corrected && this.target_corrected.ship ? [this.target_corrected.ship] : []);
                }

                this.updateApIndicators();
            }
        }

        // Update the AP indicators display
        updateApIndicators() {
            if (!this.battleview || !this.source) {
                return;
            }

            // Get indicator count
            let count = 0;
            let distance = 0;
            if (this.line_corrected.visible && this.ap_interval > 0 && this.target_corrected) {
                distance = this.target_corrected.getDistanceTo(Target.newFromLocation(this.source.x, this.source.y)) - 0.00001;
                count = Math.ceil(distance / this.ap_interval);
            }

            // Adjust object count to match
            while (this.ap_indicators.length < count) {
                let indicator = new Phaser.Image(this.battleview.game, 0, 0, "battle-arena-ap-indicator");
                indicator.anchor.set(0.5, 0.5);
                this.battleview.arena.layer_targetting.add(indicator);
                this.ap_indicators.push(indicator);
            }
            while (this.ap_indicators.length > count) {
                this.ap_indicators[this.ap_indicators.length - 1].destroy();
                this.ap_indicators.pop();
            }

            // Spread indicators
            if (count > 0 && distance > 0 && this.target_corrected) {
                let source = this.source;
                let dx = this.ap_interval * (this.target_corrected.x - source.x) / distance;
                let dy = this.ap_interval * (this.target_corrected.y - source.y) / distance;
                this.ap_indicators.forEach((indicator, index) => {
                    indicator.position.set(source.x + dx * index, source.y + dy * index);
                });
            }
        }

        // Set the source sprite for the targetting (for visual effects)
        setSource(sprite: PIXI.DisplayObject) {
            this.source = sprite;
        }

        // Set a target from a target object
        setTarget(target: Target | null, dispatch: boolean = true, blast_radius: number = 0): void {
            this.target_corrected = target;
            this.blast_radius = blast_radius;
            if (dispatch) {
                this.target_initial = target ? copy(target) : null;
                this.targetHovered.dispatch(this.target_corrected);
            }
            this.update();
        }

        // Set no target
        unsetTarget(dispatch: boolean = true): void {
            this.setTarget(null, dispatch);
        }

        // Set the current target ship (when hovered)
        setTargetShip(ship: Ship, dispatch: boolean = true): void {
            if (ship.alive) {
                this.setTarget(Target.newFromShip(ship), dispatch);
            }
        }

        // Set the current target in space (when hovered)
        setTargetSpace(x: number, y: number, dispatch: boolean = true): void {
            this.setTarget(Target.newFromLocation(x, y));
        }

        // Validate the current target (when clicked)
        //  This will broadcast the targetSelected signal
        validate(): void {
            this.targetSelected.dispatch(this.target_corrected);
        }
    }
}
