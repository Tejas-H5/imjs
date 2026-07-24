// This will be a line-by-line diff, best for tutorials where
// you might iteratively add things between examples, and you don't
// want to manually highlight every change you've made - 
// this can automate that work away a bit.

export const NONE   = 0;
export const INSERT = 1;
export const REMOVE = 2;

export type Block = {
    lines: string[];
    type: number;
};

export function compute(a: string, b: string): Block[] {
    return computeLines(a.split("\n"), b.split("\n"));
}

export function toString(diff: Block[], insertChar="+", removeChar="-"): string {
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
                case INSERT: sb.push(insertChar); break;
                case REMOVE: sb.push(removeChar); break;
                case NONE:   sb.push(""); break;
            }
            sb.push(line);
        }
    }
    return sb.join("");
}

// This is why I write all my stuff from scratch when I can instead of importing libraries.
// The diff completely makes or breaks how hard it is to comprehend a code change.
// A diff library needs to be 100% general, and cannot include carve-outs that
// are useful to you, as they are 'incorrect' in a more general sense.
const knownBadDiffAnchors = [
    "return", "return;",
    "continue", "continue;",
    "break", "break;",
    "}", "};",
    ")", ");",
    "})", "});",
    "",
];

function isBadDiffAnchor(repeatedLines: Set<string>, line: string): boolean {
    if (repeatedLines.has(line)) {
        // Any lines that occur multiple times in either set shouldn't be used to know when a particular section
        // in line a or line b has begun/end. This is because when we find them, we can't tell _which_ one we've hit, 
        // so we may end or start a diff far earlier than we actually should have, causing in a diff that's way more
        // bloated than it needs to be.
        return true;
    }

    const trimmed = line.trim();
    if (knownBadDiffAnchors.includes(trimmed)) {
        return true;
    }

    return false;
}

