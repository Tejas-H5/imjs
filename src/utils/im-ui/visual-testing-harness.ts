import { getDeltaTimeSeconds, ImCache, ImCacheRerenderFn, imCatch, imFor, imForEnd, imGet, imGetInline, imIf, imIfElse, imIfEnd, imMemo, imSet, imSwitch, imSwitchEnd, imTry, imTryEnd, isFirstishRender } from "../im-core";
import { elSetStyle, imStr } from "../im-dom";
import { imButtonIsClicked } from "./button";
import { lerp01 } from "./math-utils";
import { BLOCK, COL, cssVars, imAbsolute, imAbsoluteXY, imAlign, imBg, imFg, imFlex, imFlexWrap, imGap, imJustify, imLayoutBegin, imLayoutEnd, imOpacity, imPreWrap, imRelative, imScrollOverflow, imSize, PERCENT, PX, ROW } from "./ui-core";

export type VisualTest = {
    name: string;
    code: ImCacheRerenderFn;
};

export function newVisualTest(
    name: string,
    code: ImCacheRerenderFn
): VisualTest {
    return { name, code };
}

type VisualTestHarnessState = {
    currentTest: VisualTest | undefined;
    seenIntro: boolean;
    animations: {
        introToUse: number;
        scaleFactor: number;
        t: number;
    }
}

const numIntros = 3;

function newState(): VisualTestHarnessState {
    return {
        currentTest: undefined,
        seenIntro: false,
        animations: {
            introToUse: Math.floor(Math.random() * numIntros),
            scaleFactor: 0,
            t: 0,
        },
    };
}

function parseUrl(search: string) {
    return new URLSearchParams(search);
}

function setCurrentTest(s: VisualTestHarnessState, test: VisualTest | undefined, pushHistory: boolean) {
    if (s.currentTest === test) {
        return;
    }

    s.currentTest = test;
    const params = new URLSearchParams(window.location.search);
    if (!test) {
        params.delete("test");
    } else {
        params.set("test", test.name);
    }

    if (pushHistory) {
        // The first param is a state parameter. Very intersting.
        console.log("Pushing history: ", params);
        window.history.pushState(null, "", "?" + params.toString());
    }
}

// Similar to storybook or the visual testing harness from Osu!framework.
// Allows you to develop and preview UI components in isolation.

export function imVisualTestHarness(
    c: ImCache,
    tests: VisualTest[],
) {
    const windowLocationSearch = window.location.search;
    const windowLocationSearchChanged = imMemo(c, windowLocationSearch);

    let queryParams = imGet(c, parseUrl);
    if (!queryParams || windowLocationSearchChanged) {
        queryParams = imSet(c, parseUrl(windowLocationSearch));
    }

    const testsChanged = imMemo(c, tests);
    let s = imGet(c, newState);
    if (!s || testsChanged) {
        s = imSet(c, newState());
    }

    const currentTestName = queryParams.get("test");
    const isTestingIntro = queryParams.has("intro");

    if ((!isTestingIntro || s.seenIntro) && (
        !s.currentTest || s.currentTest.name !== currentTestName
    )) {
        const wantedTest = tests.find(test => test.name === currentTestName);
        if (wantedTest) {
            setCurrentTest(s, wantedTest, false);
        }
    }

    if (s.seenIntro && !s.currentTest && tests.length > 0) {
        setCurrentTest(s, tests[0], true);
    }

    imLayoutBegin(c, COL); imFlex(c); {
        if (imIf(c) && s.currentTest) {
            if (imIf(c) && tests.length === 0) {
                // Div has been successfuly cented. Lets go 
                imLayoutBegin(c, ROW); imFlex(c); imAlign(c); imJustify(c); {
                    imStr(c, "No tests yet");
                } imLayoutEnd(c);
            } else {
                imIfElse(c);

                imLayoutBegin(c, ROW); imAlign(c); imFlexWrap(c); imGap(c, 10, PX); {
                    imFor(c); for (const test of tests) {
                        if (imButtonIsClicked(c, test.name, s.currentTest === test)) {
                            setCurrentTest(s, test, true);
                        }
                    } imForEnd(c);
                } imLayoutEnd(c);

                imLayoutBegin(c, COL); imFlex(c); imRelative(c); imScrollOverflow(c); {
                    imRenderWithErrorBoundary(c, s.currentTest.code);
                } imLayoutEnd(c);
            } imIfEnd(c);
        } else {
            imIfElse(c);
            // Splash screen
            if (imSplashScreen(c, s)) {
                s.seenIntro = true;
            }
        } imIfEnd(c);
    } imLayoutEnd(c);

}

