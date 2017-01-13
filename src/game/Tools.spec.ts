module SpaceTac.Game.Specs {
    class TestObj {
        a: string;
        b: any;

        constructor() {
            this.a = "test";
            this.b = { c: 5.1, d: ["unit", "test", 5] };
        }

        get(): string {
            return this.a;
        }
    }

    describe("Tools", () => {
        it("copies full javascript objects", () => {
            var ini = new TestObj();

            var cop = Tools.copyObject(ini);

            expect(cop).not.toBe(ini);
            expect(cop).toEqual(ini);

            expect(cop.get()).toEqual("test");
        });

        it("merges objects", () => {
            expect(Tools.merge({}, {})).toEqual({});
            expect(Tools.merge({ "a": 1 }, { "b": 2 })).toEqual({ "a": 1, "b": 2 });
            expect(Tools.merge({ "a": 1 }, { "a": 3, "b": 2 })).toEqual({ "a": 3, "b": 2 });
        });
    });
}