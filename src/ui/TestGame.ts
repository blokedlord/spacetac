/// <reference path="../common/Testing.ts" />

module TK.SpaceTac.UI.Specs {
    let test_ui: MainUI;

    /**
     * Class to hold references to test objects (used as singleton in "describe" blocks)
     * 
     * Attributes should only be accessed from inside corresponding "it" blocks (they are initialized by the setup).
     */
    export class TestGame<T extends Phaser.State> {
        ui: MainUI;
        view: T;
        multistorage: Multi.FakeRemoteStorage;
        state: string;
        clock: FakeClock;
    }

    /**
     * Setup a headless test UI, with a single view started.
     */
    export function setupSingleView<T extends Phaser.State>(buildView: () => [T, any[]]) {
        let testgame = new TestGame<T>();

        beforeEach(function (done) {
            spyOn(console, "log").and.stub();
            spyOn(console, "warn").and.stub();

            if (!test_ui) {
                test_ui = new MainUI(true);

                if (test_ui.load) {
                    spyOn(test_ui.load, 'image').and.stub();
                    spyOn(test_ui.load, 'audio').and.stub();
                }
            }

            testgame.ui = test_ui;
            testgame.ui.resetSession();

            let [state, stateargs] = buildView();

            if (state instanceof BaseView) {
                testgame.multistorage = new Multi.FakeRemoteStorage();
                let connection = new Multi.Connection(RandomGenerator.global.id(12), testgame.multistorage);
                spyOn(state, "getConnection").and.returnValue(connection);
            }

            let orig_create = bound(state, "create");
            spyOn(state, "create").and.callFake(() => {
                orig_create();
                done();
            });

            testgame.ui.state.add("test", state);
            testgame.ui.state.start("test", true, false, ...stateargs);

            testgame.state = "test_initial";
            spyOn(testgame.ui.state, "start").and.callFake((name: string) => {
                testgame.state = name;
            });

            if (!testgame.ui.isBooted) {
                testgame.ui.device.canvas = true;
                testgame.ui.boot();
            }

            testgame.view = state;
        });

        return testgame;
    }

    /**
     * Test setup of an empty BaseView
     */
    export function setupEmptyView(): TestGame<BaseView> {
        return setupSingleView(() => {
            return [new BaseView(), []];
        });
    }

    /**
     * Test setup of a battleview bound to a battle, to be called inside a "describe" block.
     */
    export function setupBattleview(): TestGame<BattleView> {
        return setupSingleView(() => {
            let view = new BattleView();
            view.splash = false;

            let battle = Battle.newQuickRandom();
            let player = battle.playing_ship ? battle.playing_ship.getPlayer() : new Player();

            return [view, [player, battle]];
        });
    }

    /**
     * Test setup of a mapview bound to a universe, to be called inside a "describe" block.
     */
    export function setupMapview(): TestGame<UniverseMapView> {
        return setupSingleView(() => {
            let mapview = new UniverseMapView();
            let session = new GameSession();
            session.startNewGame();

            return [mapview, [session.universe, session.player]];
        });
    }

    /**
     * Check a given text node
     */
    export function checkText(check: TestContext, node: any, content: string): void {
        check.equals(node instanceof Phaser.Text, true);

        let tnode = <Phaser.Text>node;
        check.equals(tnode.text, content);
    }

    /**
     * Check that a layer contains the given component at a given index
     */
    export function checkComponentInLayer(check: TestContext, layer: Phaser.Group, index: number, component: UIComponent) {
        if (index >= layer.children.length) {
            check.fail(`Not enough children in group ${layer.name} for ${component} at index ${index}`);
        } else {
            let child = layer.children[index];
            if (child !== (<any>component).container) {
                check.fail(`${component} is not at index ${index} in ${layer.name}`);
            }
        }
    }

    /**
     * Simulate a click on a button
     */
    export function testClick(button: Phaser.Button): void {
        button.onInputDown.dispatch();
        button.onInputUp.dispatch();
    }
}
