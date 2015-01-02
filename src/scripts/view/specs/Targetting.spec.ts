/// <reference path="../../definitions/jasmine.d.ts"/>

module SpaceTac.View {
    describe("Targetting", () => {
        it("broadcasts hovering and selection events", () => {
            var targetting = new Targetting(null);

            var hovered = [];
            var selected = [];
            targetting.targetHovered.add((target: Game.Target) => {
                hovered.push(target);
            });
            targetting.targetSelected.add((target: Game.Target) => {
                selected.push(target);
            });

            targetting.setTargetSpace(1, 2);
            expect(hovered).toEqual([Game.Target.newFromLocation(1, 2)]);
            expect(selected).toEqual([]);

            targetting.validate();
            expect(hovered).toEqual([Game.Target.newFromLocation(1, 2)]);
            expect(selected).toEqual([Game.Target.newFromLocation(1, 2)]);
        });
    });
}