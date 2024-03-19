import { WorldMap } from "./worldmap.js";

export class WallRule {
    static readonly SAME = -1;
    static readonly DONT_CARE = -2;
    static readonly OTHER = -3;

    static new(strings: TemplateStringsArray, ...args: any[]) {
        const rawLast = strings.raw.at(-1);
        const newlineIndex = rawLast.indexOf('\n');
        const raw = [...strings.raw.slice(0, strings.raw.length - 1), rawLast.slice(0, newlineIndex)];
        const frameSymbolString = String.raw({raw}, ...args);
        if (frameSymbolString.includes('\n')) {
            throw new Error(`Invalid WallRule specification, all newlines must come after all interpolations`)
        }
        const frameSymbols = frameSymbolString.replace(/\s/g, "");
        if (!frameSymbols.length || newlineIndex < 0) {
            throw new Error(`Invalid WallRule specification, expects frame symbols followed by a newline`);
        }
        if (/[.#]/.test(frameSymbols)) {
            throw new Error(`Invalid WallRule specification, cannot use . or # as a frame symbol`);
        }
        let matches: RegExpExecArray;
        if (matches = /(.).*\1/.exec(frameSymbols)) {
            throw new Error(`Invalid WallRule specification, duplicated frame symbol ${matches[1]} in ${frameSymbols}`);
        }

        const template = rawLast.slice(newlineIndex + 1);
        const templateLines = template.split("\n");
        if (templateLines.length < 1) {
            throw new Error("Invalid WallRule specification, must have at least two lines in template");
        }
        const mapValues = `. #${frameSymbols}`;

        return new this(frameSymbols.length, templateLines.map(l => l.split("").map(char => {
            const index = mapValues.indexOf(char);
            if (index < 0) {
                throw new Error(`Invalid WallRule specification, character ${char} not found in frame symbols ${frameSymbols}`);
            }
            return index - 3;
        })), frameSymbols.split(""));
    }

    static template(strings: TemplateStringsArray) {
        if (strings.length > 1) {
            throw new Error(`Invalid template WallRule specification, no interpolations are allowed`);
        }
        const str = strings.raw[0];
        if (!str || !str.startsWith("\n")) {
            throw new Error(`Invalid template WallRule specification, must start with newline`);
        }
        const [, ...lines] = str.split("\n");
        const indent = Math.min(...lines.filter(l => /\S/.test(l)).map(l => l.length - l.trimStart().length));
        const rows = lines.map(l => l.slice(indent).split("").map(c => c === "#" ? this.SAME : c === " " ? this.DONT_CARE : this.OTHER));

        return new this(null, rows, null);
    }

    /**
     * Bit ordering for wall-rule tests is clockwise from north of the cardinal directions,
     * then clockwise from northwest of the diagonals, and then finally the center bit, so:
     * 
     *     405
     *     381
     *     726
     * 
     * thus, the two diagonals adjacent to cardinal bit `c` are `c + 4` and `(c + 1) % 4 + 4`,
     * and the two cardinals adjacent to diagonal `d` are `d - 4` and `(d - 1) % 4`
     */
    static readonly bitDirections = [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
        [0, 0],
    ] as const satisfies [dx: number, dy: number][];

    frameCount: number;
    framesTemplate: number[][];
    frameNames: string[];
    /** measured in tiles, not px! */
    frameLocations: { x: number; y: number; }[] = [];
    createMissingFrames = false;

    framesMap = new Int8Array(256);


    constructor(frameCount: number, framesTemplate: number[][], frameNames: string[]) {
        this.frameCount = frameCount;
        this.framesTemplate = framesTemplate;
        this.frameNames = frameNames;

        if (!frameNames) {
            this.createMissingFrames = true;
            this.frameNames = [];
        }

        this.calculateFrames(framesTemplate);
    }

    calculateFrames(template: number[][]) {
        const {bitDirections, SAME, OTHER, DONT_CARE} = WallRule;
        const definedAt: Record<number, string> = {};
        for (const [y, templateRow] of template.entries()) {
            for (let [x, cell] of templateRow.entries()) {
                if (cell < (this.createMissingFrames ? SAME : 0)) continue;
                let totals = [0];
                for (let bit = 0; bit < 8; bit++) {
                    const [dx, dy] = bitDirections[bit];
                    let other = template[y + dy]?.[x + dx] ?? OTHER;
                    if (bit > 3) {
                        // diagonals only count if both adjacent orthogonals are set
                        const orthos = (1 << (bit - 4)) | (1 << ((bit - 1) & 3));
                        if (!totals.every(v => ((v & orthos) === orthos))) {
                            other = DONT_CARE;
                        }
                    }
                    if (other >= SAME) {
                        totals.forEach((v,i) => totals[i] = v | (1 << bit));
                    } else if (other === DONT_CARE) {
                        totals = totals.flatMap(v => [v, v | (1 << bit)]);
                    }
                }
                if (cell === SAME) {
                    // try to find a matching cell from amongst our totals
                    for (const total of totals) {
                        if (total in definedAt && this.framesMap[total] !== SAME) {
                            cell = this.framesMap[total];
                            break;
                        }
                    }
                    // otherwise create a new frame
                    if (cell === SAME) {
                        cell = this.frameNames.length;
                        this.frameNames.push(cell.toString(36));
                    }
                    // record the cell in the template
                    templateRow[x] = cell;
                }
                const location = `${y+1},${x+1}`
                for (const total of totals) {
                    if (total in definedAt && cell !== SAME && this.framesMap[total] !== cell) {
                        throw new Error(`Error in WallRule: bit pattern ${total} (${total.toString(2)}), originally defined at ${definedAt[total]} as ${this.framesMap[total]} (${this.frameNames[this.framesMap[total]]}), redefined at ${location} as ${cell} (${this.frameNames[cell]})`);
                    } else if (total in definedAt) {
                        continue;
                    }
                    if (!this.frameLocations[cell]) {
                        this.frameLocations[cell] = {x, y};
                    }
                    definedAt[total] = location;
                    this.framesMap[total] = cell;
                }
            }
        }
    }

    getFrame(worldMap: WorldMap, x: number, y: number, z: number, base=worldMap.getBase(x, y, z)) {
        let total = 0;
        const {bitDirections} = WallRule;
        for (let bit = 0; bit < 8; bit++) {
            const [dx, dy] = bitDirections[bit];
            if (worldMap.isSameBaseAs(x + dx, y + dy, z, base)) {
                total |= 1 << bit;
            }
        }
        return this.framesMap[total];
    }
}

