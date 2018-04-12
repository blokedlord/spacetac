module TK.SpaceTac.UI {
    interface PhaserGraphics {
        x: number
        y: number
        rotation: number
        game: Phaser.Game
    };

    /**
     * Interface of an object that may be shown/hidden, with opacity transition.
     */
    interface IAnimationFadeable {
        alpha: number
        visible: boolean
        input?: { enabled: boolean }
        changeStateFrame?: Function
        freezeFrames?: boolean
    }

    /**
     * Manager of all animations.
     * 
     * This is a wrapper around phaser's tweens.
     */
    export class Animations {
        private tweens: Phaser.TweenManager
        private immediate = false

        constructor(tweens: Phaser.TweenManager) {
            this.tweens = tweens;
        }

        /**
         * Set all future animations to be immediate (and synchronous)
         * 
         * This is mostly useful in tests
         */
        setImmediate(immediate = true): void {
            this.immediate = immediate;
        }

        /**
         * Create a tween on an object.
         * 
         * If a previous tween is running for this object, it will be stopped, and a new one will be created.
         */
        private createTween(obj: any): Phaser.Tween {
            this.tweens.removeFrom(obj, false);
            let result = this.tweens.create(obj);
            return result;
        }

        /**
         * Simulate the tween currently applied to an object's property
         * 
         * This may be heavy work and should only be done in testing code.
         */
        simulate(obj: any, property: string, points = 5, duration = 1000): number[] {
            let tween = first(this.tweens.getAll().concat((<any>this.tweens)._add), tween => tween.target === obj && !tween.pendingDelete);
            if (tween) {
                return [obj[property]].concat(tween.generateData(1000 * (points - 1) / duration).map(data => data[property]));
            } else {
                return [];
            }
        }

        /**
         * Display an object, with opacity transition
         */
        show(obj: IAnimationFadeable, duration = 1000, alpha = 1): void {
            if (!obj.visible) {
                obj.alpha = 0;
                obj.visible = true;
            }

            if (duration && !this.immediate) {
                let tween = this.createTween(obj);
                tween.to({ alpha: alpha }, duration);
                if (obj.input) {
                    let input = obj.input;
                    tween.onComplete.addOnce(() => {
                        input.enabled = true
                        obj.freezeFrames = false;
                    });
                }
                tween.start();
            } else {
                this.tweens.removeFrom(obj, false);
                obj.alpha = alpha;
                if (obj.input) {
                    obj.input.enabled = true;
                    obj.freezeFrames = false;
                }
            }
        }

        /**
         * Hide an object, with opacity transition
         */
        hide(obj: IAnimationFadeable, duration = 1000, alpha = 0): void {
            if (obj.changeStateFrame) {
                obj.changeStateFrame("Out");
                obj.freezeFrames = true;
            }

            if (obj.input) {
                obj.input.enabled = false;
            }

            if (duration && !this.immediate) {
                let tween = this.createTween(obj);
                tween.to({ alpha: alpha }, duration);
                if (alpha == 0) {
                    tween.onComplete.addOnce(() => obj.visible = false);
                }
                tween.start();
            } else {
                obj.alpha = alpha;
                obj.visible = alpha > 0;
            }
        }

        /**
         * Set an object visibility, with opacity transition
         */
        setVisible(obj: IAnimationFadeable, visible: boolean, duration = 1000, alphaon = 1, alphaoff = 0): void {
            if (visible) {
                this.show(obj, duration, alphaon);
            } else {
                this.hide(obj, duration, alphaoff);
            }
        }

        /**
         * Get a toggle on visibility
         */
        newVisibilityToggle(obj: IAnimationFadeable, duration = 1000, initial = true): Toggle {
            let result = new Toggle(() => this.setVisible(obj, true, duration), () => this.setVisible(obj, false, duration));
            this.setVisible(obj, initial, 0);
            return result;
        }

        /**
         * Add an asynchronous animation to an object.
         */
        addAnimation(obj: any, properties: any, duration: number, ease: Function = Phaser.Easing.Linear.None, delay = 0): Promise<void> {
            return new Promise((resolve, reject) => {
                let tween = this.createTween(obj);
                tween.to(properties, duration, ease, false, delay);
                tween.onComplete.addOnce(() => {
                    this.tweens.remove(tween);
                    resolve();
                });
                tween.start();

                // By security, if the tween is destroyed before completion, we resolve the promise using the timer
                Timer.global.schedule(delay + duration, resolve);
            });
        }

        /**
         * Catch the player eye with a blink effect
         */
        async blink(obj: any, alpha_on = 1, alpha_off = 0.3, times = 3): Promise<void> {
            if (obj.alpha != alpha_on) {
                await this.addAnimation(obj, { alpha: alpha_on }, 150);
            }
            for (let i = 0; i < times; i++) {
                await this.addAnimation(obj, { alpha: alpha_off }, 150);
                await this.addAnimation(obj, { alpha: alpha_on }, 150);
            }
        }

        /**
         * Interpolate a rotation value
         * 
         * This will take into account the 2*pi modulo
         * 
         * Returns the duration
         */
        static rotationTween(tween: Phaser.Tween, dest: number, speed = 1, easing = Phaser.Easing.Cubic.InOut, property = "rotation"): number {
            // Immediately change the object's current rotation to be in range (-pi,pi)
            let value = UITools.normalizeAngle(tween.target[property]);
            tween.target[property] = value;

            // Compute destination angle
            dest = UITools.normalizeAngle(dest);
            if (value - dest > Math.PI) {
                dest += 2 * Math.PI;
            } else if (value - dest < -Math.PI) {
                dest -= 2 * Math.PI;
            }
            let distance = Math.abs(UITools.normalizeAngle(dest - value)) / Math.PI;
            let duration = distance * 1000 / speed;

            // Update the tween
            let changes: any = {};
            changes[property] = dest;
            tween.to(changes, duration, easing);

            return duration;
        }

        /**
         * Move an object linearly to another position
         * 
         * Returns the animation duration.
         */
        static moveTo(obj: PhaserGraphics, x: number, y: number, angle: number, rotated_obj = obj, ease = true): number {
            let tween_rot = obj.game.tweens.create(rotated_obj);
            let duration_rot = Animations.rotationTween(tween_rot, angle, 0.5);
            let tween_pos = obj.game.tweens.create(obj);
            let duration_pos = arenaDistance(obj, { x: x, y: y }) * 2;
            tween_pos.to({ x: x, y: y }, duration_pos, ease ? Phaser.Easing.Quadratic.InOut : undefined);

            tween_rot.start();
            tween_pos.start();
            return Math.max(duration_rot, duration_pos);
        }

        /**
         * Make an object move toward a location in space, with a ship-like animation.
         * 
         * Returns the animation duration.
         */
        static moveInSpace(obj: PhaserGraphics, x: number, y: number, angle: number, rotated_obj = obj): number {
            if (x == obj.x && y == obj.y) {
                let tween = obj.game.tweens.create(rotated_obj);
                let duration = Animations.rotationTween(tween, angle, 0.5);
                tween.start();
                return duration;
            } else {
                let distance = Target.newFromLocation(obj.x, obj.y).getDistanceTo(Target.newFromLocation(x, y));
                var tween = obj.game.tweens.create(obj);
                let duration = Math.sqrt(distance / 1000) * 3000;
                let curve_force = distance * 0.4;
                tween.to({
                    x: [obj.x + Math.cos(rotated_obj.rotation) * curve_force, x - Math.cos(angle) * curve_force, x],
                    y: [obj.y + Math.sin(rotated_obj.rotation) * curve_force, y - Math.sin(angle) * curve_force, y]
                }, duration, Phaser.Easing.Sinusoidal.InOut);
                tween.interpolation((v: any, k: any) => Phaser.Math.bezierInterpolation(v, k));
                let prevx = obj.x;
                let prevy = obj.y;
                tween.onUpdateCallback(() => {
                    if (prevx != obj.x || prevy != obj.y) {
                        rotated_obj.rotation = Math.atan2(obj.y - prevy, obj.x - prevx);
                    }
                    prevx = obj.x;
                    prevy = obj.y;
                });
                tween.start();
                return duration;
            }
        }
    }
}
