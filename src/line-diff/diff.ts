// This will be a line-by-line diff, best for tutorials where
// you might iteratively add things between examples, and you don't
// want to manually highlight every change you've made - 
// this can automate that work away a bit.

export const NONE   = 0;
export const INSERT = 1;
export const REMOVE = 2;
export const EDIT   = 3;

export type Block = {
    lines: string[];
    type: number;
};

export function compute(a: string, b: string): Block[] {
    return computeLines(a.split("\n"), b.split("\n"));
}

export function toString(diff: Block[], insertChar="+", removeChar="-", editChar = "~"): string {
    const sb: string[] = [];
    for (let blockIdx = 0; blockIdx < diff.length; blockIdx++) {
        const block = diff[blockIdx];
        if (blockIdx > 0) {
            sb.push("\n");
        }

        for (let lineIdx = 0; lineIdx < block.lines.length; lineIdx++) {
            const line = block.lines[lineIdx];
            if (lineIdx > 0) {
                sb.push("\n");
            }

            switch (block.type) {
                case EDIT:   sb.push(editChar);   break;
                case INSERT: sb.push(insertChar); break;
                case REMOVE: sb.push(removeChar); break;
                case NONE:   sb.push(""); break;
            }
            sb.push(line);
        }
    }
    return sb.join("");
}

export function computeLines(aLines: string[], bLines: string[]): Block[] {
    let aIdx = 0; 
    let bIdx = 0;

    let aIdxLast = 0;
    let bIdxLast = 0;

    const S_NONE     = 0;
    const S_ADDING   = 1;
    const S_REMOVING = 2;

    let state = S_NONE;

    const result: Block[] = [];

    while (aIdx < aLines.length || bIdx < bLines.length) {
        switch (state) {
            case S_NONE: {
                while (aIdx < aLines.length && bIdx < bLines.length) {
                    const aLine = aLines[aIdx];
                    const bLine = bLines[bIdx];

                    if (aLine === bLine) {
                        aIdx++;
                        bIdx++;
                        continue
                    }

                    break;
                }

                const bLine = bLines[bIdx];
                const aLine = aLines[aIdx];

                let aMatchIdx = aIdx + 1;
                let aFound = false;
                while (aMatchIdx < aLines.length) {
                    if (aLines[aMatchIdx] === bLine) {
                        aFound = true;
                        break;
                    }
                    aMatchIdx++;
                }

                let bMatchIdx = bIdx + 1;
                let bFound = false;
                while (bMatchIdx < bLines.length) {
                    if (bLines[bMatchIdx] === aLine) {
                        bFound = true;
                        break;
                    }
                    bMatchIdx++;
                }

                if (aFound && bFound) {
                    if (aMatchIdx < bMatchIdx) {
                        // if aMatchIdx is less, we need to remove less than we 
                        // need to add in order to reach another equal line.
                        state = S_REMOVING;
                    } else {
                        state = S_ADDING;
                    }
                } else if (bFound) {
                    state = S_ADDING;
                } else {
                    state = S_REMOVING;
                }

                const block: Block = {
                    // All of these lines are equal. It could have just as well have been
                    // lines: bLines.slice(bIdxLast, bIdx),
                    lines: aLines.slice(aIdxLast, aIdx),
                    type:  NONE,
                };
                aIdxLast = aIdx;
                bIdxLast = bIdx;

                pushBlock(result, block);
            } break;
            case S_ADDING: {
                while (aIdx < aLines.length && bIdx < bLines.length) {
                    const aLine = aLines[aIdx];
                    const bLine = bLines[bIdx];
                    if (aLine !== bLine) {
                        bIdx++;
                        continue
                    }

                    break;
                }

                const block: Block = {
                    lines: bLines.slice(bIdxLast, bIdx),
                    type:  INSERT,
                };
                bIdxLast = bIdx;

                pushBlock(result, block);
                state = S_NONE;
            } break;
            case S_REMOVING: {
                while (aIdx < aLines.length && bIdx < bLines.length) {
                    const aLine = aLines[aIdx];
                    const bLine = bLines[bIdx];
                    if (aLine !== bLine) {
                        aIdx++;
                        continue
                    }

                    break;
                }

                const block: Block = {
                    lines: aLines.slice(aIdxLast, aIdx),
                    type:  REMOVE,
                };
                aIdxLast = aIdx;

                pushBlock(result, block);
                state = S_NONE;
            } break;
        }

        if (aIdx === aLines.length && bIdx === bLines.length) {
            break;
        }
        if (aIdx === aLines.length) {
            const inserted: Block = {
                lines: bLines.slice(bIdxLast),
                type:  INSERT,
            };
            pushBlock(result, inserted);
            break
        }
        if (bIdx === bLines.length) {
            const removed: Block = {
                lines: aLines.slice(aIdxLast),
                type:  REMOVE,
            };
            pushBlock(result, removed);
            break
        }
    }

    return result;
}

function pushBlock(blocks: Block[], block: Block) {
    if (block.lines.length > 0) {
        blocks.push(block);
    }
}
