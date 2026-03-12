import { im, ImCache, imdom } from "src/utils/im-js";
import { COL, imFixed, imLayoutBegin, imLayoutEnd, PX } from "src/utils/im-js/im-ui";
import { imVisualTestHarness, newVisualTest, VisualTest } from "src/utils/im-js/im-ui/visual-testing-harness";
import { imJsCompleteOverview } from "./overview";
import { imJsPerformanceBenchmarks } from "./performance-benchmarking";

const tests: VisualTest[] = [
    newVisualTest("imJS - A complete overview", imJsCompleteOverview),
    newVisualTest("Performance benchmarks", imJsPerformanceBenchmarks),
];

export function imMain(c: ImCache) {
    im.CacheBegin(c, imMain); {
        imdom.RootBegin(c, document.body); {
            const ev = imdom.GlobalEventSystemBegin(c); {
                imLayoutBegin(c, COL); imFixed(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                    imVisualTestHarness(c, tests);
                } imLayoutEnd(c);
            } imdom.GlobalEventSystemEnd(c, ev);
        } imdom.RootEnd(c, document.body);
    } im.CacheEnd(c);
}
