module SpaceTac.Game {
    "use strict";

    // Code to identify
    export enum AttributeCode {
        // Initiative level
        Initiative,

        // Hull points (similar to health points in other games)
        Hull,

        // Damage the shield can take
        Shield,

        // Current level of action points
        AP,

        // Action points recovered by turn
        AP_Recovery,

        // Starting action points in a battle
        AP_Initial,

        // Miscellaneous attribute
        Misc
    }

    // Value computed from equipment
    //  This value can be altered by effects
    //  Example attributes are health points, action points recovery...
    export class Attribute {
        // Identifying code of this attribute
        code: AttributeCode;

        // Maximal attribute value
        maximal: number;

        // Current attribute value
        current: number;

        // Create an attribute
        constructor(code: AttributeCode = AttributeCode.Misc, maximal: number = null, current: number = 0) {
            this.code = code;
            this.maximal = maximal;
            this.current = current;
        }

        // Iterator over each code
        static forEachCode(callback: (code: AttributeCode) => void) {
            for (var val in AttributeCode) {
                if (!isNaN(val)) {
                    callback(<AttributeCode>parseInt(val, 10));
                }
            }
        }

        // Set the maximal value
        setMaximal(value: number): void {
            this.maximal = value;
            this.fix();
        }

        // Set an absolute value
        //  Returns true if the value changed
        set(value: number): boolean {
            var old_value = this.current;
            this.current = value;
            this.fix();
            return this.current !== old_value;
        }

        // Add an offset to current value
        //  Returns true if the value changed
        add(value: number): boolean {
            var old_value = this.current;
            this.current += value;
            this.fix();
            return this.current !== old_value;
        }

        // Fix the value to remain lower than maximal, and positive
        private fix(): void {
            if (this.maximal !== null && this.current > this.maximal) {
                this.current = this.maximal;
            }
            if (this.current < 0.0001) {
                this.current = 0;
            }
        }
    }
}
