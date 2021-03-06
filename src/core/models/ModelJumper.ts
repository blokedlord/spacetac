/// <reference path="ShipModel.ts" />

module TK.SpaceTac {
    export class ModelJumper extends ShipModel {
        constructor() {
            super("jumper", "Jumper");
        }

        getDescription(): string {
            return "A mid-range action ship, with support abilities.";
        }

        getLevelUpgrades(level: number): ShipUpgrade[] {
            if (level == 1) {
                let engine = new MoveAction("Engine", {
                    distance_per_power: 310,
                    safety_distance: 160,
                });

                let missile = new TriggerAction("SubMunition Missile", {
                    effects: [new DamageEffect(2)],
                    power: 3,
                    range: 400, blast: 120,
                }, "submunitionmissile");

                let protector = new TriggerAction("Damage Reductor", {
                    effects: [new StickyEffect(new AttributeEffect("evasion", 1), 2)],
                    power: 3,
                    range: 300, blast: 150
                }, "damageprotector");
                protector.configureCooldown(1, 3);

                let hull_regrowth = new ToggleAction("Hull Regrowth", {
                    power: 2,
                    effects: [new ValueEffect("hull", 0, 0, 10)]
                }, "fractalhull");

                return [
                    {
                        code: "Jumper Base",
                        effects: [
                            new AttributeEffect("initiative", 1),
                            new AttributeEffect("hull_capacity", 3),
                            new AttributeEffect("shield_capacity", 2),
                            new AttributeEffect("power_capacity", 6),
                        ]
                    },
                    {
                        code: "Main Engine",
                        actions: [engine]
                    },
                    {
                        code: "Missile",
                        actions: [missile]
                    },
                    {
                        code: "Damage Reductor",
                        actions: [protector]
                    },
                    {
                        code: "Hull Regrowth",
                        actions: [hull_regrowth]
                    },
                ];
            } else {
                return this.getStandardUpgrades(level);
            }
        }
    }
}
