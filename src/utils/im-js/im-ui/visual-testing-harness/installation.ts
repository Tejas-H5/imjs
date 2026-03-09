import { ImCache, ImCacheRerenderFn, imFor, imForEnd, imGetInline, imMemo, imSet, isFirstishRender } from "../../im-core";
import { EL_BR, EL_I, elHasMouseOver, elSetAttr, elSetStyle, getGlobalEventSystem, imElBegin, imElEnd, imStr, imTrackVisibility } from "../../im-dom";
import { inverseLerp } from "../math-utils";
import { BLOCK, CENTER, COL, cssVars, imAlign, imBg, imFlex, imJustify, imLayoutBegin, imLayoutEnd, imPreWrap, imScrollOverflow, imSize, INLINE, NA, NONE, PX, ROW, STRETCH } from "../ui-core";
import { imRenderWithErrorBoundary, VisualTestHarnessState } from "./harness";


export const TEST_CENTERED = (1 << 0);
export const TEST_SCROLLABLE = (2 << 0);

export type VisualTestHarnessInstallationState = {
    test: ImCacheRerenderFn;
    code: string[];
    hash: string;
    title: string;
};

function newVisualTestHarnessInstallationState(test: ImCacheRerenderFn, code?: string): VisualTestHarnessInstallationState {
    return {
        test: test,
        code: formatCode(code ?? test.toString()),
        hash: test.name,
        title: "",
    };
}

export function imVisualTestInstallation(
    c: ImCache,
    title: string,
    harness: VisualTestHarnessState,
    test: ImCacheRerenderFn,
    flags = 0,
    code?: string,
) {
    const testChanged = imMemo(c, test);
    const codeChanged = imMemo(c, code);

    let s; s = imGetInline(c, imVisualTestInstallation); 
    if (!s || testChanged || codeChanged) {
        s = imSet(c, newVisualTestHarnessInstallationState(test, code));
    }

    harness.installations.push(s);
    s.title = title;

    const scroll = !!(flags & TEST_SCROLLABLE);

    imLayoutBegin(c, BLOCK); {
        const visibility = imTrackVisibility(c, 1);

        imLayoutBegin(c, ROW); imAlign(c); imJustify(c); {
            if (imMemo(c, s.hash)) {
                elSetAttr(c, "id", s.hash);
            }

            imElBegin(c, EL_I); imStr(c, title); imElEnd(c, EL_I);
        } imLayoutEnd(c);

        if (visibility.isVisible && !harness.currentVisibleInstallation) {
            harness.currentVisibleInstallation = s;
        }

        const root = imLayoutBegin(c, ROW); imAlign(c, STRETCH); {
            if (isFirstishRender(c)) elSetStyle(c, "maxHeight", "80vh");

            const center = !!(flags & TEST_CENTERED);

            const split = imGetInline(c, imVisualTestInstallation) ?? 
                imSet(c, { vSplit: 0.5, dragging: false });

            // Test Component
            imLayoutBegin(c, COL); imFlex(c, split.vSplit); imScrollOverflow(c, scroll); {
                imAlign(c, center ? CENTER : NONE);
                imJustify(c, center ? CENTER : NONE);

                imRenderWithErrorBoundary(c, harness, test);
            } imLayoutEnd(c);

            // Middle draggable splitter thing
            imLayoutBegin(c, BLOCK); imSize(c, 10, PX, 0, NA); imBg(c, (elHasMouseOver(c) || split.dragging) ? cssVars.fg : ""); {
                const mouse = getGlobalEventSystem().mouse;
                if (elHasMouseOver(c) && mouse.leftMouseButton) split.dragging = true;
                if (!mouse.leftMouseButton) split.dragging = false;

                if (isFirstishRender(c)) elSetStyle(c, "transition", "background-color 0.1s ease-in");
                if (isFirstishRender(c)) elSetStyle(c, "cursor", "ew-resize");
                if (isFirstishRender(c)) elSetStyle(c, "userSelect", "none");

                if (imMemo(c, mouse.X) && split.dragging) {
                    const rect = root.getBoundingClientRect();
                    split.vSplit = inverseLerp(mouse.X, rect.left, rect.right);
                }
            } imLayoutEnd(c);

            // Code
            imLayoutBegin(c, BLOCK); imPreWrap(c); imScrollOverflow(c); imFlex(c, 1 - split.vSplit); {
                if (isFirstishRender(c)) elSetStyle(c, "fontFamily", "monospace");
                if (isFirstishRender(c)) elSetStyle(c, "fontSize", "18px");
                if (isFirstishRender(c)) elSetStyle(c, "tabSize", "4");
                

                const maxLineNumberSize = getMaxLineNumberSize(s.code.length);
                imFor(c); for (let lineIdx = 0; lineIdx < s.code.length; lineIdx++) {
                    const line = s.code[lineIdx];
                    // Line numbers. Exclude them from the user selection
                    imLayoutBegin(c, INLINE); {
                        if (isFirstishRender(c)) elSetStyle(c, "userSelect", "none");
                        imStr(c, lineNumberToStr(lineIdx, maxLineNumberSize));
                        imStr(c, " | ");
                    } imLayoutEnd(c);

                    imStr(c, line);
                    imElBegin(c, EL_BR); imElEnd(c, EL_BR);
                } imForEnd(c);

            } imLayoutEnd(c);
        } imLayoutEnd(c);
    } imLayoutEnd(c);
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


function formatCode(fnSource: string): string[] {
    // Can't be used for tooling, because it does not ignore comments and strings.
    // It's fine to reformat the example snippets to be more like the idiomatic format.
    // TODO: Typescript version? more curated examples?
    const lines = fnSource
        .replace(/imSwitch\(c\);\s+for/g, "imSwitch(c); switch")
        .replace(/imFor\(c\);\s+for/g, "imFor(c); for")
        .replace(/imTry\(c\);\s+try/g, "imTry(c); try")
        .replace(/;\s+\{/g, "; {")
        .replace(/\}\s+im([0-9a-zA-Z]+)End/g, "} im$1End")
        // .replace(/( )?\/\* @__PURE__ \*\/( )?/g, "") // Whitespace is always off by one. I will just keep this in
        .split("\n")


    const countLeadingWhitespace = (line: string): number => {
        let i = 0;
        while (i < line.length && line[i] === ' ') {
            i++
        }
        return i;
    }

    let minWhitespaceLen = 0;
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const wsLen = countLeadingWhitespace(line);
        if (i === 1) {
            minWhitespaceLen = wsLen;
        } else {
            minWhitespaceLen = Math.min(minWhitespaceLen, wsLen);
        }
    }

    return lines.map((line, lineNumber) => {
        const lineStart = countLeadingWhitespace(line);
        const wantedWs = Math.max(0, lineStart - minWhitespaceLen);

        const BUILD_TAB_SIZE = 2;
        return '    '.repeat(wantedWs / BUILD_TAB_SIZE) + line.substring(lineStart);
    })
}

