import { el, im, ImCache, imdom } from "im-js";
import { BLOCK, cssVars, imui, INLINE, NA, PX, VH } from "im-js/im-ui";
import * as ld from "line-diff";

type CodeBlockState = {
    codeLines: string[];
    diff: ld.Block[] | undefined;
};

// A code viewer I've made for my static websites.
// It is designed to be very minimal, while also supporting diffs,
// as diffs are very high-signal and explanatory (unlike code highlighting)
export function imCodeViewer(
    c: ImCache,
    code: string,
    codeToDiffWith: string | undefined,
    codeVersion: number,
) {
	const s = im.Get(c, imCodeViewer) ??
		im.Set<CodeBlockState>(c, {
			codeLines: [],
			diff: undefined,
		} );

	if (im.Memo(c, codeVersion)) {
		s.codeLines = code.split("\n");

		s.diff = undefined;
		if (codeToDiffWith !== undefined) {
			const otherCodeLines = codeToDiffWith.split("\n");
			s.diff = ld.computeLines(otherCodeLines, s.codeLines);
		}
	}
	
	let numLines = s.codeLines.length;
	const maxLineNumberSize = getMaxLineNumberSize(numLines);

	imui.Begin(c, BLOCK); imCodeStyle(c); {
		if (im.If(c) && s.diff) {
			let lineIdx = 0;
			im.For(c); for (let blockIdx = 0; blockIdx < s.diff.length; blockIdx++) {
				const block = s.diff[blockIdx];
				lineIdx = imDiffBlock(c, block, lineIdx, maxLineNumberSize);
			} im.ForEnd(c);
		} else {
			im.Else(c);

			// Regular code view

			im.For(c); for (let lineIdx = 0; lineIdx < s.codeLines.length; lineIdx++) {
				const line = s.codeLines[lineIdx];

				imLineNumber(c, lineIdx, maxLineNumberSize);
				imdom.Str(c, line);
				imdom.ElBegin(c, el.BR); imdom.ElEnd(c, el.BR);
			} im.ForEnd(c);
		} im.IfEnd(c);
	} imui.End(c);
}

function imCodeStyle(c: ImCache) {
    imui.PreWrap(c); 
    if (im.IsFirstRender(c)) imdom.setStyle(c, "fontFamily", "monospace");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "tabSize", "4");
    imui.Fg(c, cssVars.fg2);
    imui.Bg(c, cssVars.bg2);
}

function imLineNumber(c: ImCache, lineIdx: number, maxLineNumberSize: number) {
    imui.Begin(c, INLINE); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "userSelect", "none");
        imdom.Str(c, " ");
        imdom.Str(c, lineNumberToStr(lineIdx, maxLineNumberSize));
        imdom.Str(c, " | ");
    } imui.End(c);
}

function imDiffBlock(c: ImCache, block: ld.Block, lineIdx: number, maxLineNumberSize: number): number {
    lineIdx = imDiffBlockInner(c, block, lineIdx, maxLineNumberSize);

    return lineIdx;
}


function imDiffBlockInner(c: ImCache, block: ld.Block, lineIdx: number, maxLineNumberSize: number): number {
    im.For(c); for (let blockLineIdx = 0; blockLineIdx < block.lines.length; blockLineIdx++) {
        const line = block.lines[blockLineIdx];
        switch (block.type) {
            case ld.NONE: lineIdx++; break;
            case ld.INSERT: lineIdx++; break;
            case ld.INDENTATION: lineIdx++; break;
            case ld.REMOVE: break;
        }

        imui.Begin(c, BLOCK); {
            const addCharBg = "#44FF77"
            const rmCharBg = "#FF9999";
            const indentBg = "#BBBBBB";

            let currentBg = "";
            switch (block.type) {
                case ld.NONE: currentBg       = ""; break;
                case ld.INSERT: currentBg     = addCharBg; break;
                case ld.REMOVE: currentBg     = rmCharBg; break;
                case ld.INDENTATION: currentBg = indentBg; break;
            }
            imui.Bg(c, currentBg);

            imui.Begin(c, INLINE); {
                if (im.IsFirstRender(c)) {
                    imdom.setStyle(c, "userSelect", "none");
                }

                let sign = "   ";
                switch (block.type) {
                    case ld.INSERT: sign = " + "; break;
                    case ld.REMOVE: sign = " - "; break;
                    case ld.INDENTATION: {
                        const indentation = block.indentation[blockLineIdx];
                        sign = indentation > 0 ? "-> " : " <-";
                    } break;
                }
                imdom.Str(c, sign);
            } imui.End(c);

            imLineNumber(c, lineIdx, maxLineNumberSize);

            imui.Begin(c, INLINE); {
                if (im.Memo(c, block.type)) {
                    // It's important that we can copy code from the examples.
                    // When removals are interlaced with inserts and normal blocks,
                    // we only want to select the 'current' code, and that will just be
                    // non-removals
                    const canSelect = block.type !== ld.REMOVE;
                    imdom.setStyle(c, "userSelect", canSelect ? "" : "none");
                }

                imdom.Str(c, line);
            } imui.End(c);
        } imui.End(c);
    } im.ForEnd(c);

    return lineIdx;
}

function getMaxLineNumberSize(numLines: number) {
    return Math.ceil(Math.log10(numLines));
}

function lineNumberToStr(num: number, maxLineNumberSize: number) {
    num += 1;
    if (isNaN(num)) {
        return "" + num;
    }
    const lineWidth = Math.ceil(Math.log10(num + 1));
    let str = "" + num;

    for (let i = lineWidth; i < maxLineNumberSize; i++) {
        str = "0" + str;
    }
    return str;
};
