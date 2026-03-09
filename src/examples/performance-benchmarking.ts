import { assert } from "src/utils/assert";
import { DomAppender, EL_DIV, elSetStyle, imDomRootBegin, imDomRootEnd, imElBegin, imElEnd, imStr } from "src/utils/im-js";
import { getDeltaTimeSeconds, getFpsCounterState, ImCache, imCacheBegin, imCacheEnd, imFor, imForEnd, imGetInline, imIf, imIfElse, imIfEnd, imKeyedBegin, imKeyedEnd, imMemo, imSet, imState, imSwitch, imSwitchEnd, isEventRerender, isFirstishRender } from "src/utils/im-js/im-core";
import { BLOCK, CENTER, COL, cssVars, imAlign, imAspectRatio, imBg, imButtonIsClicked, imFg, imFlex, imFlexWrap, imGap, imJustify, imLayoutBegin, imLayoutEnd, imScrollOverflow, imSliderInput, INLINE, LEFT, newColorFromHsv, PX, ROW } from "src/utils/im-js/im-ui";
import { imVisualTestInstallation, TEST_SCROLLABLE, VisualTestHarnessState } from "src/utils/im-js/im-ui/visual-testing-harness";
import { imBaseContainerBegin, imBaseContainerEnd, imSubheadingBegin, imSubheadingEnd } from "./common";
import { getPreviousResult, getUserAgentString, previousResults, previousResultsByUserAgent, UserAgentString } from "./prev-results";

export function imJsPerformanceBenchmarks(c: ImCache, harness: VisualTestHarnessState) {
    imBaseContainerBegin(c); {
        imVisualTestInstallation(c, "Benchmark Runner", harness, imBenchmarkRunner, TEST_SCROLLABLE);

        imSubheadingBegin(c); imStr(c, "What the benchmarks actually look like"); imSubheadingEnd(c);

        imVisualTestInstallation(c, "Lots of boxes", harness, imLotsOfBoxesWithUI, TEST_SCROLLABLE);
    } imBaseContainerEnd(c);
}

export type BenchmarkResult = {
    name: string;

    /**
    I want a table at the end that's like 
     */

    variable1Name: string;
    variable1: number[];
    variable2Name: string;
    variable2: number[];
    measurements: Measurement[];
}

type Measurement = {
    values: number[];
};

function newMeasurement(): Measurement {
    return  {
        values: [],
    };
}

function computeMean(m: Measurement) {
    let mean = 0;
    for (const val of m.values) {
        mean += val;
    }

    mean /= m.values.length;
    return mean;
}

function computeStandardDeviation(m: Measurement, mean: number) {
    let variance = 0;
    for (const val of m.values) {
        variance += Math.pow(val - mean, 2);
    }

    return Math.sqrt(variance / (m.values.length - 1));
}

type BenchmarkReport = {
    results: BenchmarkResult[];
}

type BenchmarkRunnerState = {
    report: BenchmarkReport | null;
    isGeneratingReport: boolean;
    stubNode: DomAppender<HTMLDivElement> | null;
};

function newBenchmarkRunnerState(): BenchmarkRunnerState {
    return {
        report: null,
        isGeneratingReport: false,
        stubNode: null,
    };
}


function imBenchmarkRunner(c: ImCache) {
    const s = imState(c, newBenchmarkRunnerState);

    if (imMemo(c, s)) {
        if (previousResults.length > 0) {
            s.report = { results: previousResults };
        }
    }

    imLayoutBegin(c, COL); imGap(c, 10, PX); imFlex(c); {
        if (imButtonIsClicked(c, "Rerun benchmarks") && s.stubNode && !s.isGeneratingReport) {
            s.isGeneratingReport = true;
            generateReport(s, s.stubNode.root);
        }

        s.stubNode = imElBegin(c, EL_DIV); {
            s.stubNode.manualDom = true;
        } imElEnd(c, EL_DIV);

        if (imIf(c) && s.report && !s.isGeneratingReport) {
            imBenchmarkReportViewer(c, s.report.results);
        } else {
            imIfElse(c);

            imStr(c, s.isGeneratingReport ? "Running benchmarks..." : "No report");
        } imIfEnd(c);

    } imLayoutEnd(c);
}

const CELL_BOLD = (1 << 0);

function imTableCellBegin(c: ImCache, alignment = LEFT, flags = 0) {
    const bold = !!(CELL_BOLD & flags);
    imLayoutBegin(c, ROW); imJustify(c, alignment); {
        if (isFirstishRender(c)) elSetStyle(c, "backgroundColor", cssVars.bg);
        if (imMemo(c, bold)) elSetStyle(c, "fontWeight", bold ? "bold" : "");
    } // imLayoutEnd(c);
}

