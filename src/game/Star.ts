/// <reference path="Serializable.ts"/>

module SpaceTac.Game {
    // A star system
    export class Star extends Serializable {

        // Available names for star systems
        static NAMES_POOL = [
            "Alpha Prime",
            "Bright Skies",
            "Costan Sector",
            "Duncan's Legacy",
            "Ethiopea",
            "Fringe Space",
            "Gesurd Deep",
            "Helios",
            "Justice Enclave",
            "Kovak Second",
            "Lumen Circle",
            "Manoa Society",
            "Neptune's Record",
            "Ominous Murmur",
            "Pirate's Landing",
            "Quasuc Effect",
            "Roaring Thunder",
            "Safe Passage",
            "Time Holes",
            "Unknown Territory",
            "Vulcan Terror",
            "Wings Aurora",
            "Xenos Trading",
            "Yu's Pride",
            "Zoki's Hammer",
            "Astral Tempest",
            "Burned Star",
            "Crystal Bride",
            "Death Star",
            "Ether Bending",
            "Forgotten Realm",
            "Galactic Ring",
            "Hegemonia",
            "Jorgon Trails",
            "Kemini System",
            "Light Rain",
            "Moons Astride",
            "Nubia's Sisters",
            "Opium Hide",
            "Paradise Quest",
            "Quarter Horizon",
            "Rising Dust",
            "Silence of Forge",
            "Titan Feet",
            "Unicorn Fly",
            "Violated Sanctuary",
            "World's Repose",
            "Xanthia's Travel",
            "Yggdrasil",
            "Zone of Ending",
        ];

        // Parent universe
        universe: Universe;

        // Name of the system (unique in the universe)
        name: string;

        // Location in the universe
        x: number;
        y: number;

        // Radius of the star system
        radius: number;

        // List of points of interest
        locations: StarLocation[];

        // Base level for encounters in this system
        level: number;

        constructor(universe: Universe = null, x: number = 0, y: number = 0) {
            super();

            this.universe = universe || new Universe();
            this.x = x;
            this.y = y;
            this.radius = 0.1;
            this.locations = [];
            this.level = 1;
        }

        // Get the distance to another star
        getDistanceTo(star: Star): number {
            var dx = this.x - star.x;
            var dy = this.y - star.y;

            return Math.sqrt(dx * dx + dy * dy);
        }

        // Generate the contents of this star system
        generate(random: RandomGenerator = new RandomGenerator()): void {
            var location_count = random.throwInt(2, 10);
            this.locations = this.generateLocations(location_count, random);
        }

        // Generate points of interest (*count* doesn't include the star and warp locations)
        generateLocations(count: number, random: RandomGenerator = new RandomGenerator()): StarLocation[] {
            var result: StarLocation[] = [];

            // Add the star
            result.push(new StarLocation(this, StarLocationType.STAR, 0, 0));

            // Add warp locations around the star
            var links = this.getLinks();
            links.forEach((link: StarLink) => {
                var warp = this.generateOneLocation(StarLocationType.WARP, result, this.radius * 0.3, random);

                // If there is an unbound warp location on destination sector, bind with it
                var peer_star = link.getPeer(this);
                var peer_location = peer_star.findUnboundWarp();
                if (peer_location) {
                    peer_location.setJumpDestination(warp);
                    warp.setJumpDestination(peer_location);
                }

                result.push(warp);
            });

            // Add random locations
            while (count--) {
                result.push(this.generateOneLocation(StarLocationType.PLANET, result, this.radius, random));
            }

            return result;
        }

        // Get the number of links to other stars
        getLinks(): StarLink[] {
            var result: StarLink[] = [];

            this.universe.starlinks.forEach((link: StarLink) => {
                if (link.first === this || link.second === this) {
                    result.push(link);
                }
            });

            return result;
        }

        // Find an unbound warp location to bind, null if none found
        findUnboundWarp(): StarLocation {
            var result: StarLocation = null;
            this.locations.forEach((location: StarLocation) => {
                if (location.type === StarLocationType.WARP && !location.jump_dest) {
                    result = location;
                }
            });
            return result;
        }

        // Check if a location is far enough from all other ones
        private checkMinDistance(loc: StarLocation, others: StarLocation[]): boolean {
            return others.every((iloc: StarLocation): boolean => {
                return iloc.getDistanceTo(loc) > this.radius * 0.1;
            });
        }

        // Generate a single location
        private generateOneLocation(type: StarLocationType, others: StarLocation[], radius: number, random: RandomGenerator): StarLocation {
            do {
                var x = (random.throw(2) - 1) * radius;
                var y = (random.throw(2) - 1) * radius;
                var result = new StarLocation(this, type, x, y);
            } while (!this.checkMinDistance(result, others));

            return result;
        }
    }
}