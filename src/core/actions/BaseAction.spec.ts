module TK.SpaceTac.Specs {
    testing("BaseAction", test => {
        test.case("may be applied and reverted", check => {
            let battle = TestTools.createBattle();
            let ship = nn(battle.playing_ship);
            TestTools.setShipModel(ship, 100, 0, 10);
            let action = TestTools.addWeapon(ship, 0, 3, 100, 50);
            action.configureCooldown(2, 1);

            TestTools.actionChain(check, battle, [
                [ship, action, Target.newFromLocation(0, 0)],
                [ship, action, Target.newFromLocation(0, 0)],
                [ship, EndTurnAction.SINGLETON, undefined],
            ], [
                    check => {
                        check.equals(ship.getValue("power"), 10, "power");
                        let cooldown = ship.actions.getCooldown(action);
                        check.equals(cooldown.uses, 0, "uses");
                        check.equals(cooldown.heat, 0, "heat");
                    },
                    check => {
                        check.equals(ship.getValue("power"), 7, "power");
                        let cooldown = ship.actions.getCooldown(action);
                        check.equals(cooldown.uses, 1, "uses");
                        check.equals(cooldown.heat, 0, "heat");
                    },
                    check => {
                        check.equals(ship.getValue("power"), 4, "power");
                        let cooldown = ship.actions.getCooldown(action);
                        check.equals(cooldown.uses, 2, "uses");
                        check.equals(cooldown.heat, 1, "heat");
                    },
                    check => {
                        check.equals(ship.getValue("power"), 10, "power");
                        let cooldown = ship.actions.getCooldown(action);
                        check.equals(cooldown.uses, 0, "uses");
                        check.equals(cooldown.heat, 0, "heat");
                    },
                ]);
        })

        test.case("checks against remaining AP", check => {
            let action = new BaseAction("test");
            check.patch(action, "getActionPointsUsage", () => 3);

            let ship = new Ship();
            check.equals(action.checkCannotBeApplied(ship), "action not available");

            ship.actions.addCustom(action);
            check.equals(action.checkCannotBeApplied(ship), "not enough power");

            ship.setValue("power", 5);
            check.equals(action.checkCannotBeApplied(ship), null);
            check.equals(action.checkCannotBeApplied(ship, 4), null);
            check.equals(action.checkCannotBeApplied(ship, 3), null);
            check.equals(action.checkCannotBeApplied(ship, 2), "not enough power");

            ship.setValue("power", 3);
            check.equals(action.checkCannotBeApplied(ship), null);

            ship.setValue("power", 2);
            check.equals(action.checkCannotBeApplied(ship), "not enough power");
        })

        test.case("checks against overheat", check => {
            let action = new BaseAction("test");
            let ship = new Ship();
            ship.actions.addCustom(action);
            let cooldown = ship.actions.getCooldown(action);

            check.equals(action.checkCannotBeApplied(ship), null);

            cooldown.use();
            check.equals(action.checkCannotBeApplied(ship), null);

            cooldown.configure(2, 3);
            check.equals(action.checkCannotBeApplied(ship), null);

            cooldown.use();
            check.equals(action.checkCannotBeApplied(ship), null);

            cooldown.use();
            check.equals(action.checkCannotBeApplied(ship), "overheated");

            cooldown.cool();
            check.equals(action.checkCannotBeApplied(ship), "overheated");

            cooldown.cool();
            check.equals(action.checkCannotBeApplied(ship), "overheated");

            cooldown.cool();
            check.equals(action.checkCannotBeApplied(ship), null);
        })
    });
}
