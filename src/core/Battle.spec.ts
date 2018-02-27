module TK.SpaceTac {
    testing("Battle", test => {
        test.case("defines play order by initiative throws", check => {
            var fleet1 = new Fleet();
            var fleet2 = new Fleet();

            var ship1 = new Ship(fleet1, "F1S1");
            TestTools.setAttribute(ship1, "maneuvrability", 2);
            var ship2 = new Ship(fleet1, "F1S2");
            TestTools.setAttribute(ship2, "maneuvrability", 4);
            var ship3 = new Ship(fleet1, "F1S3");
            TestTools.setAttribute(ship3, "maneuvrability", 1);
            var ship4 = new Ship(fleet2, "F2S1");
            TestTools.setAttribute(ship4, "maneuvrability", 8);
            var ship5 = new Ship(fleet2, "F2S2");
            TestTools.setAttribute(ship5, "maneuvrability", 2);

            var battle = new Battle(fleet1, fleet2);
            check.equals(battle.play_order.length, 0);

            var gen = new SkewedRandomGenerator([1.0, 0.1, 1.0, 0.2, 0.6]);
            battle.throwInitiative(gen);

            check.equals(battle.play_order.length, 5);
            check.equals(battle.play_order, [ship1, ship4, ship5, ship3, ship2]);
        });

        test.case("places ships on lines, facing the arena center", check => {
            var fleet1 = new Fleet();
            var fleet2 = new Fleet();

            var ship1 = new Ship(fleet1, "F1S1");
            var ship2 = new Ship(fleet1, "F1S2");
            var ship3 = new Ship(fleet1, "F1S3");
            var ship4 = new Ship(fleet2, "F2S1");
            var ship5 = new Ship(fleet2, "F2S2");

            var battle = new Battle(fleet1, fleet2, 1000, 500);
            battle.placeShips();

            check.nears(ship1.arena_x, 250);
            check.nears(ship1.arena_y, 150);
            check.nears(ship1.arena_angle, 0);

            check.nears(ship2.arena_x, 250);
            check.nears(ship2.arena_y, 250);
            check.nears(ship2.arena_angle, 0);

            check.nears(ship3.arena_x, 250);
            check.nears(ship3.arena_y, 350);
            check.nears(ship3.arena_angle, 0);

            check.nears(ship4.arena_x, 750);
            check.nears(ship4.arena_y, 300);
            check.nears(ship4.arena_angle, Math.PI);

            check.nears(ship5.arena_x, 750);
            check.nears(ship5.arena_y, 200);
            check.nears(ship5.arena_angle, Math.PI);
        });

        test.case("advances to next ship in play order", check => {
            var fleet1 = new Fleet();
            var fleet2 = new Fleet();

            var ship1 = new Ship(fleet1, "ship1");
            var ship2 = new Ship(fleet1, "ship2");
            var ship3 = new Ship(fleet2, "ship3");

            var battle = new Battle(fleet1, fleet2);
            battle.ships.list().forEach(ship => TestTools.setShipModel(ship, 10, 0));

            // Check empty play_order case
            check.equals(battle.playing_ship, null);
            battle.advanceToNextShip();
            check.equals(battle.playing_ship, null);

            // Force play order
            iforeach(battle.iships(), ship => TestTools.setAttribute(ship, "maneuvrability", 1));
            var gen = new SkewedRandomGenerator([0.1, 0.2, 0.0]);
            battle.throwInitiative(gen);
            check.equals(battle.playing_ship, null);

            battle.advanceToNextShip();
            check.same(battle.playing_ship, ship2);

            battle.advanceToNextShip();
            check.same(battle.playing_ship, ship1);

            battle.advanceToNextShip();
            check.same(battle.playing_ship, ship3);

            battle.advanceToNextShip();
            check.same(battle.playing_ship, ship2);

            // A dead ship is skipped
            ship1.setDead();
            battle.advanceToNextShip();
            check.same(battle.playing_ship, ship3);

            // Playing ship dies
            ship3.setDead();
            battle.advanceToNextShip();
            check.same(battle.playing_ship, ship2);
        });

        test.case("handles the suicide case (playing ship dies because of its action)", check => {
            let battle = TestTools.createBattle(3, 1);
            let [ship1, ship2, ship3, ship4] = battle.play_order;
            ship1.setArenaPosition(0, 0);
            ship2.setArenaPosition(0, 0);
            ship3.setArenaPosition(1000, 1000);
            ship4.setArenaPosition(1000, 1000);
            let weapon = TestTools.addWeapon(ship1, 8000, 0, 50, 100);

            check.in("initially", check => {
                check.same(battle.playing_ship, ship1, "playing ship");
                check.equals(battle.ships.list().filter(ship => ship.alive), [ship1, ship2, ship3, ship4], "alive ships");
            });

            let result = battle.applyOneAction(weapon.id, Target.newFromLocation(0, 0));
            check.equals(result, true, "action applied successfully");
            check.in("after weapon", check => {
                check.same(battle.playing_ship, ship3, "playing ship");
                check.equals(battle.ships.list().filter(ship => ship.alive), [ship3, ship4], "alive ships");
            });
        });

        test.case("detects victory condition and logs a final EndBattleEvent", check => {
            var fleet1 = new Fleet();
            var fleet2 = new Fleet();

            var ship1 = new Ship(fleet1, "F1S1");
            var ship2 = new Ship(fleet1, "F1S2");
            let ship3 = new Ship(fleet2, "F2S1");

            var battle = new Battle(fleet1, fleet2);
            battle.ships.list().forEach(ship => TestTools.setShipModel(ship, 10, 0));
            battle.start();
            battle.play_order = [ship3, ship2, ship1];
            check.equals(battle.ended, false);

            ship1.setDead();
            ship2.setDead();
            battle.advanceToNextShip();

            check.equals(battle.ended, true);
            let diff = battle.log.get(battle.log.count() - 1);
            if (diff instanceof EndBattleDiff) {
                check.notequals(diff.outcome.winner, null);
                check.same(diff.outcome.winner, fleet2);
            } else {
                check.fail("Not an EndBattleDiff");
            }
        });

        test.case("handles a draw in end battle", check => {
            var fleet1 = new Fleet();
            var fleet2 = new Fleet();

            var ship1 = new Ship(fleet1, "F1S1");
            var ship2 = new Ship(fleet1, "F1S2");
            var ship3 = new Ship(fleet2, "F2S1");

            var battle = new Battle(fleet1, fleet2);

            battle.start();
            check.equals(battle.ended, false);

            ship1.setDead();
            ship2.setDead();
            ship3.setDead();

            battle.log.clear();
            check.equals(battle.ended, false);
            battle.performChecks();

            check.equals(battle.ended, true);
            check.equals(battle.log.count(), 1);
            let diff = battle.log.get(0);
            if (diff instanceof EndBattleDiff) {
                check.equals(diff.outcome.winner, null);
            } else {
                check.fail("Not an EndBattleDiff");
            }
        });

        test.case("collects ships present in a circle", check => {
            var fleet1 = new Fleet();
            var ship1 = new Ship(fleet1, "F1S1");
            ship1.setArenaPosition(0, 0);
            var ship2 = new Ship(fleet1, "F1S2");
            ship2.setArenaPosition(5, 8);
            var ship3 = new Ship(fleet1, "F1S3");
            ship3.setArenaPosition(6.5, 9.5);
            var ship4 = new Ship(fleet1, "F1S4");
            ship4.setArenaPosition(12, 12);

            var battle = new Battle(fleet1);
            battle.throwInitiative(new SkewedRandomGenerator([5, 4, 3, 2]));

            var result = battle.collectShipsInCircle(Target.newFromLocation(5, 8), 3);
            check.equals(result, [ship2, ship3]);
        });

        test.case("adds and remove drones", check => {
            let battle = new Battle();
            let ship = new Ship();
            let drone = new Drone(ship);
            check.equals(battle.drones.count(), 0);

            battle.addDrone(drone);
            check.equals(battle.drones.count(), 1);
            check.same(battle.drones.get(drone.id), drone);

            battle.addDrone(drone);
            check.equals(battle.drones.count(), 1);

            battle.removeDrone(drone);
            check.equals(battle.drones.count(), 0);

            battle.removeDrone(drone);
            check.equals(battle.drones.count(), 0);
        });

        test.case("checks if a player is able to play", check => {
            let battle = new Battle();
            let player = new Player();

            check.equals(battle.canPlay(player), false);

            let ship = new Ship();
            TestTools.setShipPlaying(battle, ship);

            check.equals(battle.canPlay(player), false);

            ship.fleet.setPlayer(player);

            check.equals(battle.canPlay(player), true);
        });

        test.case("gets the number of turns before a specific ship plays", check => {
            let battle = TestTools.createBattle(2, 1);

            check.in("initial", check => {
                check.same(battle.playing_ship, battle.play_order[0], "first ship playing");
                check.equals(battle.getPlayOrder(battle.play_order[0]), 0);
                check.equals(battle.getPlayOrder(battle.play_order[1]), 1);
                check.equals(battle.getPlayOrder(battle.play_order[2]), 2);
            });

            battle.advanceToNextShip();

            check.in("1 step", check => {
                check.same(battle.playing_ship, battle.play_order[1], "second ship playing");
                check.equals(battle.getPlayOrder(battle.play_order[0]), 2);
                check.equals(battle.getPlayOrder(battle.play_order[1]), 0);
                check.equals(battle.getPlayOrder(battle.play_order[2]), 1);
            });

            battle.advanceToNextShip();

            check.in("2 steps", check => {
                check.same(battle.playing_ship, battle.play_order[2], "third ship playing");
                check.equals(battle.getPlayOrder(battle.play_order[0]), 1);
                check.equals(battle.getPlayOrder(battle.play_order[1]), 2);
                check.equals(battle.getPlayOrder(battle.play_order[2]), 0);
            });

            battle.advanceToNextShip();

            check.in("3 steps", check => {
                check.same(battle.playing_ship, battle.play_order[0], "first ship playing");
                check.equals(battle.getPlayOrder(battle.play_order[0]), 0);
                check.equals(battle.getPlayOrder(battle.play_order[1]), 1);
                check.equals(battle.getPlayOrder(battle.play_order[2]), 2);
            });
        });

        test.case("lists area effects", check => {
            let battle = new Battle();
            let ship = battle.fleets[0].addShip();

            check.equals(imaterialize(battle.iAreaEffects(100, 50)), [], "initial");

            let drone1 = new Drone(ship);
            drone1.x = 120;
            drone1.y = 60;
            drone1.radius = 40;
            drone1.effects = [new DamageEffect(12)];
            battle.addDrone(drone1);
            let drone2 = new Drone(ship);
            drone2.x = 130;
            drone2.y = 70;
            drone2.radius = 20;
            drone2.effects = [new DamageEffect(14)];
            battle.addDrone(drone2);

            check.equals(imaterialize(battle.iAreaEffects(100, 50)), [drone1.effects[0]], "drone effects");

            let eq1 = new ToggleAction("eq1", { power: 0, radius: 500, effects: [new AttributeEffect("maneuvrability", 1)] });
            ship.actions.addCustom(eq1);
            ship.actions.toggle(eq1, true);
            let eq2 = new ToggleAction("eq2", { power: 0, radius: 500, effects: [new AttributeEffect("maneuvrability", 2)] });
            ship.actions.addCustom(eq2);
            ship.actions.toggle(eq2, false);
            let eq3 = new ToggleAction("eq3", { power: 0, radius: 100, effects: [new AttributeEffect("maneuvrability", 3)] });
            ship.actions.addCustom(eq3);
            ship.actions.toggle(eq3, true);

            check.equals(imaterialize(battle.iAreaEffects(100, 50)), [
                drone1.effects[0],
                eq1.effects[0],
            ], "drone and toggle effects");
        });

        test.case("is serializable", check => {
            let battle = Battle.newQuickRandom();
            battle.ai_playing = true;

            let serializer = new Serializer(TK.SpaceTac);
            let data = serializer.serialize(battle);

            let loaded = serializer.unserialize(data);

            check.equals(loaded.ai_playing, false, "ai playing is reset");
            battle.ai_playing = false;
            check.equals(loaded, battle, "unserialized == initial");

            let session = new GameSession();
            session.startNewGame();
            session.start_location.setupEncounter();
            session.start_location.enterLocation(session.player.fleet);
            let battle1 = nn(session.getBattle());
            let data1 = serializer.serialize(battle1);

            let ratio = data.length / data1.length;
            check.greaterorequal(ratio, 1.2, `quick battle serialized size (${data.length}) should be larger than campaign's (${data1.length})`);
        });

        test.case("can revert the last action", check => {
            let battle = new Battle();
            let ship = battle.fleets[0].addShip();
            ship.setValue("hull", 13);
            battle.log.clear();
            battle.log.add(new ShipValueDiff(ship, "hull", 4));
            battle.log.add(new ShipActionUsedDiff(ship, EndTurnAction.SINGLETON, Target.newFromShip(ship)));
            battle.log.add(new ShipValueDiff(ship, "hull", 7));
            battle.log.add(new ShipActionUsedDiff(ship, EndTurnAction.SINGLETON, Target.newFromShip(ship)));
            battle.log.add(new ShipValueDiff(ship, "hull", 2));

            check.in("initial state", check => {
                check.equals(ship.getValue("hull"), 13, "hull=13");
                check.equals(battle.log.count(), 5, "log count=5");
            });

            battle.revertOneAction();

            check.in("revert 1 action", check => {
                check.equals(ship.getValue("hull"), 11, "hull=11");
                check.equals(battle.log.count(), 3, "log count=3");
            });

            battle.revertOneAction();

            check.in("revert 2 actions", check => {
                check.equals(ship.getValue("hull"), 4, "hull=4");
                check.equals(battle.log.count(), 1, "log count=1");
            });

            battle.revertOneAction();

            check.in("revert 3 actions", check => {
                check.equals(ship.getValue("hull"), 0, "hull=0");
                check.equals(battle.log.count(), 0, "log count=0");
            });
        })
    });
}
