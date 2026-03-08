import { COL, imFixed, imLayoutBegin, imLayoutEnd, PX } from "src/utils/im-js/im-ui";
import { imVisualTestHarness, newVisualTest, VisualTest } from "src/utils/im-js/im-ui/visual-testing-harness";
import {
    ImCache,
    imCacheBegin,
    imCacheEnd
} from "../utils/im-js/im-core";
import {
    imDomRootBegin,
    imDomRootEnd,
    imGlobalEventSystemBegin,
    imGlobalEventSystemEnd
} from "../utils/im-js/im-dom";
import { imJsCompleteOverview } from "./overview";
import { imJsPerformanceBenchmarks } from "./performance-benchmarking";

const tests: VisualTest[] = [
    newVisualTest("imJS - a complete overview", imJsCompleteOverview),
    newVisualTest("performance benchmarks", imJsPerformanceBenchmarks),
];

export function imMain(c: ImCache) {
    imCacheBegin(c, imMain); {
        imDomRootBegin(c, document.body); {
            const ev = imGlobalEventSystemBegin(c); {
                imLayoutBegin(c, COL); imFixed(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                    imVisualTestHarness(c, tests);
                } imLayoutEnd(c);
            } imGlobalEventSystemEnd(c, ev);
        } imDomRootEnd(c, document.body);
    } imCacheEnd(c);
}
