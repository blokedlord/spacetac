module TK.SpaceTac {
    /**
     * Action to move the ship to a specific location
     */
    export class MoveAction extends BaseAction {
        constructor(
            // Mandatory equipment
            readonly equipment: Equipment,
            // Distance allowed for each power point (raw, without applying maneuvrability)
            readonly distance_per_power = 0,
            // Safety distance from other ships
            readonly safety_distance = 120,
            // Impact of maneuvrability (in % of distance)
            readonly maneuvrability_factor = 0
        ) {
            super("move", equipment);
        }

        getVerb(): string {
            return "Move";
        }

        getTargettingMode(ship: Ship): ActionTargettingMode {
            return ActionTargettingMode.SPACE;
        }

        getDefaultTarget(ship: Ship): Target {
            return Target.newFromLocation(ship.arena_x + Math.cos(ship.arena_angle) * 100, ship.arena_y + Math.sin(ship.arena_angle) * 100);
        }

        checkCannotBeApplied(ship: Ship, remaining_ap: number | null = null): string | null {
            let base = super.checkCannotBeApplied(ship, Infinity);
            if (base) {
                return base;
            }

            // Check AP usage
            if (remaining_ap === null) {
                remaining_ap = ship.getValue("power");
            }
            if (remaining_ap > 0.0001) {
                return null;
            } else {
                return "not enough power";
            }
        }

        getActionPointsUsage(ship: Ship, target: Target | null): number {
            if (target) {
                let distance = Target.newFromShip(ship).getDistanceTo(target);
                return Math.ceil(distance / this.getDistanceByActionPoint(ship));
            } else {
                return 0;
            }
        }

        getRangeRadius(ship: Ship): number {
            return this.getRangeRadiusForPower(ship);
        }

        /**
         * Get the distance reachable with a given power 
         */
        getRangeRadiusForPower(ship: Ship, power = ship.getValue("power")): number {
            return power * this.getDistanceByActionPoint(ship);
        }

        /**
         * Get the distance range that may be traveled with 1 action point
         * 
         * The actual range will then depend on the ship maneuvrability
         */
        getDistanceRangeByActionPoint(): IntegerRange {
            let min_distance = Math.ceil(this.distance_per_power * (1 - this.maneuvrability_factor * 0.01));
            return new IntegerRange(min_distance, this.distance_per_power);
        }

        /**
         * Get the distance that may be traveled with 1 action point
         */
        getDistanceByActionPoint(ship: Ship): number {
            let maneuvrability = Math.max(ship.getAttribute("maneuvrability"), 0);
            let factor = maneuvrability / (maneuvrability + 2);
            let range = this.getDistanceRangeByActionPoint();
            return range.getProportional(factor);
        }

        /**
         * Get an exclusion helper for this move action
         */
        getExclusionAreas(ship: Ship): ExclusionAreas {
            return ExclusionAreas.fromShip(ship, this.safety_distance);
        }

        /**
         * Apply exclusion areas (neer arena borders, or other ships)
         */
        applyExclusion(ship: Ship, target: Target): Target {
            let exclusion = this.getExclusionAreas(ship);

            let destination = exclusion.stopBefore(new ArenaLocation(target.x, target.y), ship.location);
            target = Target.newFromLocation(destination.x, destination.y);
            return target;
        }

        /**
         * Apply reachable range, with remaining power
         */
        applyReachableRange(ship: Ship, target: Target, margin = 0.1): Target {
            let max_distance = this.getRangeRadius(ship);
            max_distance = Math.max(0, max_distance - margin);
            return target.constraintInRange(ship.arena_x, ship.arena_y, max_distance);
        }

        checkLocationTarget(ship: Ship, target: Target): Target | null {
            target = this.applyReachableRange(ship, target);
            target = this.applyExclusion(ship, target);
            return target.getDistanceTo(ship.location) > 0 ? target : null;
        }

        protected getSpecificDiffs(ship: Ship, battle: Battle, target: Target): BaseBattleDiff[] {
            let angle = (arenaDistance(target, ship.location) < 0.00001) ? ship.arena_angle : arenaAngle(ship.location, target);
            let destination = new ArenaLocationAngle(target.x, target.y, angle);
            return [new ShipMoveDiff(ship, ship.location, destination, this.equipment)];
        }

        getEffectsDescription(): string {
            let range = this.getDistanceRangeByActionPoint();
            let rangeinfo = (range.max == range.min) ? `${range.min}` : `${range.min}-${range.max}`;
            let result = `Move: ${rangeinfo}km per power point`;

            if (this.safety_distance) {
                result += ` (safety: ${this.safety_distance}km)`;
            }

            return result;
        }
    }
}
