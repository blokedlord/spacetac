/// <reference path="AbstractWeapon.ts"/>

module SpaceTac.Game.Equipments {
    export class EnergyDepleter extends AbstractWeapon {
        constructor() {
            super("Energy Depleter");

            this.setRange(200, 300, false);

            this.ap_usage = new Range(4, 5);
            this.min_level = new IntegerRange(1, 3);

            this.addTemporaryEffectOnTarget(new AttributeLimitEffect(AttributeCode.AP), 4, 3, 1, 2);
        }
    }
}