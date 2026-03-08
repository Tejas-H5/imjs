import { elSetStyle, imStr } from "src/utils/im-js";
import { getDeltaTimeSeconds, getFpsCounterState, ImCache, imFor, imForEnd, imGetInline, imSet, isEventRerender, isFirstishRender } from "src/utils/im-js/im-core";
import { BLOCK, COL, imAlign, imAspectRatio, imBg, imFlex, imGap, imJustify, imLayoutBegin, imLayoutEnd, imScrollOverflow, imSliderInput, newColorFromHsv, PX, ROW } from "src/utils/im-js/im-ui";
import { imVisualTestInstallation, TEST_SCROLLABLE, VisualTestHarnessState } from "src/utils/im-js/im-ui/visual-testing-harness";
import { imBaseContainerBegin, imBaseContainerEnd } from "./common";

export function imJsPerformanceBenchmarks(c: ImCache, harness: VisualTestHarnessState) {
    imBaseContainerBegin(c); {
        imVisualTestInstallation(c, "Benchmark Runner", harness, imBenchmarkRunner, TEST_SCROLLABLE);
    } imBaseContainerEnd(c);

    imBaseContainerBegin(c); {
        imVisualTestInstallation(c, "Lots of boxes", harness, imLotsOfBoxesWithUI, TEST_SCROLLABLE);
    } imBaseContainerEnd(c);
}

function imBenchmarkRunner(c: ImCache) {
    imLayoutBegin(c, COL); imGap(c, 10, PX); imFlex(c); {
    } imLayoutEnd(c);
}


function imLotsOfBoxesWithUI(c: ImCache) {
    const s = imGetInline(c, imLotsOfBoxesWithUI) ??
        imSet(c, {
            rows: 10,
            cols: 10,
            renderBudgetMs: 1,
            timeElapsed: 0,
        });

    const fps = getFpsCounterState(c);

    if (!isEventRerender(c)) {
        s.timeElapsed += getDeltaTimeSeconds(c);
    }
    if (s.timeElapsed > 1) {
        s.timeElapsed = 0;
        const rowsPerMs = s.rows / fps.renderMs;
        if (!isNaN(rowsPerMs)) {
            const estimatedPossibleRows = rowsPerMs * s.renderBudgetMs;
            s.rows = Math.min(estimatedPossibleRows, s.rows + 50);
        }
    }

    imLayoutBegin(c, COL); imGap(c, 10, PX); imFlex(c); {
        imLayoutBegin(c, ROW); {
            imLayoutBegin(c, BLOCK); {
                if (isFirstishRender(c)) elSetStyle(c, "minWidth", "200px");
                imStr(c, "Render ms budget: "); imStr(c, s.renderBudgetMs);
            } imLayoutEnd(c);

            s.renderBudgetMs = imSliderInput(c, 1, 17, 1, s.renderBudgetMs);
        } imLayoutEnd(c);

        imLayoutBegin(c, BLOCK); {
            imStr(c, "Boxes rendered: "); imStr(c, Math.floor(s.rows) * s.cols);

            imStr(c, ", "); imStr(c, "Current render ms: "); imStr(c, fps.renderMs);
        } imLayoutEnd(c);

        imLotsOfBoxes(c, s.rows, s.cols);

    } imLayoutEnd(c);
}

function imLotsOfBoxes(c: ImCache, rows: number, cols: number) {
    imLayoutBegin(c, COL); imGap(c, 10, PX); imFlex(c); imScrollOverflow(c); {
        let idx = 0;
        imFor(c); for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
            imLayoutBegin(c, ROW); imGap(c, 10, PX); {
                imFor(c); for (let colIdx = 0; colIdx < cols; colIdx++) {
                    const boxState = imGetInline(c, imLotsOfBoxes) ??
                        imSet(c, { color: newColorFromHsv(Math.random(), 0.5, 0.5).toCssString() });
                    imLayoutBegin(c, ROW); imBg(c, boxState.color); imFlex(c); imAspectRatio(c, 1, 1); imAlign(c); imJustify(c); {
                        imStr(c, idx);
                    } imLayoutEnd(c);
                    idx++;
                } imForEnd(c);
            } imLayoutEnd(c);
        } imForEnd(c);
    } imLayoutEnd(c);
}
