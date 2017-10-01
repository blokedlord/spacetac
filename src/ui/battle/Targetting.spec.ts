module TK.SpaceTac.UI.Specs {
    describe("Targetting", function () {
        let testgame = setupBattleview();

        function newTargetting(): Targetting {
            return new Targetting(testgame.battleview,
                testgame.battleview.action_bar,
                testgame.battleview.toggle_tactical_mode,
                testgame.battleview.arena.range_hint);
        }

        it("draws simulation parts", function () {
            let targetting = newTargetting();

            let ship = nn(testgame.battleview.battle.playing_ship);
            ship.setArenaPosition(10, 20);
            let weapon = TestTools.addWeapon(ship);
            let engine = TestTools.addEngine(ship, 12);
            targetting.setAction(weapon.action);

            let drawvector = spyOn(targetting, "drawVector").and.stub();

            let part = {
                action: nn(weapon.action),
                target: new Target(50, 30),
                ap: 5,
                possible: true
            };
            targetting.drawPart(part, true, null);
            expect(drawvector).toHaveBeenCalledTimes(1);
            expect(drawvector).toHaveBeenCalledWith(0xdc6441, 10, 20, 50, 30, 0);

            targetting.drawPart(part, false, null);
            expect(drawvector).toHaveBeenCalledTimes(2);
            expect(drawvector).toHaveBeenCalledWith(0x8e8e8e, 10, 20, 50, 30, 0);

            targetting.action = engine.action;
            part.action = nn(engine.action);
            targetting.drawPart(part, true, null);
            expect(drawvector).toHaveBeenCalledTimes(3);
            expect(drawvector).toHaveBeenCalledWith(0xe09c47, 10, 20, 50, 30, 12);
        })

        it("updates impact indicators on ships inside the blast radius", function () {
            let targetting = newTargetting();
            let ship = nn(testgame.battleview.battle.playing_ship);

            let collect = spyOn(testgame.battleview.battle, "collectShipsInCircle").and.returnValues(
                [new Ship(), new Ship(), new Ship()],
                [new Ship(), new Ship()],
                []);
            targetting.updateImpactIndicators(ship, new Target(20, 10), 50);

            expect(collect).toHaveBeenCalledTimes(1);
            expect(collect).toHaveBeenCalledWith(new Target(20, 10), 50, true);
            expect(targetting.fire_impact.children.length).toBe(3);
            expect(targetting.fire_impact.visible).toBe(true);

            targetting.updateImpactIndicators(ship, new Target(20, 11), 50);

            expect(collect).toHaveBeenCalledTimes(2);
            expect(collect).toHaveBeenCalledWith(new Target(20, 11), 50, true);
            expect(targetting.fire_impact.children.length).toBe(2);
            expect(targetting.fire_impact.visible).toBe(true);

            let target = Target.newFromShip(new Ship());
            targetting.updateImpactIndicators(ship, target, 0);

            expect(collect).toHaveBeenCalledTimes(2);
            expect(targetting.fire_impact.children.length).toBe(1);
            expect(targetting.fire_impact.visible).toBe(true);

            targetting.updateImpactIndicators(ship, new Target(20, 12), 50);

            expect(collect).toHaveBeenCalledTimes(3);
            expect(collect).toHaveBeenCalledWith(new Target(20, 12), 50, true);
            expect(targetting.fire_impact.visible).toBe(false);
        })

        it("updates graphics from simulation", function () {
            let targetting = newTargetting();
            let ship = nn(testgame.battleview.battle.playing_ship);

            let engine = TestTools.addEngine(ship, 8000);
            let weapon = TestTools.addWeapon(ship, 30, 5, 100, 50);
            targetting.setAction(weapon.action);
            targetting.setTarget(Target.newFromLocation(156, 65));

            spyOn(targetting, "simulate").and.callFake(() => {
                let result = new MoveFireResult();
                result.success = true;
                result.complete = true;
                result.need_move = true;
                result.move_location = Target.newFromLocation(80, 20);
                result.can_move = true;
                result.can_end_move = true;
                result.need_fire = true;
                result.can_fire = true;
                result.parts = [
                    { action: nn(engine.action), target: Target.newFromLocation(80, 20), ap: 1, possible: true },
                    { action: nn(weapon.action), target: Target.newFromLocation(156, 65), ap: 5, possible: true }
                ]
                targetting.simulation = result;
            });
            targetting.update();

            expect(targetting.container.visible).toBe(true);
            expect(targetting.drawn_info.visible).toBe(true);
            expect(targetting.fire_arrow.visible).toBe(true);
            expect(targetting.fire_arrow.position).toEqual(jasmine.objectContaining({ x: 156, y: 65 }));
            expect(targetting.fire_arrow.rotation).toBeCloseTo(0.534594, 5);
            expect(targetting.fire_blast.visible).toBe(true);
            expect(targetting.fire_blast.position).toEqual(jasmine.objectContaining({ x: 156, y: 65 }));
            expect(targetting.move_ghost.visible).toBe(true);
            expect(targetting.move_ghost.position).toEqual(jasmine.objectContaining({ x: 80, y: 20 }));
            expect(targetting.move_ghost.rotation).toBeCloseTo(0.534594, 5);
        })

        it("snaps on ships according to targetting mode", function () {
            let targetting = newTargetting();
            let playing_ship = nn(testgame.battleview.battle.playing_ship);
            let action = TestTools.addWeapon(playing_ship).action;

            let ship1 = testgame.battleview.battle.play_order[1];
            let ship2 = testgame.battleview.battle.play_order[2];
            ship1.setArenaPosition(8000, 50);
            ship2.setArenaPosition(8000, 230);

            targetting.setAction(action, ActionTargettingMode.SPACE);
            targetting.setTargetFromLocation({ x: 8000, y: 60 });
            expect(targetting.target).toEqual(Target.newFromLocation(8000, 60), "space");

            targetting.setAction(action, ActionTargettingMode.SHIP);
            targetting.setTargetFromLocation({ x: 8000, y: 60 });
            expect(targetting.target).toEqual(Target.newFromShip(ship1), "ship 1");
            targetting.setTargetFromLocation({ x: 8100, y: 200 });
            expect(targetting.target).toEqual(Target.newFromShip(ship2), "ship 2");

            targetting.setAction(action, ActionTargettingMode.SURROUNDINGS);
            targetting.setTargetFromLocation({ x: 8000, y: 60 });
            expect(targetting.target).toEqual(Target.newFromLocation(8000, 60), "surroundings 1");
            targetting.setTargetFromLocation({ x: playing_ship.arena_x + 10, y: playing_ship.arena_y - 20 });
            expect(targetting.target).toEqual(Target.newFromShip(playing_ship), "surroundings 2");

            targetting.setAction(action, ActionTargettingMode.SELF);
            targetting.setTargetFromLocation({ x: 8000, y: 60 });
            expect(targetting.target).toEqual(Target.newFromShip(playing_ship), "self 1");
            targetting.setTargetFromLocation({ x: 0, y: 0 });
            expect(targetting.target).toEqual(Target.newFromShip(playing_ship), "self 2");
        })

        it("updates the range hint display", function () {
            let targetting = newTargetting();
            let ship = nn(testgame.battleview.battle.playing_ship);
            ship.setArenaPosition(0, 0);
            ship.listEquipment(SlotType.Engine).forEach(engine => engine.detach());
            TestTools.setShipAP(ship, 8);
            let move = TestTools.addEngine(ship, 100).action;
            let fire = TestTools.addWeapon(ship, 50, 2, 300, 100).action;
            let last_call: any = null;
            spyOn(targetting.range_hint, "clear").and.callFake(() => last_call = null);
            spyOn(targetting.range_hint, "update").and.callFake((ship: Ship, action: BaseAction, radius: number) => last_call = [ship, action, radius]);

            // move action
            targetting.setAction(move);
            targetting.setTargetFromLocation({ x: 200, y: 0 });
            expect(last_call).toEqual([ship, move, 800]);

            // fire action
            targetting.setAction(fire);
            targetting.setTargetFromLocation({ x: 200, y: 0 });
            expect(last_call).toEqual([ship, fire, undefined]);

            // move+fire
            targetting.setAction(fire);
            targetting.setTargetFromLocation({ x: 400, y: 0 });
            expect(last_call).toEqual([ship, move, 600]);
        });
    });
}
