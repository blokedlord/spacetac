/// <reference path="BaseBattleDiff.ts"/>

module TK.SpaceTac {
    /**
     * A battle ends
     * 
     * This should be the last diff of a battle log
     */
    export class EndBattleDiff extends BaseBattleDiff {
        // Outcome of the battle
        outcome: BattleOutcome

        // Number of battle cycles
        cycles: number

        constructor(winner: Fleet | null, cycles: number) {
            super();

            this.outcome = new BattleOutcome(winner);
            this.cycles = cycles;
        }

        apply(battle: Battle): void {
            battle.outcome = this.outcome;
        }

        revert(battle: Battle): void {
            battle.outcome = null;
        }
    }
}
