module TS.SpaceTac.UI.Specs {
    describe("Animations", () => {
        let testgame = setupEmptyView();

        it("shows and hides objects", function () {
            let obj = { visible: false, alpha: 0.5 };

            expect(testgame.baseview.animations.simulate(obj, 'alpha')).toEqual([]);

            testgame.baseview.animations.show(obj);

            expect(obj.visible).toBe(true);
            expect(obj.alpha).toBe(0);
            expect(testgame.baseview.animations.simulate(obj, 'alpha')).toEqual([0, 0.25, 0.5, 0.75, 1]);

            obj.alpha = 1;
            testgame.baseview.animations.hide(obj);

            expect(obj.visible).toBe(true);
            expect(obj.alpha).toBe(1);
            expect(testgame.baseview.animations.simulate(obj, 'alpha')).toEqual([1, 0.75, 0.5, 0.25, 0]);
        });

        it("animates rotation", function () {
            let obj = { rotation: -Math.PI * 2.5 };
            let tween = testgame.ui.tweens.create(obj);
            let result = Animations.rotationTween(tween, Math.PI * 0.25, 1, Phaser.Easing.Linear.None);
            expect(result).toEqual(750);
            expect(tween.generateData(4)).toEqual([
                { rotation: -Math.PI * 0.25 },
                { rotation: 0 },
                { rotation: Math.PI * 0.25 },
            ]);
        });
    });
}