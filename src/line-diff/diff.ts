// This will be a line-by-line diff, best for tutorials where
// you might iteratively add things between examples, and you don't
// want to manually highlight every change you've made - 
// this can automate that work away a bit.

export const NONE   = 0;     // lines equal in both text
export const INSERT = 1;     // lines inserted in the new text
export const REMOVE = 2;     // lines removed from the old text
export const INDENTATION = 3; // lines that are not equal, but become equal after calling .trim() on them

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
    type:  typeof INDENTATION;
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
                case INDENTATION: {
                    sb.push(block.indentation[lineIdx] < 0 ? "<" : ">"); 
                } break;
            }
            sb.push(line);
        }
    }
    return sb.join("");
}

function longestCommonSubsequenceScored(
    aLines: string[], bLines: string[],
    aStart: number, aEnd: number,
    bStart: number, bEnd: number,
): [number, number, number] {
    let aLcsStart = 0;
    let bLcsStart = 0;
    let len = 0;
    let score = 0;

    for (let aIdx = aStart; aIdx < aEnd; aIdx++) {
        for (let bIdx = bStart; bIdx < bEnd; bIdx++) {
            if (aLines[aIdx].trim() !== bLines[bIdx].trim()) continue;

            let thisLen = -1;
            let thisScore = 0;
            for (
                let k = 0; 
                (aIdx + k < aEnd) && (bIdx + k < bEnd);
                k++
            ) { 
                // This diff will be whitespace start/end insensitive.
                // We'll figure out the difference between whitespace and indentation 
                // blocks at the end.
                const thisLine = aLines[aIdx + k].trim();
                if (thisLine !== bLines[bIdx + k].trim()) {
                    break;
                } else {
                    thisLen = k + 1;
                    thisScore += thisLine.length;
                }
            }

            // Penalize lines starting with } or ). 
            // This will make most code diffs look nicer.
            for (let i = 0; i < thisLen; i++) {
                const startTrimmed = aLines[aIdx + i].trimStart();
                if (
                    startTrimmed.startsWith("}") ||
                    startTrimmed.startsWith(")")
                ) {
                    thisScore -= (0.05 * thisScore) * (thisLen - i - 1) / thisLen;
                }
            }

            if (thisScore >= score) {
                len = thisLen;
                score = thisScore;
                aLcsStart = aIdx;
                bLcsStart = bIdx;
            }
        }
    }

    return [aLcsStart, bLcsStart, len];
}

export function computeLines(aLines: string[], bLines: string[]): Block[] {
    aLines = aLines.map(l => l.trimEnd());
    bLines = bLines.map(l => l.trimEnd());

    let result: Block[] = [];

    // First pass
    diffInternal(aLines, bLines, 0, aLines.length, 0, bLines.length, result);

    // Optimize diffs - find touching insert/remove blocks, and re-run the diff
    // algorithm on them. I've found that I don't need to do this recursively (so far)
    {
        const dst: Block[] = [];

        for (let i = 0; i < result.length; i++) {
            const curr = result[i];
            if (i < result.length - 1) {
                const next = result[i + 1];

                if (curr.type === REMOVE && next.type === INSERT) {
                    if (curr.lines.length > 0 && next.lines.length > 0) {
                        diffInternal(
                            curr.lines, next.lines,
                            0, curr.lines.length,
                            0, next.lines.length,
                            dst
                        );
                        i++;
                        continue;
                    }
                }
            }

            dst.push(curr);
        }

        result = dst;
    }

    // Coalesce blocks
    result = coalesceBlocks(result);

    return result;
}

function diffInternal(
    aLines: string[], bLines: string[],
    aStart: number, aEnd: number,
    bStart: number, bEnd: number,
    result: Block[],
) {
    if (aStart === aEnd && bStart === bEnd) {
        return;
    }

    const [aLcsStart, bLcsStart, len] 
        = longestCommonSubsequenceScored(aLines, bLines, aStart, aEnd, bStart, bEnd);

    if (len === 0) {
        if (aStart !== aEnd) {
            result.push({type: REMOVE, lines: aLines.slice(aStart, aEnd)});
        }
        if (bStart !== bEnd) {
            result.push({type: INSERT, lines: bLines.slice(bStart, bEnd)});
        }
        return;
    }

    diffInternal(aLines, bLines, aStart, aLcsStart, bStart, bLcsStart, result);

    // Push NONE/WHITESPACE based on whether the lines are equal, or equal after calling trim()
    {
        let k = 0;
        while (k < len) {
            const kStart = k;
            if (aLines[aLcsStart + k] !== bLines[bLcsStart + k]) {
                while (k < len) {
                    if (aLines[aLcsStart + k] === bLines[bLcsStart + k]) {
                        if (aLines[aLcsStart + k].trim() !== "") {
                            break;
                        }
                    }
                    k++;
                }

                const lines = bLines.slice(bLcsStart + kStart, bLcsStart + k);

                const indentation: number[] = [];
                for (let i = kStart; i < k; i++) {
                    const aLine = aLines[aLcsStart + i];
                    const bLine = lines[i - kStart];
                    const indent = bLine.length - aLine.length;
                    indentation.push(indent);
                }

                result.push({type: INDENTATION, lines: lines, indentation: indentation});
            } else if (aLines[aLcsStart + k] === bLines[bLcsStart + k]) {
                while (k < len && aLines[aLcsStart + k] === bLines[bLcsStart + k]) {
                    k++;
                }

                result.push({type: NONE, lines: aLines.slice(aLcsStart + kStart, aLcsStart + k)});
            }
        }
    }

    diffInternal(aLines, bLines, aLcsStart + len, aEnd, bLcsStart + len, bEnd, result);
}

function coalesceBlocks(result: Block[]): Block[] {
    const dst: Block[] = [];

    for (let i = 0; i < result.length; i++) {
        const curr = result[i];

        let handled = false;

        if (dst.length > 0) {
            const prev = dst[dst.length - 1];
            if (prev.type === INDENTATION) {
            } else {
                if (prev.type === curr.type) {
                    prev.lines.push(...curr.lines);
                    handled = true;
                }
            }
        }

        if (!handled) {
            dst.push(curr);
        }
    }

    return dst;
}
