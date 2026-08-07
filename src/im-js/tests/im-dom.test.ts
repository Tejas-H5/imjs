import * as test from "testing";
import * as domino from "domino";
import { DomAppender, el, imdom } from "../im-dom";
import { im, ImCache } from "../im-core";

test.file("im-dom.test.ts");
// NOTE: im is assumed correct here.

type TestState = {
    c: ImCache;
    root: HTMLElement;
}

const window = domino.createWindow("<html><body></body></html>");
const document = window.document;
imdom.setWindow(window);

function newTestState(): TestState {
    const c = im.newCache();

    // @ts-expect-error domino doesn't have a replaceChildren method.
    // TODO: contribute this upstream
    document.body.removeChildren();

    const root = document.body;
    return {c, root};
}

function imTestBegin(r: test.Result, c: ImCache, root: HTMLElement): TestState {
    im.CacheBegin(c);
    imdom.Begin(c, root);

    return {
        c,
        root,
    };
}

function imTestEnd(c: ImCache, root: HTMLElement, r: test.Result) {
    imdom.End(c, root);
    im.CacheEnd(c);
}

function testChildAt(r: test.Result, el: HTMLElement, idx: number, type: string): HTMLElement {
    const child = el.children[idx];
    test.assert(r, child.tagName === type);
    return el.children[idx] as HTMLElement;
}

function testChildTextAt(r: test.Result, el: HTMLElement, idx: number, text: string): HTMLElement {
    const child = el.children[idx];
    test.assert(r, child.tagName === "DIV");
    test.assert(r, child.textContent === text);
    return el.children[idx] as HTMLElement;
}

function imTextEl(r: test.Result, c: ImCache, text: string) {
    imDivBegin(r, c); {
        imdom.Str(c, text);
    } imDivEnd(r, c);
}

function imDivBegin(r: test.Result, c: ImCache): DomAppender {
    return imdom.ElBegin(c, el.DIV);
}
function imDivEnd(r: test.Result, c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}

function testChildCount(r: test.Result, el: HTMLElement, count: number) {
    test.assertEqual(r, el.children.length, count);
}

test.group("Dom trivial building logic", [], () => {
    test.add("One item", r => {
        const { c, root } = newTestState();

        imTestBegin(r, c, root); {
            imTextEl(r, c, "A");
        } imTestEnd(c, root, r);

        testChildCount(r, root, 1);
        testChildAt(r, root, 0, "DIV");
    });

    test.add("Multiple items", r => {
        const { c, root } = newTestState();
        imTestBegin(r, c, root); {
            imTextEl(r, c, "A");
            imTextEl(r, c, "B");
        } imTestEnd(c, root, r);

        testChildCount(r, root, 2);
        testChildTextAt(r, root, 0, "A");
        testChildTextAt(r, root, 1, "B");
    });

    test.add("Nested items", r => {
        const { c, root } = newTestState();

        imTestBegin(r, c, root); {
            imDivBegin(r, c); {
                imTextEl(r, c, "A");
            } imDivEnd(r, c);
            imDivBegin(r, c); {
                imTextEl(r, c, "B");
                imTextEl(r, c, "C");
            } imDivEnd(r, c);
        } imTestEnd(c, root, r);

        testChildCount(r, root, 2);

        const div1 = testChildAt(r, root, 0, "DIV");
        testChildCount(r, div1, 1);
        testChildTextAt(r, div1, 0, "A");

        const div2 = testChildAt(r, root, 1, "DIV");
        testChildTextAt(r, div2, 0, "B");
        testChildTextAt(r, div2, 1, "C");
    });
});

