import { el, ev, im, ImCache, imdom } from "im-js";
import { COL, cssVars, imui, PX } from "im-js/im-ui";
import { imVisualTestHarness, newVisualTestFromBlogLang, VisualTest } from "visual-testing-harness";

import page0 from "./pages/overview.md";
import page1 from "./pages/installing.md";
import page7 from "./pages/the-end.md";

// Not sure where it should go yet
import tutorial1 from "./pages/tutorial-1-todo-list.md";

import { assert } from "assert";

function imDivBegin(c: ImCache) {
    return imdom.ElBegin(c, el.DIV);
}

function imDivEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}

const imStr = imdom.Str;

function imButtonIsClicked(c: ImCache, text: string): MouseEvent | null {
    let result: MouseEvent | null = null;
    imdom.ElBegin(c, el.BUTTON); {
        result = imdom.On(c, ev.MOUSEDOWN);
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);
    return result;
}

const modules = [
    { namespace: "im",      env: im },
    { namespace: "imdom",   env: imdom },
    { namespace: "el",      env: el },
    { namespace: "ev",      env: ev },
    { namespace: "imui",    env: imui },
    { namespace: "cssVars", env: cssVars },
    { env: {
        assert: assert,
        imDivBegin: imDivBegin, imDivEnd: imDivEnd, 
        imButtonIsClicked: imButtonIsClicked,
        imStr: imStr,
    }}
]

const tests: VisualTest[] = [
    newVisualTestFromBlogLang(page0, modules),
    newVisualTestFromBlogLang(page1, modules),
    newVisualTestFromBlogLang(tutorial1, modules),
    newVisualTestFromBlogLang(page7, modules),
]

export function imMain(c: ImCache) {
    im.CacheBegin(c, imMain); {
        imdom.Begin(c, document.body); {
            imui.LayoutBegin(c, COL); imui.Fixed(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                imVisualTestHarness(c, tests);
            } imui.LayoutEnd(c);
        } imdom.End(c, document.body);
    } im.CacheEnd(c);
}
