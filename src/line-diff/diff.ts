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

// Turns out that this is actually a pretty good algorithm! nice.
// If you are building tooling, and you think your diff algorithm is not so good, pls pls copy this one
export function computeLines(aLines: string[], bLines: string[]): Block[] {
    let aIdx = 0; 
    let bIdx = 0;

    let aIdxLast = 0;
    let bIdxLast = 0;

    const S_NONE     = 0;
    const S_ADDING   = 1;
    const S_REMOVING = 2;

    let aStopLine = 0, bStopLine = 0;

    let state = S_NONE;

    // Any lines that occur multiple times in either set shouldn't be used to know when a particular section
    // in line a or line b has begun/end. This is because when we find them, we can't tell _which_ one we've hit, 
    // so we may end or start a diff far earlier than we actually should have, causing in a diff that's way more
    // bloated than it needs to be.
    const badDiffAnchors = new Set<string>();

    const seenLines = new Set<string>();
    for (const line of aLines) {
        if (!seenLines.has(line)) {
            seenLines.add(line);
            continue;
        }

        badDiffAnchors.add(line);
    }

    seenLines.clear();
    for (const line of bLines) {
        if (!seenLines.has(line)) {
            seenLines.add(line);
            continue;
        }

        badDiffAnchors.add(line);
    }

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

                let found = false;

                // We need to find the next line they both have in common.
                // The stuff in between would have been removed from a and
                // added to b.
                for (let a2 = aIdx; a2 < aLines.length; a2++) {
                    const a2Line = aLines[a2];
                    for (let b2 = bIdx; b2 < bLines.length; b2++) {
                        const b2Line = bLines[b2];

                        if (badDiffAnchors.has(a2Line) || badDiffAnchors.has(b2Line)) {
                            continue
                        }

                        if (a2Line === b2Line) {
                            if (
                                a2 < aStopLine || 
                                b2 < bStopLine ||
                                !found
                            ) {
                                aStopLine = a2;
                                bStopLine = b2;
                                found = true;
                            }
                        }
                    }
                }

                if (!found) {
                    // Remove left, add the right. ez.
                    aStopLine = aLines.length;
                    bStopLine = bLines.length;
                }

                // huge brain - if nothing was removed, we push nothing, and transiton to adding.
                state = S_REMOVING;

                if (aIdxLast !== aIdx) {
                    const equalBlock: Block = {
                        // All of these lines are equal. It could have just as well have been
                        // lines: bLines.slice(bIdxLast, bIdx),
                        lines: aLines.slice(aIdxLast, aIdx),
                        type:  NONE,
                    };
                    result.push(equalBlock);
                }

                aIdxLast = aIdx;
                bIdxLast = bIdx;
            } break;
            case S_ADDING: {
                while (aIdx < aLines.length && bIdx < bLines.length && bIdx < bStopLine) {
                    const aLine = aLines[aIdx];
                    const bLine = bLines[bIdx];
                    if (aLine !== bLine) {
                        bIdx++;
                        continue
                    }

                    break;
                }

                if (bIdxLast !== bIdx) {
                    const insertion: Block = {
                        lines: bLines.slice(bIdxLast, bIdx),
                        type:  INSERT,
                    };
                    result.push(insertion);
                    if (result.length > 1 && result[result.length - 2].type === REMOVE) {
                        // A lot of diffs look nicer when the removal appears _after_
                        // the insertion.
                        const tmp = result[result.length - 2];
                        result[result.length - 2] = result[result.length - 1];
                        result[result.length - 1] = tmp;
                    }
                }
                bIdxLast = bIdx;

                state = S_NONE;
            } break;
            case S_REMOVING: {
                while (aIdx < aLines.length && bIdx < bLines.length && aIdx < aStopLine) {
                    const aLine = aLines[aIdx];
                    const bLine = bLines[bIdx];
                    if (aLine !== bLine) {
                        aIdx++;
                        continue
                    }

                    break;
                }

                if (aIdxLast !== aIdx) {
                    const removal: Block = {
                        lines: aLines.slice(aIdxLast, aIdx),
                        type:  REMOVE,
                    };
                    result.push(removal);
                }
                aIdxLast = aIdx;
                state = S_ADDING;
            } break;
        }

        if (aIdx === aLines.length && bIdx === bLines.length) {
            break;
        }
        if (aIdx === aLines.length && bIdxLast !== bLines.length) {
            const insertion: Block = {
                lines: bLines.slice(bIdxLast),
                type:  INSERT,
            };
            result.push(insertion);
            break
        }
        if (bIdx === bLines.length && aIdxLast !== aLines.length) {
            const removal: Block = {
                lines: aLines.slice(aIdxLast),
                type:  REMOVE,
            };
            result.push(removal);
            break
        }
    }

    return result;
}