function imSplashScreen(c: ImCache, s: VisualTestHarnessState): boolean {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const a = s.animations;
    let animationComplete = false;
    imSwitch(c, a.introToUse); switch(a.introToUse) {
        case 0: { // Not sure what this is. im / JS. I have since scrapped the line
            const target = 0.2;
            a.scaleFactor = lerp01(a.scaleFactor, target, 5 * getDeltaTimeSeconds(c));
            animationComplete = Math.abs(a.scaleFactor - target) < 0.0001;

            imLayoutBegin(c, BLOCK); imAbsolute(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                if (isFirstishRender(c)) elSetStyle(c, "overflow", "hidden");

                imLayoutBegin(c, BLOCK); {
                    imAbsoluteXY(c, width * a.scaleFactor, PX, height * a.scaleFactor, PX);
                    if (imMemo(c, height)) elSetStyle(c, "fontSize", (0.4 * height) + "px")

                    imStr(c, "im");
                } imLayoutEnd(c);

                imLayoutBegin(c, BLOCK); imBg(c, cssVars.fg); {
                    elSetStyle(c, "transform", `translate(-50%, -50%) rotateZ(-${(70 - 45 * a.scaleFactor)}deg)`);

                    imSize(c, 100 * a.scaleFactor, PERCENT, 5 * a.scaleFactor, PERCENT);
                    imAbsoluteXY(c, width / 2, PX, height / 2, PX);
                } imLayoutEnd(c);

                imLayoutBegin(c, BLOCK); {
                    imAbsoluteXY(c, width * (1 - a.scaleFactor), PX, height * (1 - a.scaleFactor), PX);
                    if (imMemo(c, height)) elSetStyle(c, "fontSize", (0.4 * height) + "px")

                    if (isFirstishRender(c)) elSetStyle(c, "transform", `translate(-100%, -100%)`);

                    imStr(c, "JS");
                } imLayoutEnd(c);

                imLayoutBegin(c, BLOCK); {
                    imAbsoluteXY(c, width * 0.5, PX, height * (1 - a.scaleFactor * 0.5), PX);
                    if (imMemo(c, height)) elSetStyle(c, "fontSize", (0.1 * height) + "px")

                    if (isFirstishRender(c)) elSetStyle(c, "transform", `translate(-50%, -100%)`);

                    imStr(c, "Visual testing harness");
                } imLayoutEnd(c);

            } imLayoutEnd(c);
        } break;
        case 1: { // Some visual that stuck in my head after watching Billain third impact AMV
            a.t += getDeltaTimeSeconds(c);
            const duration = 1;
            const rowsDuration = duration * 1.5;
            const textDuration = duration * 1;

            if (a.t > (rowsDuration + textDuration)) {
                animationComplete = true;
            }

            const numCols = 4;
            let start = 0;
            imLayoutBegin(c, ROW); imAbsolute(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                imFor(c); for (let colIdx = 0; colIdx < numCols; colIdx++) {
                    const colDuration = rowsDuration / numCols;

                    let start = colIdx * colDuration;
                    const tCol = (a.t - start) / colDuration;

                    const MAX_COUNT = 30;

                    const renderUpTo = tCol * MAX_COUNT;
                    const colWidth  = width / numCols;
                    const colHeight = height / MAX_COUNT;

                    imLayoutBegin(c, COL); imRelative(c); imFlex(c); imGap(c, 2, PX); {
                        let y = -colHeight * 4;
                        imFor(c); for (let i = 0; i < MAX_COUNT + 10; i++) {
                            const isOddColumn = colIdx % 2 === 0;
                            const yOffset = isOddColumn ? y : (-colHeight + height - y);

                            const t = renderUpTo - i;
                            const rendered = t > 1.0;

                            const fg = rendered ? cssVars.bg : cssVars.fg;
                            const bg = rendered ? cssVars.fg : cssVars.bg;

                            const text = rendered ? "Rendered" : "Rendering";

                            imLayoutBegin(c, ROW); imBg(c, bg); imFg(c, fg); imAlign(c); imJustify(c); {
                                if (isFirstishRender(c)) {
                                    elSetStyle(c, "transform", `rotateZ(${isOddColumn ? "" : "-"}45deg)`);
                                }

                                imSize(c, colWidth, PX, colHeight, PX); 
                                imAbsoluteXY(c, 0, PX, yOffset, PX);

                                // lookahead
                                const la = 5;

                                imLayoutBegin(c, BLOCK); {
                                    imOpacity(c, t + la);
                                    imStr(c, text);
                                } imLayoutEnd(c);
                            } imLayoutEnd(c);

                            y += colHeight * 2;
                        } imForEnd(c);
                    } imLayoutEnd(c);
                } imForEnd(c);
            } imLayoutEnd(c);

            start += rowsDuration;

            const tText = a.t - start;
            if (imIf(c) && tText > 0) {
                const tBlinkLength = 0.3;
                const tPhase = 0; //Math.floor((tText / textDuration) / tBlinkLength) % 2;
                const bg = tPhase === 0 ? cssVars.fg : cssVars.bg;
                const fg = tPhase === 0 ? cssVars.bg : cssVars.fg;

                imLayoutBegin(c, ROW); imAbsolute(c, 0, PX, 0, PX, 0, PX, 0, PX); imAlign(c); imJustify(c); {
                    imLayoutBegin(c, COL); imAlign(c); {
                        imBg(c, bg); imFg(c, fg);

                        if (imMemo(c, fg)) elSetStyle(c, "border", `${height * 0.05}px solid ${fg}`);
                        if (imMemo(c, height)) elSetStyle(c, "fontSize", (height / 6) + "px");
                        if (imMemo(c, height)) elSetStyle(c, "fontWeight", "bold");
                        imStr(c, "imJS");

                        imLayoutBegin(c, COL); imAlign(c); {
                            imStr(c, "Visual testing harness");
                            if (imMemo(c, height)) elSetStyle(c, "fontSize", (height / 12) + "px");
                        } imLayoutEnd(c);
                    } imLayoutEnd(c);
                } imLayoutEnd(c);
            } imIfEnd(c);
        } break;
        case 2: { // Which way it rotating tho?
            a.t += getDeltaTimeSeconds(c) * 0.5;

            let angle = a.t * Math.PI * 2 - Math.PI / 2;
            // if (a.t > 1) {
            //     angle -= Math.PI * 2;
            // }
            

            if (a.t > 1) {
                animationComplete = true;
            }

            imLayoutBegin(c, BLOCK); imAbsoluteXY(c, width / 2, PX, height / 2, PX); {
                const flip = angle < Math.PI / 2;

                elSetStyle(c, "transform", `translate(-50%, -50%) rotateY(${angle}rad) scaleX(${flip ? "1" : "-1"})`);
                if (imMemo(c, height)) elSetStyle(c, "fontSize", (0.4 * height) + "px")

                imStr(c, flip ? "im" : "JS");
            } imLayoutEnd(c);

            imLayoutBegin(c, BLOCK); {
                imAbsoluteXY(c, width * 0.5, PX, height * 0.8, PX);
                if (imMemo(c, height)) elSetStyle(c, "fontSize", (0.1 * height) + "px")
                if (isFirstishRender(c)) elSetStyle(c, "transform", `translate(-50%, -100%)`);

                imStr(c, "Visual testing harness");
            } imLayoutEnd(c);
        } break;
        // We need more of these. I want 90% lok of this harness to just be various intro screens.
        // That being said. Maybe this is the mindset that is preventing me from shipping things...
    } imSwitchEnd(c);


    return animationComplete;
}

