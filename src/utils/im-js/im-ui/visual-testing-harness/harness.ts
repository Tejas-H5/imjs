import { im, ImCache } from '../../im-core';
import { imdom, el } from '../../im-dom';
import { imButtonIsClicked } from "../button";
import { lerp01 } from "../math-utils";
import { BLOCK, COL, END, imAbsolute, imAlign, imFlex, imFlexWrap, imGap, imJustify, imLayout, imLayoutBegin, imLayoutEnd, imRelative, imScrollOverflow, NA, PX, ROW } from "../ui-core";
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
    };
}

function parseUrl(search: string) {
    return new URLSearchParams(search);
}


export function imHeading(c: ImCache, text: string, id: string) {
    imdom.ElBegin(c, el.H1); imLayout(c, ROW); imJustify(c); {
        if (im.Memo(c, id)) imdom.setAttr(c, "id", id);
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.H1);
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
    const windowLocationSearchChanged = im.Memo(c, windowLocationSearch);

    let queryParams = im.Get(c, parseUrl);
    if (!queryParams || windowLocationSearchChanged) {
        queryParams = im.Set(c, parseUrl(windowLocationSearch));
    }

    const testsChanged = im.Memo(c, tests);
    let s = im.Get(c, newState);
    if (!s || testsChanged) {
        s = im.Set(c, newState());
    }

    s.installations.length = 0;
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

    const root = imLayoutBegin(c, COL); imFlex(c); {
        const rootClientRect = root.getBoundingClientRect();

        if (im.If(c) && s.currentTest) {
            if (im.If(c) && tests.length === 0) {
                imLayoutBegin(c, ROW); imFlex(c); imAlign(c); imJustify(c); {
                    imdom.Str(c, "No tests yet");
                } imLayoutEnd(c);
            } else {
                im.IfElse(c);

                // Top bar
                imLayoutBegin(c, ROW); imAlign(c); imFlexWrap(c); imGap(c, 10, PX); {
                    if (im.isFirstishRender(c)) imdom.setStyle(c, "overflow", "clip");
                    if (im.Memo(c, s.animations.topBarOpen)) imdom.setStyle(c, "fontSize", s.animations.topBarOpen + "em");

                    imLayoutBegin(c, ROW); imFlexWrap(c); {
                        im.For(c); for (const test of tests) {
                            if (imButtonIsClicked(c, test.name, s.currentTest === test)) {
                                setCurrentTest(s, test, true);
                            }
                        } im.ForEnd(c);
                    } imLayoutEnd(c);
                } imLayoutEnd(c);

                // Main view
                scrollView = imLayoutBegin(c, COL); imFlex(c); imRelative(c); imScrollOverflow(c); {
                    if (im.isFirstishRender(c)) {
                        // makes way for the sidebar. Not ideal code but eh
                        imdom.setStyle(c, "paddingRight", "2em");
                    }

                    imHeading(c, s.currentTest.name, "heading");

                    imRenderWithErrorBoundary(c, s, s.currentTest.code);
                } imLayoutEnd(c);

                scrolledToTop = scrollView.scrollTop < 20;

                const mouse = imdom.getMouse();

                // Animate the top bar
                {
                    let target = 0;
                    if (scrolledToTop) {
                        target = 1;
                    } else {
                        const yPos = lerp01(rootClientRect.top, rootClientRect.bottom, 0.05)
                        if (rootClientRect.top < mouse.Y && mouse.Y < yPos) {
                            target = 1;
                        }
                    }
                    s.animations.topBarOpen = lerp01(s.animations.topBarOpen, target, 30 * im.getDeltaTimeSeconds(c));
                }

                // Sidebar
                imLayoutBegin(c, COL); imAbsolute(c, 0, PX, 0, PX, 0, PX, 0, NA); imJustify(c); imScrollOverflow(c); {
                    if (im.Memo(c, s.animations.sideBarOpenEm)) imdom.setStyle(c, "fontSize", s.animations.sideBarOpenEm + "em");

                    let isHoveringSidebar = false;

                    im.For(c); for (let i = -1; i < s.installations.length; i++) {
                        const installation = s.installations[i] as VisualTestHarnessInstallationState | undefined;

                        imLayoutBegin(c, ROW); imJustify(c, END); {
                            imLayoutBegin(c, ROW); imAlign(c); imGap(c, 10, PX); {
                                const hasMouseOver = imdom.hasMouseOver(c);
                                if (hasMouseOver) {
                                    isHoveringSidebar = true;
                                    scrollToInstalllation(s, installation);
                                }

                                if (im.If(c) && hasMouseOver && s.currentInstallation !== installation) {
                                    imdom.Str(c, " -> ");
                                } im.IfEnd(c);

                                if (imButtonIsClicked(c, installation?.title ?? s.currentTest.name, installation === s.currentInstallation)) {
                                    scrollToInstalllation(s, installation);
                                    updateHash(s, installation);
                                    s.animations.sideBarOpen = false;
                                }
                            } imLayoutEnd(c);
                        } imLayoutEnd(c);
                    } im.ForEnd(c);

                    if (im.Memo(c, isHoveringSidebar) && !isHoveringSidebar) {
                        scrollToInstalllation(s, s.currentInstallation);
                    }

                    // animate sidebar
                    {
                        const threshold = s.animations.sideBarOpen ? 0.7 : 0.95;
                        const xPos = lerp01(rootClientRect.left, rootClientRect.right, threshold);
                        if (mouse.X < xPos || mouse.X > rootClientRect.right) {
                            s.animations.sideBarOpen = false;
                        } else {
                            s.animations.sideBarOpen = true;
                        }

                        const target = s.animations.sideBarOpen ? 1 : 0;
                        s.animations.sideBarOpenEm = lerp01(s.animations.sideBarOpenEm, target, 30 * im.getDeltaTimeSeconds(c));
                    }
                } imLayoutEnd(c);
            } im.IfEnd(c);
        } else {
            im.IfElse(c);
            if (imSplashScreen(c, s)) {
                s.seenIntro = true;
            }
        } im.IfEnd(c);
    } imLayoutEnd(c);

    if (im.Memo(c, s.currentVisibleInstallation) | im.Memo(c, scrolledToTop)) {
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
    im.Switch(c, test); {
        const tryState = im.Try(c); try {
            const { err, recover } = tryState;
            if (im.If(c) && !err) {
                test(c, harness);
            } else {
                im.IfElse(c);

                imLayoutBegin(c, BLOCK); {
                    imdom.Str(c, "An error occured while rendering your component: ");
                    if (imButtonIsClicked(c, "Try again")) {
                        recover();
                    }
                } imLayoutEnd(c);
                imLayoutBegin(c, BLOCK); {
                    imdom.Str(c, err);
                } imLayoutEnd(c);
            } im.IfEnd(c);
        } catch (err) {
            im.Catch(c, tryState, err);
        } im.TryEnd(c, tryState);
    } im.SwitchEnd(c);
}


export function scrollToInstalllation(harness: VisualTestHarnessState, installation: VisualTestHarnessInstallationState | undefined) {
    // Yooo. The # is the id selector. Its also the hash in the URL.
    // The hash in the url navigates to the element on the page with id=hash. Damn. Orthogonality of design. crazy
    const handle = document.getElementById(installation ? installation.hash : "heading");
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
    window.history.replaceState(null, "", url);
}