// NOTE: It turns out, we have independently re-derived the 'patience' diff.
// Turns out that this is actually a pretty good algorithm! nice.
// If you are building tooling, and you think your diff algorithm is not so good, pls pls copy this one
export function computeLines(aLines: string[], bLines: string[]): Block[] {
    aLines = aLines.map(l => l.trimEnd());
    bLines = bLines.map(l => l.trimEnd());

    let aIdx = 0; 
    let bIdx = 0;

    let aIdxLast = 0;
    let bIdxLast = 0;

    const S_NONE     = 0;
    const S_ADDING   = 1;
    const S_REMOVING = 2;

    let aStopLine = 0, bStopLine = 0;

    let state = S_NONE;

    const repeatedLines = new Set<string>();

    const seenLines = new Set<string>();
    for (const line of aLines) {
        if (!seenLines.has(line)) {
            seenLines.add(line);
            continue;
        }

        repeatedLines.add(line);
    }

    seenLines.clear();
    for (const line of bLines) {
        if (!seenLines.has(line)) {
            seenLines.add(line);
            continue;
        }

        repeatedLines.add(line);
    }

    const diff: Block[] = [];

    while (aIdx < aLines.length || bIdx < bLines.length) {
        switch (state) {
            case S_NONE: {
                while (aIdx < aLines.length && bIdx < bLines.length) {
                    const aLine = aLines[aIdx];
                    const bLine = bLines[bIdx];

                    if (linesEqual(aLine, bLine)) {
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
                    for (let b2 = bIdx; b2 < bLines.length; b2++) {
                        const a2Line = aLines[a2];
                        const b2Line = bLines[b2];

                        if (
                            isBadDiffAnchor(repeatedLines, a2Line) || 
                            isBadDiffAnchor(repeatedLines, b2Line)
                        ) {
                            continue
                        }

                        if (linesEqual(a2Line, b2Line)) {
                            if (
                                a2 < aStopLine || 
                                b2 < bStopLine ||
                                !found
                            ) {
                                aStopLine = a2;
                                bStopLine = b2;
                                found = true;
                                // The only reason this break works, is because we've
                                // culled all the bad diff anchors.
                                break;
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
                    diff.push(equalBlock);
                }

                aIdxLast = aIdx;
                bIdxLast = bIdx;
            } break;
            case S_ADDING: {
                while (aIdx < aLines.length && bIdx < bLines.length && bIdx < bStopLine) {
                    const aLine = aLines[aIdx];
                    const bLine = bLines[bIdx];
                    if (!linesEqual(aLine, bLine)) {
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
                    diff.push(insertion);
                }
                bIdxLast = bIdx;

                state = S_NONE;
            } break;
            case S_REMOVING: {
                while (aIdx < aLines.length && bIdx < bLines.length && aIdx < aStopLine) {
                    const aLine = aLines[aIdx];
                    const bLine = bLines[bIdx];
                    if (!linesEqual(aLine, bLine)) {
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
                    diff.push(removal);
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
            diff.push(insertion);
            break
        }
        if (bIdx === bLines.length && aIdxLast !== aLines.length) {
            const removal: Block = {
                lines: aLines.slice(aIdxLast),
                type:  REMOVE,
            };
            diff.push(removal);
            break
        }
    }

    // Trim the end of diffs.
    // We skip over 'bad anchors'. This does however, mean that 
    // each will end with the bad anchors.
    {
        for (let i = 1; i < diff.length; i++) {
            const curr = diff[i];
            const prev = diff[i - 1];

            if (curr.type === INSERT && prev.type === REMOVE) {
                const equalLines: string[] = [];

                while (prev.lines.length > 0 && curr.lines.length > 0) {
                    const line = prev.lines[prev.lines.length - 1];
                    if (line !== curr.lines[curr.lines.length - 1]) {
                        break;
                    }

                    prev.lines.pop();
                    curr.lines.pop();
                    equalLines.push(line);
                }

                equalLines.reverse();
                if (equalLines.length > 0) {
                    let next = {lines: equalLines, type: NONE};
                    diff.splice(i + 1, 0, next);
                }
            }
        }

        filterInPlace(diff, d => d.lines.length > 0);
    }

    // improve diff order
    {
        for (let i = 1; i < diff.length; i++) {
            const curr = diff[i];
            const prev = diff[i - 1];

            if (curr.type === INSERT && prev.type === REMOVE) {
                // I'd like any insertion that is closing off a code block that comes before it
                // to appear before a removal. That way, if we added code above and
                // below a code block, the code that was inserted remains visually intact. 
                // The removals are far less importan than the insertions usually, and
                // if you have an easier time understanding the insertions, it'll
                // give you additional context that makes understanding the removals easier too.

                const idx = lineIdxWhereCodeBlockEnds(prev, "({[", ")}]");
                if (idx !== -1) {
                    // Huge brain move - split this insertion and removal into two blocks, such
                    // that the closing block can still appear before the removal,
                    // BUT the next insertion still appears where it is supposed to appear.

                    const tmp = diff[i - 1];
                    diff[i - 1] = diff[i];
                    diff[i] = tmp;
                }
            }
        }
    }

    return diff;
}

function lineIdxWhereCodeBlockEnds(
    block: Block,
    openingComponents: string,
    closingComponents: string,
): number {
    let numOpen = 0;

    for (let lineIdx = 0; lineIdx < block.lines.length; lineIdx++) {
        const line = block.lines[lineIdx];
        for (let cLineIdx = 0; cLineIdx < line.length; cLineIdx++) {
            const cLine = line[cLineIdx];

            for (let cIdx = 0; cIdx < openingComponents.length; cIdx++) {
                const c = openingComponents[cIdx];
                if (c === cLine) {
                    numOpen++;
                    break;
                }
            }

            for (let cIdx = 0; cIdx < closingComponents.length; cIdx++) {
                const c = closingComponents[cIdx];
                if (c === cLine) {
                    numOpen--;
                    break;
                }
            }

            if (numOpen < 0) {
                return lineIdx;
            }
        }
    }

    return -1;
}

function filterInPlace<T>(arr: T[], predicate: (v: T, i: number) => boolean) {
    let i2 = 0;
    for (let i = 0; i < arr.length; i++) {
        if (predicate(arr[i], i)) arr[i2++] = arr[i];
    }
    arr.length = i2;
}

function linesEqual(lineA: string, lineB: string): boolean {
    return lineA === lineB;
}
