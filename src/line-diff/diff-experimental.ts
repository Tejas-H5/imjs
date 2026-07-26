// THis is unfinished work on an experimental diff. 
// For some reason, it performs very well on toy examples but
// terribly on the examples in the tutorials, unlike
// the other diff method I made. 
// I may return to this in the future when I have some more
// ideas on how to do diffing. 
// Ideally, the diff would also detect indentation/dedentation,
// and blocks of code that have moved. 

// This will be a line-by-line diff, best for tutorials where
// you might iteratively add things between examples, and you don't
// want to manually highlight every change you've made - 
// this can automate that work away a bit.

export const NONE   = 0;     // lines equal in both text
export const INSERT = 1;     // lines inserted in the new text
export const REMOVE = 2;     // lines removed from the old text
export const INDENTATION = 3; // lines that are not equal, but become equal after calling .trim() on them

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
    type:  typeof INDENTATION;
    indentation: number[];
}

export function compute(a: string, b: string): Block[] {
    return computeLines(a.split("\n"), b.split("\n"));
}

const S_REMOVED = -999;

export function computeLines(aLines: string[], bLines: string[]): Block[] {
    aLines = aLines.map(l => l.trimEnd());
    bLines = bLines.map(l => l.trimEnd());

    const bLinesMap = new Map<string, {
        idx: number;
        positions: number[];
    }>();
    for (let lineIdx = 0; lineIdx < bLines.length; lineIdx++) {
        const line = bLines[lineIdx].trim();
        let block = bLinesMap.get(line);
        if (!block) {
            block = { idx: 0, positions: [] };
            bLinesMap.set(line, block)
        }

        block.positions.push(lineIdx);
    }

    // First pass - let's just figure out where the lines appear. 
    // Maps from aLineIdx -> bLineIdx
    const aLinesMapping: number[] = new Array(aLines.length).fill(0);

    for (let i = 0; i < aLines.length; i++) {
        const line = aLines[i].trim();

        const block = bLinesMap.get(line);

        let found = false;
        if (block) {
            if (block.idx < block.positions.length) {
                const pos = block.positions[block.idx];
                block.idx++;
                aLinesMapping[i] = pos;
                found = true;
            }
        }

        if (!found) {
            // This line was removed from a
            aLinesMapping[i] = S_REMOVED;
        }
    }

    // Do a fixup pass to ensure no line starts mapping to positions before
    // what was seen already
    let needsFix = true;
    let iter = 0;
    while (needsFix) {
        let lastMapping = -1;
        let lastMappingIdx = -1;
        iter++;
        console.log("iter", iter);
        // if (iter === 2) {break};

        needsFix = false;
        for (let i = 0; i < aLinesMapping.length; i++) {
            if (aLinesMapping[i] === S_REMOVED) {
                continue;
            }

            if (aLinesMapping[i] <= lastMapping) {
                let handled = false;

                if (lastMappingIdx !== -1) {
                    // Rotate this mapping forward.
                    
                    aLinesMapping[lastMappingIdx] = S_REMOVED;
                    handled = true;

                    const line = aLines[lastMappingIdx].trim();
                    let prevMapping = lastMapping;
                    for (
                        let iCurr = lastMappingIdx + 1;
                        iCurr < aLines.length;
                        iCurr++
                    ) {
                        if (aLines[iCurr].trim() === line) {
                            const temp = aLinesMapping[iCurr];
                            aLinesMapping[iCurr] = prevMapping;
                            console.log(aLines[iCurr], temp, "->", prevMapping);
                            prevMapping = temp;
                        }
                    }
                }

                if (!handled) {
                    aLinesMapping[i] = S_REMOVED;
                }

                needsFix = true;
            }
            lastMapping = aLinesMapping[i];
            lastMappingIdx = i;
        }
    }

    const result: Block[] = [];

    // Debug mode
    /*
    {
        let lastMapping = -1;
        for (let i = 0; i < aLines.length; i++) {
            const remap = aLinesMapping[i];
            if (remap !== S_REMOVED) {
                if (remap < lastMapping) {
                    pushLine(result, NONE, "--------------------------------------");
                }
                lastMapping = remap;
            }
            pushLine(result, NONE, aLines[i] + "->" + remap);
        }

        return result;
    }
    // */

    let aIdx = 0, bIdx = 0;
    while (aIdx < aLines.length) {
        let bIdxNext = aLinesMapping[aIdx];
        while (bIdxNext === S_REMOVED) {
            pushLine(result, REMOVE, aLines[aIdx]);
            aIdx++;
            bIdxNext = aLinesMapping[aIdx]
        }
        if (aIdx >= aLines.length) {
            break;
        }

        while (bIdx < bIdxNext) {
            pushLine(result, INSERT, bLines[bIdx]);
            bIdx++;
        }
        if (bIdx >= bLines.length) {
            break;
        }

        assert(bIdx === bIdxNext)
        if (aLines[aIdx] === bLines[bIdx]) {
            pushLine(result, NONE, aLines[aIdx]);
        } else {
            pushIndentedLine(result, aLines[aIdx], bLines[bIdx]);
        }

        aIdx++;
        bIdx++;
    }
    assert(aIdx === aLines.length);

    while (bIdx < bLines.length) {
        pushLine(result, INSERT, bLines[bIdx]);
        bIdx++;
    }
    assert(bIdx === bLines.length); // NOTE: actually nto sure abt this one

    return result;
}

function pushLine(result: Block[], type: NormalBlock["type"], line: string) {
    let prevBlock: NormalBlock | undefined;
    if (result.length > 0) {
        const lastBlock = result[result.length - 1];
        if (lastBlock.type === type) {
            prevBlock = lastBlock;
        }
    }

    if (!prevBlock) {
        prevBlock = {type: type, lines: [line]};
        result.push(prevBlock);
    } else {
        prevBlock.lines.push(line);
    }
}

function pushIndentedLine(result: Block[], aLine: string, bLine: string) {
    assert(aLine.trim() === bLine.trim());

    let prevBlock: IndentationBlock | undefined;
    if (result.length > 0) {
        const lastBlock = result[result.length - 1];
        if (lastBlock.type === INDENTATION) {
            prevBlock = lastBlock;
        }
    }

    if (!prevBlock) {
        prevBlock = {type: INDENTATION, lines: [], indentation: []};
        result.push(prevBlock);
    } 

    prevBlock.lines.push(bLine);
    prevBlock.indentation.push(bLine.length - aLine.length);
}

function containsLine(linesMap: Map<string, number>, line: string): boolean {
    let count = linesMap.get(line);
    if (count === undefined || count === 0) {
        return false;
    }

    linesMap.set(line, count - 1);
    return true;
}

function pushBlock(result: Block[], type: NormalBlock["type"], lines: string[]) {
    result.push({
        type: type,
        lines: lines,
    });
}

function assert(value: boolean): asserts value {
    if (value === false) {
        throw new Error("Assertion failed");
    }
}

