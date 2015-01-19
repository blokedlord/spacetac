module SpaceTac.Game {
    "use strict";

    // A single ship in a Fleet
    export class Ship {
        // Fleet this ship is a member of
        fleet: Fleet;

        // Name of the ship
        name: string;

        // Current level
        level: number;

        // Number of shield points
        shield: number;

        // Number of hull points
        hull: number;

        // Position in the arena
        arena_x: number;
        arena_y: number;

        // Facing direction in the arena
        arena_angle: number;

        // Current initiative level (high numbers will allow this ship to play sooner)
        initiative_level: number;

        // Last initiative throw
        initative_throw: number;

        // Current number of action points
        ap_current: Attribute;

        // Initial number of action points, at the start of a battle
        ap_initial: Attribute;

        // Number of action points recovered by turn
        ap_recover: Attribute;

        // Number of action points used to make a 1.0 move
        movement_cost: number;

        // List of slots, able to contain equipment
        slots: Slot[];

        // Create a new ship inside a fleet
        constructor(fleet: Fleet = null, name: string = null) {
            this.fleet = fleet;
            this.name = name;
            this.initiative_level = 1;
            this.ap_current = new Attribute(AttributeCode.AP);
            this.ap_initial = new Attribute(AttributeCode.AP_Initial);
            this.ap_recover = new Attribute(AttributeCode.AP_Recovery);
            this.movement_cost = 0.1;
            this.slots = [];

            if (fleet) {
                fleet.addShip(this);
            }
        }

        // Set position in the arena
        //  This does not consumes action points
        setArenaPosition(x: number, y: number) {
            this.arena_x = x;
            this.arena_y = y;
        }

        // Set facing angle in the arena
        setArenaFacingAngle(angle: number) {
            this.arena_angle = angle;
        }

        // String repr
        jasmineToString(): string {
            return "Ship " + this.name;
        }

        // Make an initiative throw, to resolve play order in a battle
        throwInitiative(gen: RandomGenerator): void {
            this.initative_throw = gen.throw(this.initiative_level);
        }

        // Return the player owning this ship
        getPlayer(): Player {
            if (this.fleet) {
                return this.fleet.player;
            } else {
                return null;
            }
        }

        // get the current battle this ship is engaged in
        getBattle(): Battle {
            if (this.fleet) {
                return this.fleet.battle;
            } else {
                return null;
            }
        }

        // Get the list of actions available
        //  This list does not filter out actions unavailable due to insufficient AP, it only filters out
        //  actions that are not allowed/available at all on the ship
        getAvailableActions(): BaseAction[] {
            var actions: BaseAction[] = [];

            this.slots.forEach((slot: Slot) => {
                if (slot.attached && slot.attached.action) {
                    actions.push(slot.attached.action);
                }
            });

            actions.push(new EndTurnAction());
            return actions;
        }

        // Set an attribute value
        //  If offset is true, the value will be added to current value
        //  If log is true, an attribute event will be added to the battle log
        setAttribute(attr: Attribute, value: number, offset: boolean = false, log: boolean = true) {
            var changed: boolean;

            if (offset) {
                changed = attr.add(value);
            } else {
                changed = attr.set(value);
            }

            if (changed && log) {
                var battle = this.getBattle();
                if (battle) {
                    battle.log.add(new AttributeChangeEvent(this, attr));
                }
            }
        }

        // Initialize the action points counter
        //  This should be called once at the start of a battle
        //  If no value is provided, the attribute ap_initial will be used
        initializeActionPoints(value: number = null): void {
            if (value === null) {
                value = this.ap_initial.current;
            }
            this.setAttribute(this.ap_current, value);
        }

        // Recover action points
        //  This should be called once at the start of a turn
        //  If no value is provided, the current attribute ap_recovery will be used
        recoverActionPoints(value: number = null): void {
            if (value === null) {
                value = this.ap_recover.current;
            }
            this.setAttribute(this.ap_current, value, true);
        }

        // Consumes action points
        useActionPoints(value: number): void {
            this.setAttribute(this.ap_current, -value, true);
        }

        // Method called at the start of this ship turn
        startTurn(first: boolean): void {
            // Manage action points
            if (first) {
                this.initializeActionPoints();
            } else {
                this.recoverActionPoints();
            }

            // TODO Apply active effects
        }

        // Get the maximal position reachable in the arena with current action points
        getLongestMove(x: number, y: number): number[] {
            var dx = x - this.arena_x;
            var dy = y - this.arena_y;
            var length = Math.sqrt(dx * dx + dy * dy);
            var max_length = this.ap_current.current / this.movement_cost;
            if (max_length >= length) {
                return [x, y];
            } else {
                var factor = max_length / length;
                return [this.arena_x + dx * factor, this.arena_y + dy * factor];
            }
        }

        // Move toward a location, consuming action points
        moveTo(x: number, y: number): void {
            var dest = this.getLongestMove(x, y);
            var dx = dest[0] - this.arena_x;
            var dy = dest[1] - this.arena_y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            var cost = distance * this.movement_cost;

            this.setArenaPosition(this.arena_x + dx, this.arena_y + dy);
            this.useActionPoints(cost);
        }

        // Add an empty equipment slot of the given type
        addSlot(type: SlotType): Slot {
            var result = new Slot(this, type);
            this.slots.push(result);
            return result;
        }
    }
}