function imTableCellEnd(c: ImCache) {
    // imLayoutBegin(c, ROW); 
    {
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
            imStr(c, ", "); imStr(c, "Current render ms: "); imStr(c, fps.renderMs.toFixed(0));
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

function generateReport(s: BenchmarkRunnerState, root: HTMLDivElement) {
    s.isGeneratingReport = true;

    setTimeout(() => {
        const report: BenchmarkReport = { results: [] };

        const numInitializationSamples = 10;
        // This is the thing we care more about, given initialization speed is largely out of our hands.
        // "did the document.createDiv fast enough?"
        const numRerenderSamples = 5; 

        // Lots of boxes
        {
            const cols = 10;
            const renderingBenchmark = newBenchmarkResult(
                report,
                `Lots of boxes - ${cols}x#rows`,
                // TODO: figure out why .reverse() improves higher end results - 
                // maybe the memory allocations from the previous runs have lower impact??
                "#rows", [
                    20,
                    200,
                    2000,
                    // Only uncomment once we get all times < 5ms
                    // 2500,
                    // 5000
                ].reverse(),
                "#render", [1, 2],
            );

            function renderFn(c: ImCache, rows = 10, cols = 10) {
                imCacheBegin(c, renderFn); {
                    imDomRootBegin(c, root); {
                        imLotsOfBoxes(c, rows, cols);
                    } imDomRootEnd(c, root);
                } imCacheEnd(c);
            }

            const timer = newTimer();

            for (let sample = 0; sample < numInitializationSamples; sample++) {
                renderingBenchmark.variable1.forEach((rows, rowsIdx) => {
                    // new cache for each rows config
                    const c: ImCache = [];
                    root.replaceChildren();

                    getTime(timer);
                    renderingBenchmark.variable2.forEach((render, renderIdx) => {
                        const n = renderIdx === 0 ? 1 : numRerenderSamples;

                        for (let sample = 0; sample < n; sample++) {
                            renderFn(c, rows, cols);
                            pushBenchmarkResult(renderingBenchmark, rowsIdx, renderIdx, getTime(timer));
                        }
                    });
                });
            }
        }

        // Clear children once we're done
        root.replaceChildren();

        s.report = report;
        s.isGeneratingReport = false;
    }, 10);
}

function newBenchmarkResult(
    report: BenchmarkReport,
    name: string,
    variable1Name: string,
    variable1: number[],
    variable2Name: string,
    variable2: number[],
): BenchmarkResult {
    const result: BenchmarkResult = {
        name,
        variable1Name,
        variable1,
        variable2Name,
        variable2,
        measurements: Array(variable1.length * variable2.length).fill(0).map(() => newMeasurement()),
    }
    report.results.push(result);
    return result;
}


function getBenchmarkResultIdx(res: BenchmarkResult, v1Idx: number, v2Idx: number) {
    const arrayIdx = res.variable1.length * v2Idx + v1Idx;
    assert(arrayIdx < res.measurements.length);
    return arrayIdx;
}

function pushBenchmarkResult(res: BenchmarkResult, v1Idx: number, v2Idx: number, time: number) {
    const measurements = getBenchmarkMeasurement(res, v1Idx, v2Idx);
    measurements.values.push(time);
}

function getBenchmarkMeasurement(res: BenchmarkResult, v1Idx: number, v2Idx: number) {
    return res.measurements[getBenchmarkResultIdx(res, v1Idx, v2Idx)];
}

type Timer = {
    t: number;
}

function newTimer(): Timer {
    return {
        t: performance.now()
    };
}

function getTime(timer: Timer) {
    const now = performance.now();
    const result = now - timer.t;
    timer.t = now;
    return result;
}

function imBenchmarkReportViewer(c: ImCache, results: BenchmarkResult[]) {
    imSubheadingBegin(c); imStr(c, "Results"); imSubheadingEnd(c);

    imStr(c, "Currently on"); imStr(c, getUserAgentString());

    let regressions = 0;

    imLayoutBegin(c, BLOCK); {

        imLayoutBegin(c, BLOCK); {
            if (imIf(c) && results === previousResults) {
                imStr(c, "NOTE: viewing previous results");
            } imIfEnd(c);
        } imLayoutEnd(c);

        imFor(c); for (const res of results) {
            imKeyedBegin(c, res); {
                let resState; resState = imGetInline(c, imGetInline);
                if (!resState) {
                    const prevResult = getPreviousResult(res);
                    resState = imSet(c, { prevResult });
                }

                regressions += imBenchmarkResultsViewer(c, res, resState.prevResult);
            } imKeyedEnd(c);
        } imForEnd(c);

        // TODO: view results for other user agents.

        imStr(c, "Regressions: ");
        imStr(c, regressions);

        if (imButtonIsClicked(c, "Copy to clipboard")) {
            const code = `[${JSON.stringify(getUserAgentString())} as UserAgentString]: ${JSON.stringify(results)},`;
            navigator.clipboard.writeText(code);
        }

        // Previous results
        {
            const prevResultsState = imGetInline(c, imBenchmarkReportViewer) ??
                imSet(c, { currentUserAgent: Object.keys(previousResultsByUserAgent)[0] });

            imSubheadingBegin(c); imStr(c, "Previous results"); imSubheadingEnd(c);

            imLayoutBegin(c, ROW); imFlexWrap(c); {
                imFor(c); for (const userAgent in previousResultsByUserAgent) {
                    if (imButtonIsClicked(c, userAgent, prevResultsState.currentUserAgent === userAgent)) {
                        prevResultsState.currentUserAgent = userAgent;
                    }
                } imForEnd(c);
            } imLayoutEnd(c);

            imSwitch(c, prevResultsState.currentUserAgent); {
                const prevResults = previousResultsByUserAgent[prevResultsState.currentUserAgent as UserAgentString];
                imFor(c); for (const result of prevResults) {
                    imBenchmarkResultsViewer(c, result, undefined);
                } imForEnd(c);
            } imSwitchEnd(c);
        }
    } imLayoutEnd(c);
}

function imBenchmarkResultsViewer(c: ImCache, res: BenchmarkResult, resPrev: BenchmarkResult | undefined) {
    imTableCellBegin(c, CENTER, CELL_BOLD); {
        imStr(c, res.name);
    } imTableCellEnd(c);

    let regressions = 0;

    imLayoutBegin(c, BLOCK); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "display", "grid");
            elSetStyle(c, "gap", "1px");
            elSetStyle(c, "padding", "1px");
            elSetStyle(c, "backgroundColor", cssVars.fg);
        }

        if (imMemo(c, res.variable2.length)) {
            elSetStyle(c, "gridTemplateColumns", "1fr ".repeat(res.variable2.length + 1));
        }

        imTableCellBegin(c, CENTER, CELL_BOLD); imStr(c, "↓" + res.variable1Name + " x " + res.variable2Name + "->"); imLayoutEnd(c);
        imFor(c); for (const v2 of res.variable2) {
            imTableCellBegin(c, CENTER, CELL_BOLD); imStr(c, v2); imLayoutEnd(c);
        } imForEnd(c);


        imFor(c); for (let v1Idx = 0; v1Idx < res.variable1.length; v1Idx++) {
            imTableCellBegin(c, CENTER, CELL_BOLD); imStr(c, res.variable1[v1Idx]); imLayoutEnd(c);

            imFor(c); for (let v2Idx = 0; v2Idx < res.variable2.length; v2Idx++) {
                imTableCellBegin(c, CENTER); {
                    const thisMeasurement = getBenchmarkMeasurement(res, v1Idx, v2Idx);
                    const prevResult = !resPrev ? thisMeasurement :
                        getBenchmarkMeasurement(resPrev, v1Idx, v2Idx);

                    let measurementState; measurementState = imGetInline(c, imGetInline);
                    if (!measurementState) {
                        const mean = computeMean(thisMeasurement);
                        const tolerance = computeStandardDeviation(thisMeasurement, mean);

                        const meanPrev = computeMean(prevResult);
                        const tolerancePrev = computeStandardDeviation(prevResult, meanPrev);

                        measurementState = imSet(c, {
                            mean,
                            meanPrev,
                            tolerance,
                            tolerancePrev,
                        });
                    }

                    const split = measurementState.mean - measurementState.meanPrev;

                    imStr(c, measurementState.mean.toFixed(0));
                    imStr(c, " +/- ");
                    imStr(c, measurementState.tolerance.toFixed(0));
                    imStr(c, " x");
                    imStr(c, thisMeasurement.values.length);

                    imLayoutBegin(c, INLINE); {
                        if (imIf(c) && resPrev && split !== 0) {

                            const withinTolerance = Math.abs(split) < measurementState.tolerancePrev;

                            imFg(c, withinTolerance ? "" : split < 0 ? "rgb(0, 180, 0)" : "rgb(255, 0, 0)");

                            imStr(c, " (");
                            imStr(c, split < 0 ? "-" : "+");
                            imStr(c, Math.abs(split).toFixed(0));
                            imStr(c, "ms");

                            imStr(c, withinTolerance ? " (ok)" : split < 0 ? "(good)" : "(bad)");

                            if (!withinTolerance && split > 0) {
                                regressions++
                            }

                            imStr(c, ")");
                        } imIfEnd(c);
                    } imLayoutEnd(c);
                } imLayoutEnd(c);
            } imForEnd(c);
        } imForEnd(c);
    } imLayoutEnd(c);

    // xd
    return regressions;
}
