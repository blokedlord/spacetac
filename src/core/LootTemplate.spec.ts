/// <reference path="effects/BaseEffect.ts" />

module TS.SpaceTac.Specs {
    class FakeEffect extends BaseEffect {
        fakevalue: number
        constructor(val = 5) {
            super("fake");
            this.fakevalue = val;
        }
    }

    describe("LootTemplate", () => {
        it("generates equipment with correct information", function () {
            let template = new LootTemplate(SlotType.Power, "Power Generator", "A great power generator !");
            let result = template.generate(2, EquipmentQuality.PREMIUM);

            expect(result.slot_type).toEqual(SlotType.Power);
            expect(result.code).toEqual("powergenerator");
            expect(result.name).toEqual("Power Generator");
            expect(result.price).toEqual(300);
            expect(result.level).toEqual(2);
            expect(result.quality).toEqual(EquipmentQuality.COMMON);
            expect(result.description).toEqual("A great power generator !");

            template.addAttributeEffect("power_capacity", istep(10));
            result = template.generate(1, EquipmentQuality.COMMON);
            expect(result.quality).toEqual(EquipmentQuality.COMMON);
            expect(result.effects).toEqual([new AttributeEffect("power_capacity", 10)]);
            result = template.generate(1, EquipmentQuality.PREMIUM);
            expect(result.quality).toEqual(EquipmentQuality.PREMIUM);
            expect(result.effects).toEqual([new AttributeEffect("power_capacity", 13)]);
        });

        it("applies requirements on skills", function () {
            let template = new LootTemplate(SlotType.Hull, "Hull");
            template.setSkillsRequirements({ "skill_energy": 1, "skill_gravity": istep(2, istep(1)) });

            let result = template.generate(1);
            expect(result.requirements).toEqual({
                "skill_energy": 1,
                "skill_gravity": 2
            });

            result = template.generate(2);
            expect(result.requirements).toEqual({
                "skill_energy": 2,
                "skill_gravity": 3
            });

            result = template.generate(10);
            expect(result.requirements).toEqual({
                "skill_energy": 10,
                "skill_gravity": 47
            });
        });

        it("applies attributes permenant effects", function () {
            let template = new LootTemplate(SlotType.Shield, "Shield");
            template.addAttributeEffect("shield_capacity", irange(undefined, 50, 10));

            let result = template.generate(1);
            expect(result.effects).toEqual([new AttributeEffect("shield_capacity", 50)]);

            result = template.generate(2);
            expect(result.effects).toEqual([new AttributeEffect("shield_capacity", 60)]);
        });

        it("adds move actions", function () {
            let template = new LootTemplate(SlotType.Engine, "Engine");
            template.addMoveAction(irange(undefined, 100, 10));

            let result = template.generate(1);
            expect(result.action).toEqual(new MoveAction(result, 100));

            result = template.generate(2);
            expect(result.action).toEqual(new MoveAction(result, 110));
        });

        it("adds fire actions", function () {
            let template = new LootTemplate(SlotType.Weapon, "Weapon");
            template.addFireAction(istep(1), istep(100), istep(50), [
                new EffectTemplate(new FakeEffect(3), { "fakevalue": istep(8) })
            ]);

            let result = template.generate(1);
            expect(result.action).toEqual(new FireWeaponAction(result, 1, 100, 50, [new FakeEffect(8)]));

            result = template.generate(2);
            expect(result.action).toEqual(new FireWeaponAction(result, 2, 101, 51, [new FakeEffect(9)]));
        });

        it("adds drone actions", function () {
            let template = new LootTemplate(SlotType.Weapon, "Weapon");
            template.addDroneAction(istep(1), istep(100), istep(2), istep(50), [
                new EffectTemplate(new FakeEffect(3), { "fakevalue": istep(8) })
            ]);

            let result = template.generate(1);
            expect(result.action).toEqual(new DeployDroneAction(result, 1, 100, 2, 50, [new FakeEffect(8)]));

            result = template.generate(2);
            expect(result.action).toEqual(new DeployDroneAction(result, 2, 101, 3, 51, [new FakeEffect(9)]));
        });
    });
}
