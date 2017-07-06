module TS.SpaceTac.Specs {
    describe("ActiveMissions", () => {
        it("starts the main story arc", function () {
            let missions = new ActiveMissions();
            expect(missions.main).toBeNull();

            let session = new GameSession();
            session.startNewGame(true, false);

            missions.startMainStory(session.universe, session.player.fleet);
            expect(missions.main).not.toBeNull();
        })

        it("gets the current list of missions, and updates them", function () {
            let missions = new ActiveMissions();
            let universe = new Universe();
            let fleet = new Fleet();

            missions.main = new Mission(universe, fleet);
            missions.main.addPart(new MissionPart(missions.main, "Do something"));
            missions.secondary = [
                new Mission(universe, fleet),
                new Mission(universe, fleet)
            ];
            missions.secondary[0].addPart(new MissionPart(missions.secondary[0], "Maybe do something"));
            missions.secondary[1].addPart(new MissionPart(missions.secondary[1], "Surely do something"));

            expect(missions.getCurrent().map(mission => mission.current_part.title)).toEqual([
                "Do something",
                "Maybe do something",
                "Surely do something",
            ]);

            missions.checkStatus();

            expect(missions.getCurrent().map(mission => mission.current_part.title)).toEqual([
                "Do something",
                "Maybe do something",
                "Surely do something",
            ]);

            spyOn(missions.secondary[0].current_part, "checkCompleted").and.returnValue(true);
            missions.checkStatus();

            expect(missions.getCurrent().map(mission => mission.current_part.title)).toEqual([
                "Do something",
                "Surely do something",
            ]);

            spyOn(missions.main.current_part, "checkCompleted").and.returnValue(true);
            missions.checkStatus();

            expect(missions.getCurrent().map(mission => mission.current_part.title)).toEqual([
                "Surely do something",
            ]);
            expect(missions.main).toBeNull();
        })
    })
}