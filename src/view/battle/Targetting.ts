module TS.SpaceTac.View {
    // Targetting system
    //  Allows to pick a target for an action
    export class Targetting {
        // Initial target (as pointed by the user)
        target_initial: Game.Target;
        line_initial: Phaser.Graphics;

        // Corrected target (applying action rules)
        target_corrected: Game.Target;
        line_corrected: Phaser.Graphics;

        // Circle for effect radius
        blast_radius: number;
        blast: Phaser.Graphics;

        // Signal to receive hovering events
        targetHovered: Phaser.Signal;

        // Signal to receive targetting events
        targetSelected: Phaser.Signal;

        // AP usage display
        ap_interval: number = 0;
        ap_indicators: Phaser.Image[] = [];

        // Access to the parent battle view
        private battleview: BattleView;

        // Source of the targetting
        private source: PIXI.DisplayObject;

        // Create a default targetting mode
        constructor(battleview: BattleView) {
            this.battleview = battleview;
            this.targetHovered = new Phaser.Signal();
            this.targetSelected = new Phaser.Signal();

            // Visual effects
            if (battleview) {
                this.blast = new Phaser.Graphics(battleview.game, 0, 0);
                this.blast.visible = false;
                battleview.arena.add(this.blast);
                this.line_initial = new Phaser.Graphics(battleview.game, 0, 0);
                this.line_initial.visible = false;
                battleview.arena.add(this.line_initial);
                this.line_corrected = new Phaser.Graphics(battleview.game, 0, 0);
                this.line_corrected.visible = false;
                battleview.arena.add(this.line_corrected);
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
                    this.line_initial.lineStyle(2, 0xFF0000);
                    this.line_initial.moveTo(this.source.x, this.source.y);
                    this.line_initial.lineTo(this.target_initial.x, this.target_initial.y);
                    this.line_initial.visible = true;
                } else {
                    this.line_initial.visible = false;
                }

                if (this.source && this.target_corrected) {
                    this.line_corrected.clear();
                    this.line_corrected.lineStyle(3, 0x00FF00);
                    this.line_corrected.moveTo(this.source.x, this.source.y);
                    this.line_corrected.lineTo(this.target_corrected.x, this.target_corrected.y);
                    this.line_corrected.visible = true;
                } else {
                    this.line_corrected.visible = false;
                }

                if (this.target_corrected && this.blast_radius) {
                    this.blast.clear();
                    this.blast.lineStyle(5, 0x208620, 0.4);
                    this.blast.beginFill(0x60D860, 0.2);
                    this.blast.drawCircle(this.target_corrected.x, this.target_corrected.y, this.blast_radius * 2);
                    this.blast.endFill();
                    this.blast.visible = true;
                } else {
                    this.blast.visible = false;
                }

                this.updateApIndicators();
            }
        }

        // Update the AP indicators display
        updateApIndicators() {
            // Get indicator count
            let count = 0;
            let distance = 0;
            if (this.line_corrected.visible && this.ap_interval > 0) {
                distance = this.target_corrected.getDistanceTo(Game.Target.newFromLocation(this.source.x, this.source.y)) - 0.00001;
                count = Math.ceil(distance / this.ap_interval);
            }

            // Adjust object count to match
            while (this.ap_indicators.length < count) {
                let indicator = new Phaser.Image(this.battleview.game, 0, 0, "battle-arena-ap-indicator");
                indicator.anchor.set(0.5, 0.5);
                this.battleview.arena.addChild(indicator);
                this.ap_indicators.push(indicator);
            }
            while (this.ap_indicators.length > count) {
                this.ap_indicators[this.ap_indicators.length - 1].destroy();
                this.ap_indicators.pop();
            }

            // Spread indicators
            if (count > 0 && distance > 0) {
                let dx = this.ap_interval * (this.target_corrected.x - this.source.x) / distance;
                let dy = this.ap_interval * (this.target_corrected.y - this.source.y) / distance;
                this.ap_indicators.forEach((indicator, index) => {
                    indicator.position.set(this.source.x + dx * index, this.source.y + dy * index);
                });
            }
        }

        // Set the source sprite for the targetting (for visual effects)
        setSource(sprite: PIXI.DisplayObject) {
            this.source = sprite;
        }

        // Set a target from a target object
        setTarget(target: Game.Target, dispatch: boolean = true, blast_radius: number = 0): void {
            this.target_corrected = target;
            this.blast_radius = blast_radius;
            if (dispatch) {
                this.target_initial = target ? Game.Tools.copyObject(target) : null;
                this.targetHovered.dispatch(this.target_corrected);
            }
            this.update();
        }

        // Set no target
        unsetTarget(dispatch: boolean = true): void {
            this.setTarget(null, dispatch);
        }

        // Set the current target ship (when hovered)
        setTargetShip(ship: Game.Ship, dispatch: boolean = true): void {
            this.setTarget(Game.Target.newFromShip(ship), dispatch);
        }

        // Set the current target in space (when hovered)
        setTargetSpace(x: number, y: number, dispatch: boolean = true): void {
            this.setTarget(Game.Target.newFromLocation(x, y));
        }

        // Validate the current target (when clicked)
        //  This will broadcast the targetSelected signal
        validate(): void {
            this.targetSelected.dispatch(this.target_corrected);
        }
    }
}
