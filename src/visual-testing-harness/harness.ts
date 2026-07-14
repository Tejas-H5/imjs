import { im, ImCache, imdom, el } from "im-js";
import { BLOCK, COL, cssVars, END, imui, INLINE, NA, PX, ROW, START } from "im-ui";
import { imButtonIsClicked } from "im-ui/components/button";
import { lerp, lerp01 } from "im-ui/components/math-utils";
import { VisualTestHarnessInstallationState } from "./installation";
import { imSplashScreen } from "./splash-screen";
import * as bl from "blog-lang";
import { imJsBlogPost } from "./im-js-blogpost";
import { Module } from "minimal-tsc";

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

const SIDEBAR_OPEN_TRIGGER_THRESHOLD = 0.03;

export function newVisualTestFromBlogLang(markup: string, modules: Module[]) {
    const post = bl.parse(markup);

    let name = "Unknown";

    const firstBlock = post.blocks[0];
    if (firstBlock.type === bl.B_TEXT) {
        name = bl.getTextBlockContent(firstBlock);
        if (name.length > 100) {
            name = name.substring(0, 100);
        }
    }

    return {
        name: name,
        code: (c: ImCache, harness: VisualTestHarnessState) => {
            imJsBlogPost(c, harness, post, modules);
        },
    };
}

export type VisualTestHarnessState = {
    tests: VisualTest[],
    currentTest: VisualTest | undefined;
    currentInstallation: VisualTestHarnessInstallationState | undefined;
    currentVisibleInstallation: VisualTestHarnessInstallationState | undefined;
    animations: {
        introToUse: number;
        scaleFactor: number;
        t: number;
        rightSidebar: SidebarState;
        leftSidebar: SidebarState;
    },
    installations: VisualTestHarnessInstallationState[];
}

type SidebarState = {
    isLeft: boolean;
    sideBarOpen01: number;
    sideBarOpen: boolean;

    currentItem: unknown;
    hoveredItem: unknown;
    hoveredItemNext: unknown;
    isHovering: boolean;
};

function newSidebarState(isLeft: boolean): SidebarState {
    return {
        isLeft:          isLeft,
        sideBarOpen01:   0,
        sideBarOpen:     false,
        isHovering:      false,

        currentItem:     undefined,
        hoveredItem:     undefined,
        hoveredItemNext: undefined,
    }
}

function newState(): VisualTestHarnessState {
    return {
        tests: [],
        currentTest: undefined,
        currentInstallation: undefined,
        currentVisibleInstallation: undefined,
        animations: {
            introToUse: 0,
            scaleFactor: 0,
            t: 0,
            rightSidebar: newSidebarState(false),
            leftSidebar: newSidebarState(true),
        },
        installations: [],
    };
}

function parseUrl(search: string) {
    return new URLSearchParams(search);
}


export function imHeading(c: ImCache, text: string, id: string) {
    imdom.ElBegin(c, el.H1); imui.Layout(c, ROW); imui.Justify(c); {
        if (im.Memo(c, id)) imdom.setAttr(c, "id", id);
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.H1);
}

