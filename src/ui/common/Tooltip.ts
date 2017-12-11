/// <reference path="UIBuilder.ts" />

module TK.SpaceTac.UI {

    class TooltipContainer extends Phaser.Group {
        view: BaseView
        background: Phaser.Graphics
        content: Phaser.Group
        item: IBounded
        border = 10
        margin = 6
        viewport: IBounded | null = null

        constructor(view: BaseView) {
            super(view.game);

            this.view = view;
            this.visible = false;

            this.background = new Phaser.Graphics(this.game);
            this.add(this.background);

            this.content = new Phaser.Group(this.game);
            this.add(this.content);

            this.view.tooltip_layer.add(this);
        }

        show(item: IBounded) {
            this.item = item;
            this.visible = true;
            this.update();
        }

        tryPosition(viewport: IBounded, tooltip: IBounded): [number, number, number] {
            let [x, y] = UITools.positionInside(tooltip, viewport);
            let distance = Math.max(Math.abs(x - tooltip.x), Math.abs(y - tooltip.y));
            if (this.view.isMouseInside({ x: x, y: y, width: tooltip.width, height: tooltip.height })) {
                distance += 1000;
            }
            return [x, y, distance];
        }

        getBestPosition(item: IBounded, width: number, height: number): [number, number] {
            let viewport = this.viewport || { x: 0, y: 0, width: this.view.getWidth(), height: this.view.getHeight() };
            let candidates = [
                this.tryPosition(viewport, { x: item.x + item.width / 2 - width / 2, y: item.y + item.height + this.margin, width: width, height: height }),
                this.tryPosition(viewport, { x: item.x + item.width + this.margin, y: item.y + item.height / 2 - height / 2, width: width, height: height }),
                this.tryPosition(viewport, { x: item.x + item.width / 2 - width / 2, y: item.y - height - this.margin, width: width, height: height }),
                this.tryPosition(viewport, { x: item.x - width - this.margin, y: item.y + item.height / 2 - height / 2, width: width, height: height }),
            ]
            candidates[0][2] -= 1;  // preference to down tooltip on equality
            let [x, y, distance] = candidates.sort((a, b) => cmp(a[2], b[2]))[0];
            return [x, y];
        }

        update() {
            if (this.visible) {
                let [width, height] = UITools.drawBackground(this.content, this.background, this.border);

                let [x, y] = this.getBestPosition(this.item, width, height);
                x += this.border;
                y += this.border;
                if (x != this.x || y != this.y) {
                    this.position.set(x, y);
                }
            }
        }

        hide() {
            this.content.removeAll();
            this.background.clear();
            this.visible = false;
        }
    }

    /**
     * Functions used to fill a tooltip content
     */
    export class TooltipBuilder extends UIBuilder {
        private container: TooltipContainer;

        constructor(container: TooltipContainer) {
            let style = new UITextStyle();
            style.center = false;
            style.vcenter = false;
            style.shadow = true;
            super(container.view, container.content, style);

            this.container = container;
        }

        /**
         * Configure the positioning and base style of the tooltip
         */
        configure(border = 10, margin = 6, viewport: IBounded | null = null): void {
            this.container.border = border;
            this.container.margin = margin;
            if (viewport) {
                this.container.viewport = viewport;
            }
        }
    }

    /**
     * Tooltip system, to display information on hover
     */
    export class Tooltip {
        protected view: BaseView;
        protected container: TooltipContainer;

        constructor(view: BaseView) {
            this.view = view;
            this.container = new TooltipContainer(view);
        }

        get ui(): MainUI {
            return this.view.gameui;
        }

        /**
         * Get a tooltip builder
         */
        getBuilder(): TooltipBuilder {
            return new TooltipBuilder(this.container);
        }

        /**
         * Bind to an UI component
         * 
         * When the component is hovered, the function is called to allow filling the tooltip container
         */
        bind(obj: Phaser.Button, func: (filler: TooltipBuilder) => boolean): void {
            this.view.inputs.setHoverClick(obj,
                // enter
                () => {
                    this.hide();
                    if (func(this.getBuilder())) {
                        this.container.show(obj.getBounds());
                    }
                },
                // leave
                () => this.hide(),
                // click
                () => this.hide()
            );
            obj.onInputDown.add(() => this.hide());
        }

        /**
         * Bind to an UI component to display a dynamic text
         */
        bindDynamicText(obj: Phaser.Button, text_getter: () => string): void {
            this.bind(obj, filler => {
                let content = text_getter();
                if (content) {
                    filler.text(content, 0, 0, { color: "#cccccc", size: 20 });
                    return true;
                } else {
                    return false;
                }
            });
        }

        /**
         * Bind to an UI component to display a simple text
         */
        bindStaticText(obj: Phaser.Button, text: string): void {
            this.bindDynamicText(obj, () => text);
        }

        /**
         * Hide the current tooltip
         */
        hide(): void {
            this.container.hide();
        }
    }
}