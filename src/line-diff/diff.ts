// This will be a line-by-line diff, best for tutorials where
// you might iteratively add things between examples, and you don't
// want to manually highlight every change you've made - 
// this can automate that work away a bit.

export const NONE   = 0;     // lines equal in both text
export const INSERT = 1;     // lines inserted in the new text
export const REMOVE = 2;     // lines removed from the old text
export const WHITESPACE = 3; // lines that are not equal, but become equal after calling .trim() on them

// TODO: Detect identical remove/insert pairs, and mark them as moves. 

export type Block = 
 | NormalBlock
 | IndentationBlock
 ;

export type BaseBlock = {
    lines: string[];
}

export type NormalBlock = BaseBlock & {
    type: | typeof NONE
          | typeof INSERT
          | typeof REMOVE;
}

export type IndentationBlock = BaseBlock & {
    type:  typeof WHITESPACE;
    indentation: number[];
}

export function compute(a: string, b: string): Block[] {
    return computeLines(a.split("\n"), b.split("\n"));
}

export function toString(diff: Block[], insertChar="+", removeChar="-"): string {
    const sb: string[] = [];
    for (let blockIdx = 0; blockIdx < diff.length; blockIdx++) {
        const block     = diff[blockIdx];
        if (blockIdx > 0) {
            sb.push("\n");
        }

        for (let lineIdx = 0; lineIdx < block.lines.length; lineIdx++) {
            const line = block.lines[lineIdx];
            if (lineIdx > 0) {
                sb.push("\n");
            }

            switch (block.type) {
                case INSERT:    sb.push(insertChar); break;
                case REMOVE:    sb.push(removeChar); break;
                case NONE:      sb.push(""); break;
                case WHITESPACE: {
                    sb.push(block.indentation[lineIdx] < 0 ? "<" : ">"); 
                } break;
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
    line = line.trim();

    if (repeatedLines.has(line)) {
        // Any lines that occur multiple times in either set shouldn't be used to know when a particular section
        // in line a or line b has begun/end. This is because when we find them, we can't tell _which_ one we've hit, 
        // so we may end or start a diff far earlier than we actually should have, causing in a diff that's way more
        // bloated than it needs to be.
        return true;
    }

    if (knownBadDiffAnchors.includes(line)) {
        return true;
    }

    return false;
}

function getRepeatedLines(lines: string[], seen: Set<string>, repeated: Set<string>) {
    for (let line of lines) {
        line = line.trim();
        if (!seen.has(line)) {
            seen.add(line);
            continue;
        }

        repeated.add(line);
    }
}

// NOTE: It turns out, we have independently re-derived the 'patience' diff.
// Turns out that this is actually a pretty good algorithm! nice.
// If you are building tooling, and you think your diff algorithm is not so good, pls pls copy this one
export function computeLines(aLines: string[], bLines: string[], depth = 0): Block[] {
    aLines = aLines.map(l => l.trimEnd());
    bLines = bLines.map(l => l.trimEnd());

    let aIdx = 0, bIdx = 0;
    let aIdxLast = 0, bIdxLast = 0;

    const repeatedLines = new Set<string>();

    const seenLines = new Set<string>();
    getRepeatedLines(aLines, seenLines, repeatedLines);

    seenLines.clear();
    getRepeatedLines(aLines, seenLines, repeatedLines);

    const diff: Block[] = [];

    while (aIdx < aLines.length || bIdx < bLines.length) {
        const aLine = aLines[aIdx];
        const bLine = bLines[bIdx];
        aIdxLast = aIdx;
        bIdxLast = bIdx;

        if (!(aIdx < aLines.length && bIdx < bLines.length)) {
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
            break;
        }

        if (aLine === bLine) {
            // Collect equal lines
            while (aIdx < aLines.length && bIdx < bLines.length) {
                const aLine = aLines[aIdx];
                const bLine = bLines[bIdx];
                if (aLine !== bLine) {break;}
                aIdx++; bIdx++;
            }

            if (aIdx !== aIdxLast) {
                diff.push({
                    type: NONE,
                    lines: aLines.slice(aIdxLast, aIdx),
                });
            }
            continue;
        }

        if (aLine.trim() === bLine.trim()) {
            // Collect whitespace-equal lines
            while (aIdx < aLines.length && bIdx < bLines.length) {
                const aLine = aLines[aIdx];
                const bLine = bLines[bIdx];
                if (aLine === bLine) {
                    // No longer whitespace-equal
                    break;
                }
                if (aLine.trim() !== bLine.trim()) {break;}
                aIdx++; bIdx++;
            }

            if (aIdx !== aIdxLast) {
                const lines = bLines.slice(bIdxLast, bIdx);
                const indentation = new Array(lines.length).fill(0);
                for (let i = 0; i < lines.length; i++) {
                    indentation[i] = lines[i].length - aLines[aIdxLast + i].length;
                }
                diff.push({
                    type: WHITESPACE,
                    lines: lines,
                    indentation: indentation,
                });
            }
            continue;
        }

        // Collect removals and inserts
        let aLineAnchor = aLines.length;
        let bLineAnchor = bLines.length;
        for (let a2 = aIdx; a2 < aLines.length; a2++) {
            for (let b2 = bIdx; b2 < bLineAnchor; b2++) {
                const a2Line = aLines[a2];
                const b2Line = bLines[b2];

                if (
                    isBadDiffAnchor(repeatedLines, a2Line.trim()) || 
                    isBadDiffAnchor(repeatedLines, b2Line.trim())
                ) {
                    continue
                }

                if (a2Line.trim() !== b2Line.trim()) {
                    continue;
                }

                // const REQUIRED_EQUAL_LINES = 1;
                // if (!compareLines(aLines, bLines, a2, b2, REQUIRED_EQUAL_LINES)) {
                //     continue;
                // }

                // We want to find the closest anchor, basically.
                if (b2 < bLineAnchor) {
                    aLineAnchor = a2;
                    bLineAnchor = b2;
                    break;
                }
            }
        }

        // Trim the ends of the anchor before we start adding
        while (aLineAnchor > aIdx && bLineAnchor > bIdx) {
            if (aLines[aLineAnchor-1] !== bLines[bLineAnchor-1]) {
                break;
            }
            aLineAnchor--;
            bLineAnchor--;
        }
        aIdx = aLineAnchor;
        bIdx = bLineAnchor;

        // Collect lines we added and removed
        if (aIdxLast !== aIdx) {
            const removed = aLines.slice(aIdxLast, aIdx);
            diff.push({ type: REMOVE, lines: removed });
        }

        if (bIdxLast !== bIdx) {
            const inserted = bLines.slice(bIdxLast, bIdx);
            diff.push({ type: INSERT, lines: inserted });
        }
    }

    // Recursively improve the diff.
    if (depth <= 2) {
        for (let i = 1; i < diff.length; i++) {
            const curr = diff[i];
            const prev = diff[i - 1];

            if (curr.type === INSERT && prev.type === REMOVE) {
                // Very big brain. The diff will be better, because there will
                // be fewer repeated anchors.
                const recursion = computeLines(prev.lines, curr.lines, depth + 1)
                diff.splice(i - 1, 2, ...recursion); // splice is a suspiciously useful operation.
                i += recursion.length - 2;
            }
        }
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
