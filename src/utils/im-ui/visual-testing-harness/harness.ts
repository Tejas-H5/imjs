import { getDeltaTimeSeconds, ImCache, imCatch, imFor, imForEnd, imGet, imIf, imIfElse, imIfEnd, imMemo, imSet, imSwitch, imSwitchEnd, imTry, imTryEnd, isFirstishRender } from "../../im-core";
import { elHasMouseOver, elSetStyle, getGlobalEventSystem, imStr } from "../../im-dom";
import { imButtonIsClicked } from "../button";
import { lerp01 } from "../math-utils";
import { BLOCK, COL, END, imAbsolute, imAlign, imFlex, imFlexWrap, imGap, imJustify, imLayoutBegin, imLayoutEnd, imNoWrap, imRelative, imScrollOverflow, INLINE, NA, PX, ROW } from "../ui-core";
import { VisualTestHarnessInstallationState } from "./installation";
import { imSplashScreen } from "./splash-screen";

export type VisualTest = {
    name: string;
    code: (c: ImCache, harness: VisualTestHarnessState) => void;
};

export function newVisualTest(
    name: string,
    code: (c: ImCache, harness: VisualTestHarnessState) => void,
): VisualTest {
    return { name, code };
}

export type VisualTestHarnessState = {
    currentTest: VisualTest | undefined;
    currentInstallation: VisualTestHarnessInstallationState | undefined;
    currentVisibleInstallation: VisualTestHarnessInstallationState | undefined;
    seenIntro: boolean;
    animations: {
        introToUse: number;
        scaleFactor: number;
        t: number;
        topBarOpen: number;
        sideBarOpenEm: number;
        sideBarOpen: boolean;
    },
    installations: VisualTestHarnessInstallationState[];
    installationIdx: number;
}

const numIntros = 3;

