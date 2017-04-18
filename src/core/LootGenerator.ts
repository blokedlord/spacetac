module TS.SpaceTac {
    // Equipment generator from loot templates
    export class LootGenerator {
        // List of available templates
        templates: LootTemplate[];

        // Random generator that will be used
        random: RandomGenerator;

        // Construct a basic loot generator
        //  The list of templates will be automatically populated
        constructor(random = RandomGenerator.global, populate: boolean = true) {
            this.templates = [];
            this.random = random;

            if (populate) {
                this.populate();
            }
        }

        // Fill the list of templates
        populate(): void {
            var templates: LootTemplate[] = [];
            for (var template_name in TS.SpaceTac.Equipments) {
                if (template_name && template_name.indexOf("Abstract") != 0) {
                    var template_class = TS.SpaceTac.Equipments[template_name];
                    var template: LootTemplate = new template_class();
                    templates.push(template);
                }
            }
            this.templates = templates;
        }

        // TODO Add generator from skills
        // TODO Add generator of other qualities

        // Generate a random equipment for a specific level
        //  If slot is specified, it will generate an equipment for this slot type specifically
        //  If no equipment could be generated from available templates, null is returned
        generate(level: number, slot: SlotType | null = null): Equipment | null {
            // Generate equipments matching conditions, with each template
            let equipments = this.templates.filter(template => slot == null || slot == template.slot).map(template => template.generate(level));

            // No equipment could be generated with given conditions
            if (equipments.length === 0) {
                return null;
            }

            // Pick a random equipment
            return this.random.choice(equipments);
        }
    }
}