test.group("Dom in-place diffing logic", [], () => {
    test.add("One item", r => {
        function render(c: ImCache, root: HTMLElement, renderA: boolean) {
            imTestBegin(r, c, root); {
                if (im.If(c) && renderA) {
                    imTextEl(r, c, "A");
                } im.IfEnd(c);
            } imTestEnd(c, root, r);
        }

        const { c, root } = newTestState();

        for (let i = 0; i < 4; i++) {
            if (i % 2 === 0) {
                render(c, root, false);
                testChildCount(r, root, 0);
            } else {
                render(c, root, true);
                testChildCount(r, root, 1);
                testChildTextAt(r, root, 0, "A");
            }
        }
    });

    test.add("One item - Insert before", r => {
        function render(c: ImCache, root: HTMLElement, renderA: boolean) {
            imTestBegin(r, c, root); {
                if (im.If(c) && renderA) {
                    imTextEl(r, c, "A");
                } im.IfEnd(c);
                imTextEl(r, c, "B");
            } imTestEnd(c, root, r);
        }

        const { c, root } = newTestState();

        for (let i = 0; i < 4; i++) {
            if (i % 2 === 0) {
                render(c, root, false);
                testChildCount(r, root, 1);
                testChildTextAt(r, root, 0, "B");
            } else {
                render(c, root, true);
                testChildCount(r, root, 2);
                testChildTextAt(r, root, 0, "A");
                testChildTextAt(r, root, 1, "B");
            }
        }
    });

    test.add("One item - Insert after", r => {
        function render(c: ImCache, root: HTMLElement, renderA: boolean) {
            imTestBegin(r, c, root); {
                imTextEl(r, c, "B");
                if (im.If(c) && renderA) {
                    imTextEl(r, c, "A");
                } im.IfEnd(c);
            } imTestEnd(c, root, r);
        }

        const { c, root } = newTestState();

        for (let i = 0; i < 3; i++) {
            if (i % 2 === 0) {
                render(c, root, false);
                testChildCount(r, root, 1);
                testChildTextAt(r, root, 0, "B");
            } else {
                render(c, root, true);
                testChildCount(r, root, 2);
                testChildTextAt(r, root, 0, "B");
                testChildTextAt(r, root, 1, "A");
            }
        }
    });

    test.add("One item - Before and after", r => {
        function render(c: ImCache, root: HTMLElement, renderAAndC: boolean) {
            imTestBegin(r, c, root); {
                if (im.If(c) && renderAAndC) {
                    imTextEl(r, c, "A");
                } im.IfEnd(c);
                imTextEl(r, c, "B");
                if (im.If(c) && renderAAndC) {
                    imTextEl(r, c, "C");
                } im.IfEnd(c);
            } imTestEnd(c, root, r);
        }

        const { c, root } = newTestState();

        for (let i = 0; i < 3; i++) {
            if (i % 2 === 0) {
                render(c, root, false);
                testChildCount(r, root, 1);
                testChildTextAt(r, root, 0, "B");
            } else {
                render(c, root, true);
                testChildCount(r, root, 3);
                testChildTextAt(r, root, 0, "A");
                testChildTextAt(r, root, 1, "B");
                testChildTextAt(r, root, 2, "C");
            }
        }
    });

    test.group("Nesting conditionals", [], () => {
        function renderIfIf( 
            r: test.Result,
            c: ImCache,
            root: HTMLElement,
            bit1: boolean,
            bit2: boolean,
        ) {
            imTestBegin(r, c, root); {
                if (im.If(c) && !bit1) {
                    if (im.If(c) && !bit2) {
                        imTextEl(r, c, "A");
                    } else {
                        im.Else(c);
                        imTextEl(r, c, "B");
                    } im.IfEnd(c);
                } else {
                    im.Else(c);
                    if (im.If(c) && !bit2) {
                        imTextEl(r, c, "C");
                    } else {
                        im.Else(c);
                        imTextEl(r, c, "D");
                    } im.IfEnd(c);
                } im.IfEnd(c);
            } imTestEnd(c, root, r);
        }

        const values = [
            { bits: [false, false], text: "A" },
            { bits: [false, true],  text: "B" },
            { bits: [true, false], text: "C" },
            { bits: [true, true],  text: "D" },
        ];

        for (const startVal of values) {
            for (const endVal of values) {
                test.add(`Nested - ${startVal.text} -> ${endVal.text}`, r => {
                    const { c, root } = newTestState();

                    renderIfIf(r, c, root, startVal.bits[0], startVal.bits[1]); {
                        testChildCount(r, root, 1);
                        testChildTextAt(r, root, 0, startVal.text);
                    }

                    renderIfIf(r, c, root, endVal.bits[0], endVal.bits[1]); {
                        testChildCount(r, root, 1);
                        testChildTextAt(r, root, 0, endVal.text);
                    }
                });
            }
        }
    });
});
