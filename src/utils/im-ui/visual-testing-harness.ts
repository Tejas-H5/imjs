import { getDeltaTimeSeconds, ImCache, ImCacheRerenderFn, imFor, imForEnd, imGet, imIf, imIfElse, imIfEnd, imMemo, imSet, imSwitch, imSwitchEnd, isFirstishRender } from "../im-core";
import { elSetStyle, imStr } from "../im-dom";
import { imButtonIsClicked } from "./button";
import { lerp01 } from "./math-utils";
import { BLOCK, COL, cssVars, imAbsolute, imAbsoluteXY, imAlign, imBg, imFg, imFlex, imFlexWrap, imGap, imJustify, imLayoutBegin, imLayoutEnd, imRelative, imSize, NA, PERCENT, PX, ROW } from "./ui-core";

export type VisualTest = {
    name: string;
    code: ImCacheRerenderFn;
};

export function newVisualTest(name: string, fn: ImCacheRerenderFn): VisualTest {
    return { name, code: fn };
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

const numIntros = 2;

function newState(): VisualTestHarnessState {
    return {
        currentTest: undefined,
        seenIntro: false,
        animations: {
            introToUse: Math.floor(Math.random() * numIntros),
            scaleFactor: 0,
            t: 0,
        }
    };
}

function parseUrl(search: string) {
    return new URLSearchParams(search);
}

function setCurrentTest(s: VisualTestHarnessState, test: VisualTest | undefined) {
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

    // The first param is a state parameter. Very intersting.
    console.log("Pushing history: ", params);
    window.history.pushState(null, "", "?" + params.toString());
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
    if (!isTestingIntro) {
        if (!s.currentTest || s.currentTest.name !== currentTestName) {
            const wantedTest = tests.find(test => test.name === currentTestName);
            if (wantedTest) {
                setCurrentTest(s, wantedTest);
            }
        }
    }

    if (s.seenIntro && !s.currentTest && tests.length > 0) {
        setCurrentTest(s, tests[0]);
    }

    if (imIf(c) && s.currentTest) {
        imLayoutBegin(c, COL); imFlex(c); {
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
                            setCurrentTest(s, test);
                        }
                    } imForEnd(c);
                } imLayoutEnd(c);

                imLayoutBegin(c, COL); imFlex(c); imRelative(c); {
                    imSwitch(c, s.currentTest); {
                        s.currentTest.code(c);
                    } imSwitchEnd(c);
                } imLayoutEnd(c);
            } imIfEnd(c);
        } imLayoutEnd(c);
    } else {
        imIfElse(c);
        // Splash screen
        if (imSplashScreen(c, s)) {
            s.seenIntro = true;
        }
    } imIfEnd(c);

}

function imSplashScreen(c: ImCache, s: VisualTestHarnessState): boolean {
    const width = window.innerWidth;
    const height = window.innerHeight;

    const a = s.animations;
    let animationComplete = false;
    imSwitch(c, a.introToUse); switch(a.introToUse) {
        case 0: {
            const target = 0.2;
            a.scaleFactor = lerp01(a.scaleFactor, target, 5 * getDeltaTimeSeconds(c));
            animationComplete = Math.abs(a.scaleFactor - target) < 0.0001;

            imLayoutBegin(c, BLOCK); imAbsolute(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                if (isFirstishRender(c)) elSetStyle(c, "overflow", "hidden");


                imLayoutBegin(c, BLOCK); imAbsoluteXY(c, 0, PX, 0, PX); {
                    imAbsoluteXY(c, width * a.scaleFactor, PX, height * a.scaleFactor, PX);
                    if (imMemo(c, height)) elSetStyle(c, "fontSize", (0.4 * height) + "px")

                    imStr(c, "IM");
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

                imLayoutBegin(c, BLOCK); imAbsoluteXY(c, 0, PX, 0, PX); {
                    imAbsoluteXY(c, width * 0.5, PX, height * (1 - a.scaleFactor * 0.5), PX);
                    if (imMemo(c, height)) elSetStyle(c, "fontSize", (0.1 * height) + "px")

                    if (isFirstishRender(c)) elSetStyle(c, "transform", `translate(-50%, -100%)`);

                    imStr(c, "Visual testing harness");
                } imLayoutEnd(c);

            } imLayoutEnd(c);
        } break;
        case 1: {
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

                    const count     = Math.min(tCol * MAX_COUNT, MAX_COUNT + 10) / 2;
                    const colWidth  = width / numCols;
                    const colHeight = height / MAX_COUNT;

                    imLayoutBegin(c, COL); imRelative(c); imFlex(c); imGap(c, 2, PX); {
                        let y = -colHeight * 4;
                        imFor(c); for (let i = 0; i < count; i++) {
                            const isOddColumn = colIdx % 2 === 0;
                            const yOffset = isOddColumn ? y : (-colHeight + height - y);

                            imLayoutBegin(c, ROW); imBg(c, cssVars.fg); imAlign(c); imJustify(c); 
                            imFg(c, cssVars.bg); {
                                if (isFirstishRender(c)) {
                                    elSetStyle(c, "transform", `rotateZ(${isOddColumn ? "" : "-"}45deg)`);
                                }

                                imSize(c, colWidth, PX, colHeight, PX); 
                                imAbsoluteXY(c, 0, PX, yOffset, PX);

                                if (i % 4 === 0) {
                                    imStr(c, "Rendered");
                                }
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
                const tPhase = Math.floor((tText / textDuration) / tBlinkLength) % 2;
                const bg = tPhase === 0 ? cssVars.fg : cssVars.bg;
                const fg = tPhase === 0 ? cssVars.bg : cssVars.fg;

                imLayoutBegin(c, ROW); imAbsolute(c, 0, PX, 0, PX, 0, PX, 0, PX); imAlign(c); imJustify(c); {
                    imLayoutBegin(c, COL); imAlign(c); {
                        imBg(c, bg); imFg(c, fg);

                        if (imMemo(c, fg)) elSetStyle(c, "border", `${height * 0.05}px solid ${fg}`);
                        if (imMemo(c, height)) elSetStyle(c, "fontSize", (height / 6) + "px");
                        if (imMemo(c, height)) elSetStyle(c, "fontWeight", "bold");
                        imStr(c, "IM/JS");

                        imLayoutBegin(c, COL); imAlign(c); {
                            imStr(c, "Visual testing harness");
                            if (imMemo(c, height)) elSetStyle(c, "fontSize", (height / 12) + "px");
                        } imLayoutEnd(c);
                    } imLayoutEnd(c);
                } imLayoutEnd(c);
            } imIfEnd(c);
        } break;
    } imSwitchEnd(c);


    return animationComplete;
}