export function setCurrentTest(s: VisualTestHarnessState, test: VisualTest | undefined, pushHistory: boolean) {
    if (s.currentTest === test) return;

    s.currentTest = test;
    const params = new URLSearchParams(window.location.search);
    if (!test) {
        params.delete("test");
    } else {
        params.set("test", test.name);
    }

    if (pushHistory) {
        window.history.pushState(null, "", "?" + params.toString());
        document.getElementById("top")?.scrollIntoView();
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
    s.tests = tests;

    const currentTestName = queryParams.get("test");

    if (im.Memo(c, currentTestName)) {
        const wantedTest = tests.find(test => test.name === currentTestName);
        if (wantedTest) {
            setCurrentTest(s, wantedTest, false);
        } else {
            setCurrentTest(s, undefined, false);
        }
    }

    let scrollView;
    let scrolledToTop = false;

    const root = imui.Begin(c, COL); imui.Flex(c); {
        const rootClientRect = root.getBoundingClientRect();

        if (im.If(c) && s.currentTest) {
            if (im.If(c) && tests.length === 0) {
                imui.Begin(c, ROW); imui.Flex(c); imui.Align(c); imui.Justify(c); {
                    imdom.Str(c, "No tests yet");
                } imui.End(c);
            } else {
                im.IfElse(c);

                // Main view
                scrollView = imui.Begin(c, COL); imui.Flex(c); imui.Relative(c); imui.ScrollOverflow(c); {
                    // We need to be able to highlight the things without triggering the sidebars.
                    const paddingPx = rootClientRect.width * SIDEBAR_OPEN_TRIGGER_THRESHOLD + 5;
                    imui.PaddingRL(c, paddingPx, PX, paddingPx, PX);

                    imui.Begin(c, BLOCK); { 
                        if (im.isFirstRender(c)) {
                            imdom.setAttr(c, "id", "top");
                        }
                    } imui.End(c);

                    imRenderWithErrorBoundary(c, s, s.currentTest.code);
                } imui.End(c);

                scrolledToTop = scrollView.scrollTop < 20;

                // Left
                {
                    const sidebar = s.animations.leftSidebar;
                    imSidebarBegin(c, sidebar, s.currentTest); {
                        imSidebarTitle(c, sidebar.isLeft, "Tests");

                        let isHoveringSidebar = false;
                        let deferredEvent: (() => void) | undefined;

                        im.For(c); for (const test of tests) {
                            imSidebarItemBegin(c, sidebar, test); {
                                const hasMouseOver = imdom.hasMouseOver(c);
                                if (hasMouseOver) {
                                    isHoveringSidebar = true;
                                }

                                if (imButtonIsClicked(c, test.name, test === s.currentTest)) {
                                    deferredEvent = () => {
                                        setCurrentTest(s, test, true);
                                        sidebar.sideBarOpen = false;
                                    }
                                }
                            } imSidebarItemEnd(c, sidebar, test);
                        } im.ForEnd(c);

                        if (deferredEvent) {
                            deferredEvent();
                        }

                        if (im.Memo(c, isHoveringSidebar) && !isHoveringSidebar) {
                            scrollToInstalllation(s, s.currentInstallation);
                        }
                    } imSidebarEnd(c);
                }

                // Right 
                if (im.If(c) && s.installations.length > 0) {
                    const sidebar = s.animations.rightSidebar;
                    imSidebarBegin(c, sidebar, s.currentInstallation); {
                        imSidebarTitle(c, sidebar.isLeft, "Installations");

                        let isHoveringSidebar = false;
                        let deferredEvent: (() => void) | undefined;

                        im.For(c); for (let i = -1; i < s.installations.length; i++) {
                            const installation = s.installations[i] as VisualTestHarnessInstallationState | undefined;

                            imSidebarItemBegin(c, sidebar, installation); {
                                const hasMouseOver = imdom.hasMouseOver(c);
                                if (hasMouseOver) {
                                    isHoveringSidebar = true;
                                    scrollToInstalllation(s, installation);
                                }

                                if (imButtonIsClicked(c, installation?.title ?? s.currentTest.name, installation === s.currentInstallation)) {
                                    deferredEvent = () => {
                                        scrollToInstalllation(s, installation);
                                        updateHash(s, installation);
                                        sidebar.sideBarOpen = false;
                                    }
                                }
                            } imSidebarItemEnd(c, sidebar, installation);
                        } im.ForEnd(c);

                        if (deferredEvent) {
                            deferredEvent();
                        }

                        if (im.Memo(c, isHoveringSidebar) && !isHoveringSidebar) {
                            scrollToInstalllation(s, s.currentInstallation);
                        }
                    } imSidebarEnd(c);
                } im.IfEnd(c);
            } im.IfEnd(c);
        } else {
            im.IfElse(c);
            if (imSplashScreen(c, s)) {
                if (tests.length > 0) {
                    setCurrentTest(s, tests[0], true);
                } else {
                    // TODO: we should have a UI for this.
                    console.error("Need at least one test")
                }
            }
        } im.IfEnd(c);
    } imui.End(c);

    if (im.Memo(c, s.currentVisibleInstallation) | im.Memo(c, scrolledToTop)) {
        if (!s.animations.rightSidebar.sideBarOpen && !s.animations.leftSidebar.sideBarOpen) {
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

export function scrollToInstalllation(harness: VisualTestHarnessState, installation: VisualTestHarnessInstallationState | undefined) {
    // Yooo. The # is the css id selector. Its also the hash in the URL.
    // The hash in the url navigates to the element on the page with #<hash>. Damn. Orthogonality of design. crazy
    const handle = document.getElementById(installation ? installation.hash : "top");
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

function imSidebarTitle(c: ImCache, isLeft: boolean, str: string) {
    imui.Begin(c, ROW); imui.Justify(c, isLeft ? START : END); imui.Padding(c, 10, PX, 10, PX, 10, PX, 10, PX); {
        imui.Begin(c, INLINE); imui.Bg(c, cssVars.bg);  {
            imdom.Str(c, str);
        } imui.End(c);
    } imui.End(c);
}

function imSidebarBegin(c: ImCache, sidebar: SidebarState, currentItem: unknown) {
    const isLeft = sidebar.isLeft;

    const leftUnit  = isLeft ? PX : NA;
    const rightUnit = isLeft ? NA : PX;

    const el             = imdom.getElement(c);
    const rootClientRect = el.getBoundingClientRect();

    imui.Begin(c, COL); imui.Absolute(c, 0, PX, 0, rightUnit, 0, PX, 0, leftUnit); imui.Justify(c); imui.ScrollOverflow(c); {
        if (im.Memo(c, sidebar.sideBarOpen01) | im.Memo(c, rootClientRect.width)) {
            imdom.setStyle(c, "fontSize", (1 * sidebar.sideBarOpen01) + "em");
            imdom.setStyle(c, "maxWidth", lerp(SIDEBAR_OPEN_TRIGGER_THRESHOLD * rootClientRect.width, 5000, sidebar.sideBarOpen01) + "px");
        }

        sidebar.hoveredItem     = sidebar.hoveredItemNext;
        sidebar.hoveredItemNext = undefined;
        sidebar.currentItem     =  currentItem;

        // animate sidebar
        {
            const mouse = imdom.getMouse();
            const threshold = sidebar.sideBarOpen ? 0.3 : SIDEBAR_OPEN_TRIGGER_THRESHOLD;
            let minX = 0, maxX = 0;

            if (isLeft) {
                minX = rootClientRect.left;
                maxX = lerp01(rootClientRect.left, rootClientRect.right, threshold);
            } else {
                minX = lerp01(rootClientRect.left, rootClientRect.right, 1 - threshold);
                maxX = rootClientRect.right;
            }

            if (minX <= mouse.X && mouse.X <= maxX) {
                sidebar.sideBarOpen = true;
            } else {
                sidebar.sideBarOpen = false;
            }

            const target = sidebar.sideBarOpen ? 1 : 0;
            sidebar.sideBarOpen01 = lerp01(sidebar.sideBarOpen01, target, 30 * im.getDeltaTimeSeconds(c));
        }
    } // imui.End
}

function imSidebarEnd(c: ImCache) {
    {
    } imui.End(c);
}

// function imSidebar(
//     c: ImCache,
//     s: VisualTestHarnessState,
//     currentTest: VisualTest,
//     rootClientRect: DOMRect,
//     title: string,
//     sidebar: SidebarState,
//     isLeft = false,
// ) {
//     const leftUnit =  isLeft ? PX : NA;
//     const rightUnit = isLeft ? NA : PX;
//
//     imui.Begin(c, COL); imui.Absolute(c, 0, PX, 0, rightUnit, 0, PX, 0, leftUnit); imui.Justify(c); imui.ScrollOverflow(c); {
//         if (im.Memo(c, sidebar.sideBarOpen01) | im.Memo(c, rootClientRect.width)) {
//             imdom.setStyle(c, "fontSize", (1 * sidebar.sideBarOpen01) + "em");
//             imdom.setStyle(c, "maxWidth", lerp(SIDEBAR_OPEN_TRIGGER_THRESHOLD * rootClientRect.width, 5000, sidebar.sideBarOpen01) + "px");
//         }
//
//         let isHoveringSidebar = false;
//
//         imui.Begin(c, ROW); imui.Justify(c, isLeft ? START : END); imui.Bg(c, cssVars.bg); imui.Padding(c, 10, PX, 10, PX, 10, PX, 10, PX); {
//             imdom.Str(c, title);
//         } imui.End(c);
//
//         im.For(c); for (let i = -1; i < s.installations.length; i++) {
//             const installation = s.installations[i] as VisualTestHarnessInstallationState | undefined;
//
//             imSidebarItemBegin(c, isLeft); {
//                 const hasMouseOver = imdom.hasMouseOver(c);
//                 if (hasMouseOver) {
//                     isHoveringSidebar = true;
//                     scrollToInstalllation(s, installation);
//                 }
//
//                 const showArrow = hasMouseOver && s.currentInstallation !== installation;
//
//                 if (im.If(c) && !isLeft && showArrow) {
//                     imui.Begin(c, BLOCK); imui.Bg(c, cssVars.fg); imui.Fg(c, cssVars.bg); {
//                         imdom.Str(c, " -> ");
//                     } imui.End(c);
//                 } im.IfEnd(c);
//
//                 if (imButtonIsClicked(c, installation?.title ?? currentTest.name, installation === s.currentInstallation)) {
//                     scrollToInstalllation(s, installation);
//                     updateHash(s, installation);
//                     sidebar.sideBarOpen = false;
//                 }
//
//                 if (im.If(c) && isLeft && showArrow) {
//                     imui.Begin(c, BLOCK); imui.Bg(c, cssVars.fg); imui.Fg(c, cssVars.bg); {
//                         imdom.Str(c, " <- ");
//                     } imui.End(c);
//                 } im.IfEnd(c);
//             } imSidebarItemEnd(c, isLeft);
//         } im.ForEnd(c);
//
//         if (im.Memo(c, isHoveringSidebar) && !isHoveringSidebar) {
//             scrollToInstalllation(s, s.currentInstallation);
//         }
//
//         // animate sidebar
//         {
//             const mouse = imdom.getMouse();
//             const threshold = sidebar.sideBarOpen ? 0.3 : SIDEBAR_OPEN_TRIGGER_THRESHOLD;
//             let minX = 0, maxX = 0;
//
//             if (isLeft) {
//                 minX = rootClientRect.left;
//                 maxX = lerp01(rootClientRect.left, rootClientRect.right, threshold);
//             } else {
//                 minX = lerp01(rootClientRect.left, rootClientRect.right, 1 - threshold);
//                 maxX = rootClientRect.right;
//             }
//
//             if (minX < mouse.X && mouse.X < maxX) {
//                 sidebar.sideBarOpen = true;
//             } else {
//                 sidebar.sideBarOpen = false;
//             }
//
//             const target = sidebar.sideBarOpen ? 1 : 0;
//             sidebar.sideBarOpen01 = lerp01(sidebar.sideBarOpen01, target, 30 * im.getDeltaTimeSeconds(c));
//         }
//     } imui.End(c);
// }

function imSidebarItemBegin(c: ImCache, sidebar: SidebarState, item: unknown) {
    const isLeft = sidebar.isLeft;

    imui.Begin(c, ROW); imui.Justify(c, isLeft ? START : END); {
        imui.Begin(c, ROW); imui.Align(c); imui.Gap(c, 10, PX); {
            const hasMouseOver = imdom.hasMouseOver(c);
            const canShowArrow = hasMouseOver && sidebar.currentItem !== item;
            if (im.If(c) && !isLeft && canShowArrow) {
                imui.Begin(c, BLOCK); imui.Bg(c, cssVars.fg); imui.Fg(c, cssVars.bg); {
                    imdom.Str(c, " -> ");
                } imui.End(c);
            } im.IfEnd(c);
        } // imui.End
    } // imui.End
}

function imSidebarItemEnd(c: ImCache, sidebar: SidebarState, item: unknown) {
    const isLeft = sidebar.isLeft;

    // imui.Begin
    {
        // imui.Begin
        {
            const hasMouseOver = imdom.hasMouseOver(c);
            const canShowArrow = hasMouseOver && sidebar.currentItem !== item;
            if (im.If(c) && isLeft && canShowArrow) {
                imui.Begin(c, BLOCK); imui.Bg(c, cssVars.fg); imui.Fg(c, cssVars.bg); {
                    imdom.Str(c, " <- ");
                } imui.End(c);
            } im.IfEnd(c);
        } imui.End(c);
    } imui.End(c);
}
