import { ImCacheRerenderFn, im, ImCache, imdom, el } from "im-js";
import { inverseLerp } from "im-ui/math-utils";
import { imui, BLOCK, CENTER, COL, cssVars, INLINE, NA, NONE, PX, ROW, STRETCH } from "im-ui";
import { VisualTestHarnessState } from "./harness";
import { imButtonIsClicked } from "im-ui/button";

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
        code: formatCode(code ?? test.toString(), code ? 4 : 2),
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
    const testChanged = im.Memo(c, test);
    const codeChanged = im.Memo(c, code);

    let s; s = im.GetInline(c, imVisualTestInstallation); 
    if (!s || testChanged || codeChanged) {
        s = im.Set(c, newVisualTestHarnessInstallationState(test, code));
    }

    harness.installations.push(s);
    s.title = title;

    const scroll = !!(flags & TEST_SCROLLABLE);

    imui.Begin(c, BLOCK); {
        const visibility = imdom.TrackVisibility(c, 1);

        imui.Begin(c, ROW); imui.Align(c); imui.Justify(c); {
            if (im.Memo(c, s.hash)) {
                imdom.setAttr(c, "id", s.hash);
            }

            imdom.ElBegin(c, el.I); imdom.Str(c, title); imdom.ElEnd(c, el.I);
        } imui.End(c);

        if (im.Memo(c, visibility.isVisible) === im.MEMO_CHANGED && visibility.isVisible) {
            if (!harness.currentVisibleInstallation) {
                harness.currentVisibleInstallation = s;
            }
        }

        const root = imui.Begin(c, ROW); imui.Align(c, STRETCH); {
            if (im.IsFirstRender(c)) imdom.setStyle(c, "maxHeight", "80vh");

            const center = !!(flags & TEST_CENTERED);

            const split = im.GetInline(c, imVisualTestInstallation) ?? 
                im.Set(c, { vSplit: 0.5, dragging: false });

            // Test Component
            imui.Begin(c, COL); imui.Flex(c, split.vSplit); imui.ScrollOverflow(c, scroll); {
                imui.Align(c, center ? CENTER : NONE);
                imui.Justify(c, center ? CENTER : NONE);

                imRenderWithErrorBoundary2(c, test);
            } imui.End(c);

            // Middle draggable splitter thing
            imui.Begin(c, BLOCK); imui.Size(c, 10, PX, 0, NA); imui.Bg(c, (imdom.hasMouseOver(c) || split.dragging) ? cssVars.fg : ""); {
                const mouse = imdom.getMouse();
                if (imdom.hasMouseOver(c) && mouse.leftMouseButton) split.dragging = true;
                if (!mouse.leftMouseButton) split.dragging = false;

                if (im.IsFirstRender(c)) imdom.setStyle(c, "transition", "background-color 0.1s ease-in");
                if (im.IsFirstRender(c)) imdom.setStyle(c, "cursor", "ew-resize");
                if (im.IsFirstRender(c)) imdom.setStyle(c, "userSelect", "none");

                if (im.Memo(c, mouse.X) && split.dragging) {
                    const rect = root.getBoundingClientRect();
                    split.vSplit = inverseLerp(mouse.X, rect.left, rect.right);
                }
            } imui.End(c);

            // Code
            imui.Begin(c, BLOCK); imui.PreWrap(c); imui.ScrollOverflow(c); imui.Flex(c, 1 - split.vSplit); {
                if (im.IsFirstRender(c)) imdom.setStyle(c, "fontFamily", "monospace");
                if (im.IsFirstRender(c)) imdom.setStyle(c, "fontSize", "18px");
                if (im.IsFirstRender(c)) imdom.setStyle(c, "tabSize", "4");
                

                const maxLineNumberSize = getMaxLineNumberSize(s.code.length);
                im.For(c); for (let lineIdx = 0; lineIdx < s.code.length; lineIdx++) {
                    const line = s.code[lineIdx];
                    // Line numbers. Exclude them from the user selection
                    imui.Begin(c, INLINE); {
                        if (im.IsFirstRender(c)) imdom.setStyle(c, "userSelect", "none");
                        imdom.Str(c, lineNumberToStr(lineIdx, maxLineNumberSize));
                        imdom.Str(c, " | ");
                    } imui.End(c);

                    imdom.Str(c, line);
                    imdom.ElBegin(c, el.BR); imdom.ElEnd(c, el.BR);
                } im.ForEnd(c);

            } imui.End(c);
        } imui.End(c);
    } imui.End(c);
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


function formatCode(fnSource: string, srcTabSize: number): string[] {
    // Can't be used for tooling, because it does not ignore comments and strings.
    // It's fine to reformat the example snippets to be more like the idiomatic format.
    // TODO: Typescript version? more curated examples?
    const lines = fnSource
        .replace(/im\.Switch\(c\);\s+for/g, "im.Switch(c); switch")
        .replace(/im\.For\(c\);\s+for/g, "im.For(c); for")
        .replace(/im\.Try\(c\);\s+try/g, "im.Try(c); try")
        .replace(/;\s+\{/g, "; {")
        .replace(/\}\s+im([0-9a-zA-Z\.]+)End/g, "} im$1End")
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
        return '    '.repeat(wantedWs / srcTabSize) + line.substring(lineStart);
    })
}

function imRenderWithErrorBoundary2(
    c: ImCache,
    test: (c: ImCache) => void
) {
    im.Switch(c, test); {
        const tryState = im.Try(c); try {
            const { err, recover } = tryState;
            if (im.If(c) && !err) {
                test(c);
            } else {
                im.IfElse(c);

                imui.Begin(c, BLOCK); {
                    imdom.Str(c, "An error occured while rendering your component: ");
                    if (imButtonIsClicked(c, "Try again")) {
                        recover();
                    }
                } imui.End(c);
                imui.Begin(c, BLOCK); {
                    imdom.Str(c, err);
                } imui.End(c);
            } im.IfEnd(c);
        } catch (err) {
            im.Catch(c, tryState, err);
        } im.TryEnd(c, tryState);
    } im.SwitchEnd(c);
}
