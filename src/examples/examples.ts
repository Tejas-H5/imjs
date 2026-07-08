import { im, ImCache, imdom } from "im-js";
import { COL, imui, PX } from "im-ui";
import { imJsCompleteOverview } from "./overview";
import { imVisualTestHarness, newVisualTest, VisualTest } from "visual-testing-harness";
import { imJsPerformanceBenchmarks } from "./performance-benchmarking";

const tests: VisualTest[] = [
    newVisualTest("imJS - A complete overview", imJsCompleteOverview),
    newVisualTest("Performance benchmarks", imJsPerformanceBenchmarks),
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