// TODO: remove, in favour of manually setting the code, and setting which things we need to focus on.
function formatCode(fnSource: string): string {
    // Can't be used for tooling, because it does not ignore comments and strings.
    // It's fine to reformat the example snippets to be more like the idiomatic format.
    // TODO: Typescript version? more curated examples?
    const lines = fnSource
        .replace(/imSwitch\(c\);\s+for/g, "imSwitch(c); switch")
        .replace(/imFor\(c\);\s+for/g, "imFor(c); for")
        .replace(/imTry\(c\);\s+try/g, "imTry(c); try")
        .replace(/;\s+\{/g, "; {")
        .replace(/\}\s+im([0-9a-zA-Z]+)End/g, "} im$1End")
        .split("\n")

    const maxLineNumberSize = Math.ceil(Math.log10(lines.length));

    const lineNumberToStr = (num: number) => {
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

    fnSource = lines.map((line, lineNumber) => {
        const lineStart = countLeadingWhitespace(line);
        const wantedWs = Math.max(0, lineStart - minWhitespaceLen);

        const BUILD_TAB_SIZE = 2;
        return " " + lineNumberToStr(lineNumber) + 
               " | " + 
               '    '.repeat(wantedWs / BUILD_TAB_SIZE) + line.substring(lineStart);
    })
    .join("\n");

    return fnSource;
}


function imRenderWithErrorBoundary(c: ImCache, test: ImCacheRerenderFn) {
    imSwitch(c, test); {
        const tryState = imTry(c); try {
            const { err, recover } = tryState;
            if (imIf(c) && !err) {
                test(c);
            } else {
                imIfElse(c);

                imLayoutBegin(c, BLOCK); {
                    imStr(c, "An error occured while rendering your component: ");
                    if (imButtonIsClicked(c, "Try again")) {
                        recover();
                    }
                } imLayoutEnd(c);
                imLayoutBegin(c, BLOCK); {
                    imStr(c, err);
                } imLayoutEnd(c);
            } imIfEnd(c);
        } catch (err) {
            imCatch(c, tryState, err);
        } imTryEnd(c, tryState);
    } imSwitchEnd(c);
}

export function imVisualTestInstallation(c: ImCache, test: ImCacheRerenderFn, code?: string) {
    const testChanged = imMemo(c, test);
    const codeChanged = imMemo(c, code);

    let s; s = imGetInline(c, imVisualTestInstallation); 
    if (!s || testChanged || codeChanged) {
        s = imSet(c, {
            code: formatCode(code ?? test.toString())
        });
    }

    imLayoutBegin(c, ROW); {
        imLayoutBegin(c, BLOCK); imFlex(c); {
            imRenderWithErrorBoundary(c, test);
        } imLayoutEnd(c);

        imLayoutBegin(c, BLOCK); imFlex(c); {
            imLayoutBegin(c, COL); imFlex(c); imPreWrap(c); imScrollOverflow(c); {
                if (isFirstishRender(c)) elSetStyle(c, "fontFamily", "monospace");
                if (isFirstishRender(c)) elSetStyle(c, "fontSize", "22px");
                if (isFirstishRender(c)) elSetStyle(c, "tabSize", "4");

                imStr(c, s.code);
            } imLayoutEnd(c);
        } imLayoutEnd(c);
    } imLayoutEnd(c);
}
