/// <reference path="../LootTemplate.ts"/>

module TK.SpaceTac.Equipments {
    export class GatlingGun extends LootTemplate {
        constructor() {
            super(SlotType.Weapon, "Gatling Gun", "Mechanical weapon using loads of metal bullets propelled by guided explosions");

            this.setSkillsRequirements({ "skill_materials": leveled(1, 1.4) });
            this.setCooldown(irepeat(2), irepeat(2));
            this.addTriggerAction(irepeat(3), [
                new EffectTemplate(new DamageEffect(), { base: leveled(30), span: leveled(20) })
            ], leveled(400, 12), undefined, undefined, irepeat(60), irepeat(20), irepeat(15));
        }
    }

    export class SubMunitionMissile extends LootTemplate {
        constructor() {
            super(SlotType.Weapon, "SubMunition Missile", "Explosive missile releasing small shelled payloads, that will in turn explode on impact", 163);

            this.setSkillsRequirements({ "skill_materials": leveled(1, 1.2), "skill_photons": leveled(1, 0.8) });
            this.setCooldown(irepeat(1), irepeat(0));
            this.addTriggerAction(irepeat(4), [
                new EffectTemplate(new DamageEffect(), { base: leveled(26, 2), span: leveled(4, 1) })
            ], leveled(500, 20), leveled(150, 5), undefined, irepeat(30), irepeat(40), irepeat(10));
        }
    }

    export class ProkhorovLaser extends LootTemplate {
        constructor() {
            super(SlotType.Weapon, "Prokhorov Laser", "Powerful mid-range perforating laser, using antimatter to contain the tremendous photonic energy", 152);

            // TODO increased damage to hull
            this.setSkillsRequirements({ "skill_antimatter": leveled(0.3, 0.7), "skill_quantum": leveled(1, 1.2), "skill_photons": leveled(1, 1.4) });
            this.setCooldown(irepeat(1), irepeat(1));
            this.addTriggerAction(irepeat(5), [
                new EffectTemplate(new DamageEffect(), { base: leveled(20), span: leveled(25) })
            ], leveled(300, 10), irepeat(0), leveled(40, 2), irepeat(45), irepeat(60), irepeat(20));
        }
    }
}
