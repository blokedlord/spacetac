module TK.SpaceTac {
    testing("CooldownEffect", test => {
        test.case("cools down equipment", check => {
            let ship = new Ship();
            let weapons = [TestTools.addWeapon(ship), TestTools.addWeapon(ship), TestTools.addWeapon(ship)];
            weapons.forEach(weapon => weapon.cooldown.configure(1, 3));
            check.equals(weapons.map(weapon => weapon.cooldown.heat), [0, 0, 0]);

            new CooldownEffect(0, 0).applyOnShip(ship, ship);
            check.equals(weapons.map(weapon => weapon.cooldown.heat), [0, 0, 0]);

            weapons.forEach(weapon => weapon.cooldown.use());
            check.equals(weapons.map(weapon => weapon.cooldown.heat), [3, 3, 3]);

            new CooldownEffect(0, 0).applyOnShip(ship, ship);
            check.equals(weapons.map(weapon => weapon.cooldown.heat), [0, 0, 0]);

            weapons.forEach(weapon => weapon.cooldown.use());
            check.equals(weapons.map(weapon => weapon.cooldown.heat), [3, 3, 3]);

            new CooldownEffect(1, 0).applyOnShip(ship, ship);
            check.equals(weapons.map(weapon => weapon.cooldown.heat), [2, 2, 2]);

            new CooldownEffect(1, 2).applyOnShip(ship, ship);
            check.equals(weapons.map(weapon => weapon.cooldown.heat).sort(), [1, 1, 2]);
        })

        test.case("builds a textual description", check => {
            check.equals(new CooldownEffect(0, 0).getDescription(), "Full cooling (all equipments)");
            check.equals(new CooldownEffect(1, 1).getDescription(), "1 cooling (1 equipment)");
            check.equals(new CooldownEffect(2, 2).getDescription(), "2 cooling (2 equipments)");
        })
    })
}
