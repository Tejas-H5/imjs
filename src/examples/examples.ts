import { im, ImCache, imdom } from "im-js";
import { COL, imui, PX } from "im-ui";
import { imVisualTestHarness, newVisualTestFromBlogLang, VisualTest } from "visual-testing-harness";

import page0 from "./pages/overview.md";
import page1 from "./pages/installing.md";
import page2 from "./pages/creating-components.md";
import page3 from "./pages/control-flow.md";
import page4 from "./pages/control-flow-part-2.md";
import page5 from "./pages/state-management.md";
import page6 from "./pages/the-end.md";

const tests: VisualTest[] = [
    newVisualTestFromBlogLang(page0),
    newVisualTestFromBlogLang(page1),
    newVisualTestFromBlogLang(page2),
    newVisualTestFromBlogLang(page3),
    newVisualTestFromBlogLang(page4),
    newVisualTestFromBlogLang(page5),
    newVisualTestFromBlogLang(page6),
]

export function imMain(c: ImCache) {
    im.CacheBegin(c, imMain); {
        imdom.RootBegin(c, document.body); {
            const ev = imdom.GlobalEventSystemBegin(c); {
                imui.LayoutBegin(c, COL); imui.Fixed(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                    imVisualTestHarness(c, tests);
                } imui.LayoutEnd(c);
            } imdom.GlobalEventSystemEnd(c, ev);
        } imdom.RootEnd(c, document.body);
    } im.CacheEnd(c);
}