function newState(): VisualTestHarnessState {
    return {
        currentTest: undefined,
        currentInstallation: undefined,
        currentVisibleInstallation: undefined,
        seenIntro: false,
        animations: {
            introToUse: Math.floor(Math.random() * numIntros),
            scaleFactor: 0,
            t: 0,
            topBarOpen: 0,
            sideBarOpenEm: 0,
            sideBarOpen: false,
        },
        installations: [],
        installationIdx: 0,
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
        console.log("pushing state");
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

    s.installationIdx = 0;
    s.currentVisibleInstallation = undefined;

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

    let scrollView;
    let scrolledToTop = false;

    imLayoutBegin(c, COL); imFlex(c); {
        if (imIf(c) && s.currentTest) {
            if (imIf(c) && tests.length === 0) {
                imLayoutBegin(c, ROW); imFlex(c); imAlign(c); imJustify(c); {
                    imStr(c, "No tests yet");
                } imLayoutEnd(c);
            } else {
                imIfElse(c);

                // Top bar
                imLayoutBegin(c, ROW); imAlign(c); imFlexWrap(c); imGap(c, 10, PX); {
                    if (isFirstishRender(c)) elSetStyle(c, "overflow", "clip");
                    if (imMemo(c, s.animations.topBarOpen)) elSetStyle(c, "fontSize", s.animations.topBarOpen + "em");

                    imLayoutBegin(c, ROW); {

                        imFor(c); for (const test of tests) {
                            if (imButtonIsClicked(c, test.name, s.currentTest === test)) {
                                setCurrentTest(s, test, true);
                            }
                        } imForEnd(c);
                    } imLayoutEnd(c);
                } imLayoutEnd(c);

                // Main view
                scrollView = imLayoutBegin(c, COL); imFlex(c); imRelative(c); imScrollOverflow(c); {
                    if (isFirstishRender(c)) {
                        // makes way for the sidebar. Not ideal code but eh
                        elSetStyle(c, "paddingRight", "2em");
                    }

                    imRenderWithErrorBoundary(c, s, s.currentTest.code);
                } imLayoutEnd(c);

                scrolledToTop = scrollView.scrollTop < 20;

                const mouse = getGlobalEventSystem().mouse;

                // Animate the top bar
                {
                    let target = 0;
                    if (scrolledToTop) {
                        target = 1;
                    } else {
                        if (mouse.Y < 0.05 * window.innerHeight) {
                            target = 1;
                        }
                    }
                    s.animations.topBarOpen = lerp01(s.animations.topBarOpen, target, 10 * getDeltaTimeSeconds(c));
                }

                // Sidebar
                imLayoutBegin(c, COL); imAbsolute(c, 0, PX, 0, PX, 0, PX, 0, NA); imJustify(c); imScrollOverflow(c); {
                    if (imMemo(c, s.animations.sideBarOpenEm)) elSetStyle(c, "fontSize", s.animations.sideBarOpenEm + "em");

                    let isHoveringSidebar = false;
                    imFor(c); for (const installation of s.installations) {
                        imLayoutBegin(c, ROW); imJustify(c, END); {
                            imLayoutBegin(c, ROW); imAlign(c); imGap(c, 10, PX);  {
                                const hasMouseOver = elHasMouseOver(c);
                                if (hasMouseOver) {
                                    isHoveringSidebar = true;
                                    scrollToInstalllation(s, installation);
                                }

                                if (imIf(c) && hasMouseOver && s.currentInstallation !== installation) {
                                    imStr(c, " -> ");
                                } imIfEnd(c);

                                if (imButtonIsClicked(c, installation.title, installation === s.currentInstallation)) {
                                    scrollToInstalllation(s, installation);
                                    updateHash(s, installation);
                                    s.animations.sideBarOpen = false;
                                }
                            } imLayoutEnd(c);
                        } imLayoutEnd(c);
                    } imForEnd(c);

                    if (imMemo(c, isHoveringSidebar) && !isHoveringSidebar && s.currentInstallation) {
                        scrollToInstalllation(s, s.currentInstallation);
                    }

                    // animate sidebar
                    {
                        const threshold = s.animations.sideBarOpen ? 0.7 : 0.95;
                        if (mouse.X < threshold * window.innerWidth) {
                            s.animations.sideBarOpen = false;
                        } else {
                            s.animations.sideBarOpen = true;
                        }

                        const target = s.animations.sideBarOpen ? 1 : 0;
                        s.animations.sideBarOpenEm = lerp01(s.animations.sideBarOpenEm, target, 10 * getDeltaTimeSeconds(c));
                    }
                } imLayoutEnd(c);
            } imIfEnd(c);
        } else {
            imIfElse(c);
            if (imSplashScreen(c, s)) {
                s.seenIntro = true;
            }
        } imIfEnd(c);
    } imLayoutEnd(c);

    if (imMemo(c, s.currentVisibleInstallation) | imMemo(c, scrolledToTop)) {
        if (!s.animations.sideBarOpen) {
            if (s.currentVisibleInstallation || scrolledToTop) {
                if (scrolledToTop) {
                    s.currentVisibleInstallation = undefined;
                }

                updateHash(s, s.currentVisibleInstallation);
            }
        }
    }
}


export function imRenderWithErrorBoundary(
    c: ImCache,
    harness: VisualTestHarnessState,
    test: (c: ImCache, harness: VisualTestHarnessState) => void
) {
    imSwitch(c, test); {
        const tryState = imTry(c); try {
            const { err, recover } = tryState;
            if (imIf(c) && !err) {
                test(c, harness);
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


export function scrollToInstalllation(harness: VisualTestHarnessState, installation: VisualTestHarnessInstallationState) {
    // Yooo. The # is the id selector. Its also the hash in the URL.
    // The hash in the url navigates to the element on the page with id=hash. Damn. Orthogonality of design. crazy
    const handle = document.getElementById(installation.hash);
    if (handle) {
        handle.scrollIntoView();
    }
}

export function updateHash(harness: VisualTestHarnessState, installation: VisualTestHarnessInstallationState | undefined) {
    harness.currentInstallation = installation;

    if (installation) {
        updateWindowLocationHash(installation.hash);
    } else {
        updateWindowLocationHash("");
    }
}

// Dont call this directly
let lastCalled = 0;
function updateWindowLocationHash(hash: string) {
    if (window.location.hash === hash) return;
    if (Date.now() - lastCalled < 50) {
        // throw new Error("Don't call this so frequently bro. You'll trigger the browser's security Exception");
    }
    lastCalled = Date.now();

    hash = hash ? ("#" + hash) : "";

    let url = window.location.pathname + window.location.search + hash;
    console.log("replacing state", window.location.hash, hash);
    window.history.replaceState(null, "", url);
}

