module SpaceTac.View {
    // Tooltip to display action information
    export class ActionTooltip extends Phaser.Sprite {
        icon: Phaser.Image | null;
        main_title: Phaser.Text;
        sub_title: Phaser.Text;
        cost: Phaser.Text;

        constructor(parent: ActionBar) {
            super(parent.game, 0, 0, "battle-action-tooltip");
            this.visible = false;

            this.icon = null;

            this.main_title = new Phaser.Text(this.game, 325, 20, "", { font: "24pt Arial", fill: "#ffffff" });
            this.main_title.anchor.set(0.5, 0);
            this.addChild(this.main_title);

            this.sub_title = new Phaser.Text(this.game, 325, 60, "", { font: "22pt Arial", fill: "#ffffff" });
            this.sub_title.anchor.set(0.5, 0);
            this.addChild(this.sub_title);

            this.cost = new Phaser.Text(this.game, 325, 100, "", { font: "20pt Arial", fill: "#ffff00" });
            this.cost.anchor.set(0.5, 0);
            this.addChild(this.cost);
        }

        // Set current action to display, null to hide
        setAction(action: ActionIcon): void {
            if (action) {
                if (this.icon) {
                    this.icon.destroy(true);
                }
                this.icon = new Phaser.Image(this.game, 20, 15, "battle-actions-" + action.action.code);
                this.addChild(this.icon);

                this.position.set(action.x, action.y + action.height + action.bar.actionpoints.height);
                this.main_title.setText(action.action.equipment ? action.action.equipment.name : action.action.name);
                this.sub_title.setText(action.action.equipment ? action.action.name : "");
                this.cost.setText(action.action.equipment ? `Cost: ${action.action.equipment.ap_usage} power` : "");

                Animation.fadeIn(this.game, this, 200, 0.9);
            } else {
                Animation.fadeOut(this.game, this, 200);
            }
        }
    }
}
