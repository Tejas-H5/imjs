import { assert } from "assert";
import { im, ImCache, imdom, el, DomAppender } from "im-js";
import { BLOCK, CENTER, COL, cssVars, imui, INLINE, LEFT, PX, ROW } from "im-js/im-ui";
import { imVisualTestInstallation, TEST_SCROLLABLE, VisualTestHarnessState } from "visual-testing-harness";
import { imBaseContainerBegin, imBaseContainerEnd, imParaBegin, imParaEnd, imSubheadingBegin, imSubheadingEnd } from "./common";
import { getPreviousResult, getUserAgentString, previousResults, previousResultsByUserAgent, UserAgentString } from "./prev-results";
import { imButtonIsClicked } from "im-js/im-ui/components/button";
import { imSliderInput } from "im-js/im-ui/components/slider";

export function imJsPerformanceBenchmarks(c: ImCache, harness: VisualTestHarnessState) {
    imBaseContainerBegin(c); {
        imVisualTestInstallation(c, "Benchmark Runner", harness, imBenchmarkRunner, TEST_SCROLLABLE);

        imSubheadingBegin(c); imdom.Str(c, "What the benchmarks actually look like"); imSubheadingEnd(c);

        imParaBegin(c); {
            imdom.Str(c, "We only have one right now. Do suggest more as needed");
        } imParaEnd(c);

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
    variable1NumSamples: number[];
    variable2Name: string;
    variable2: number[];
    variable2NumSamples: number[];
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
    const s = im.State(c, newBenchmarkRunnerState);

    if (im.Memo(c, s)) {
        if (previousResults.length > 0) {
            s.report = { results: previousResults };
        }
    }

    imui.Begin(c, COL); imui.Gap(c, 10, PX); imui.Flex(c); {
        if (imButtonIsClicked(c, "Rerun benchmarks") && s.stubNode && !s.isGeneratingReport) {
            s.isGeneratingReport = true;
            generateReport(s, s.stubNode.root);
        }

        s.stubNode = imdom.ElBegin(c, el.DIV); {
            s.stubNode.manualDom = true;
        } imdom.ElEnd(c, el.DIV);

        if (im.If(c) && s.report && !s.isGeneratingReport) {
            imBenchmarkReportViewer(c, s.report.results);
        } else {
            im.IfElse(c);

            imdom.Str(c, s.isGeneratingReport ? "Running benchmarks..." : "No report");
        } im.IfEnd(c);

    } imui.End(c);
}

const CELL_BOLD = (1 << 0);

function imTableCellBegin(c: ImCache, alignment = LEFT, flags = 0) {
    const bold = !!(CELL_BOLD & flags);
    imui.Begin(c, ROW); imui.Justify(c, alignment); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "backgroundColor", cssVars.bg);
        if (im.Memo(c, bold)) imdom.setStyle(c, "fontWeight", bold ? "bold" : "");
    } // imui.End(c);
}

function imTableCellEnd(c: ImCache) {
    // imui.Begin(c, ROW); 
    {
    } imui.LayoutEnd(c);
}


function imLotsOfBoxesWithUI(c: ImCache) {
    const s = im.GetInline(c, imLotsOfBoxesWithUI) ??
        im.Set(c, {
            rows: 10,
            cols: 10,
            renderBudgetMs: 1,
            timeElapsed: 0,
        });

    const fps = im.getFpsCounterState(c);

    if (!im.isEventRerender(c)) {
        s.timeElapsed += im.getDeltaTimeSeconds(c);
    }
    if (s.timeElapsed > 1) {
        s.timeElapsed = 0;
        const rowsPerMs = s.rows / fps.renderMs;
        if (!isNaN(rowsPerMs)) {
            const estimatedPossibleRows = rowsPerMs * s.renderBudgetMs;
            s.rows = Math.min(estimatedPossibleRows, s.rows + 50);
        }
    }

    imui.Begin(c, COL); imui.Gap(c, 10, PX); imui.Flex(c); {
        imui.Begin(c, ROW); {
            imui.Begin(c, BLOCK); {
                if (im.IsFirstRender(c)) imdom.setStyle(c, "minWidth", "200px");
                imdom.Str(c, "Render ms budget: "); imdom.Str(c, s.renderBudgetMs);
            } imui.End(c);

            s.renderBudgetMs = imSliderInput(c, 1, 17, 1, s.renderBudgetMs);
        } imui.End(c);

        imui.Begin(c, BLOCK); {
            imdom.Str(c, "Boxes rendered: "); imdom.Str(c, Math.floor(s.rows) * s.cols);
            imdom.Str(c, ", "); imdom.Str(c, "Current render ms: "); imdom.Str(c, fps.renderMs.toFixed(0));
        } imui.End(c);

        imLotsOfBoxes(c, s.rows, s.cols);

    } imui.End(c);
}

function imLotsOfBoxes(c: ImCache, rows: number, cols: number) {
    imui.Begin(c, COL); imui.Gap(c, 10, PX); imui.Flex(c); imui.ScrollOverflow(c); {
        let idx = 0;
        im.For(c); for (let rowIdx = 0; rowIdx < rows; rowIdx++) {
            imui.Begin(c, ROW); imui.Gap(c, 10, PX); {
                im.For(c); for (let colIdx = 0; colIdx < cols; colIdx++) {
                    const boxState = im.GetInline(c, imLotsOfBoxes) ??
                        im.Set(c, { color: imui.newColorFromHsv(Math.random(), 0.5, 0.5).toCssString() });
                    imui.Begin(c, ROW); imui.Bg(c, boxState.color); imui.Flex(c); imui.AspectRatio(c, 1, 1); imui.Align(c); imui.Justify(c); {
                        imdom.Str(c, idx);
                    } imui.End(c);
                    idx++;
                } im.ForEnd(c);
            } imui.End(c);
        } im.ForEnd(c);
    } imui.End(c);
}

function generateReport(s: BenchmarkRunnerState, root: HTMLDivElement) {
    s.isGeneratingReport = true;

    setTimeout(() => {
        const report: BenchmarkReport = { results: [] };

        // Lots of boxes
        {
            // Still not sure if it's the right abstraction. It could be improved.
            const cols = 10;
            const renderingBenchmark = newBenchmarkResult(
                report,
                `Lots of boxes - ${cols}x#rows`,
                // Only add 2500, 5000  we get all times < 5ms
                "#rows", [20, 200, 2000].reverse(), [10, 10, 10],
                // We care more about accurately measuring the re-render time, given initialization speed is largely out of our hands,
                // and rerendering will occur more often than normal renders. Worth doing both though.
                "#render", [1, 2], [1, 5],
            );

            function renderFn(c: ImCache, rows = 10, cols = 10) {
                im.CacheBegin(c, renderFn); {
                    imdom.RootBegin(c, root); {
                        imLotsOfBoxes(c, rows, cols);
                    } imdom.RootEnd(c, root);
                } im.CacheEnd(c);
            }

            runRenderingBenchmark(renderingBenchmark, renderFn, root);
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
    variable1NumSamples: number[],
    variable2Name: string,
    variable2: number[],
    variable2NumSamples: number[],
): BenchmarkResult {
    assert(variable1.length === variable1NumSamples.length);
    assert(variable2.length === variable2NumSamples.length);

    const result: BenchmarkResult = {
        name,
        variable1Name,
        variable1,
        variable1NumSamples,
        variable2Name,
        variable2,
        variable2NumSamples,
        measurements: Array(variable1.length * variable2.length).fill(0).map(() => newMeasurement()),
    }
    report.results.push(result);
    return result;
}

function runRenderingBenchmark(
    res: BenchmarkResult, 
    renderFn: (c: ImCache, var1: number) => void,
    root: HTMLElement,
) {

    const timer = newTimer();

    res.variable1.forEach((rows, rowsIdx) => {
        const numSamples = res.variable1NumSamples[rowsIdx];
        assert(numSamples !== undefined);

        for (let sample = 0; sample < numSamples; sample++) {
            // new cache for each rows config
            const c: ImCache = [];
            root.replaceChildren();

            getTime(timer);
            res.variable2.forEach((render, renderIdx) => {
                const numSamples = res.variable2NumSamples[renderIdx];
                assert(numSamples !== undefined);

                for (let sample = 0; sample < numSamples; sample++) {
                    renderFn(c, rows);
                    pushBenchmarkResult(res, rowsIdx, renderIdx, getTime(timer));
                }
            });
        }
    });
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
    imSubheadingBegin(c); imdom.Str(c, "Results"); imSubheadingEnd(c);

    imdom.Str(c, "Currently on"); imdom.Str(c, getUserAgentString());

    let regressions = 0;

    imui.Begin(c, BLOCK); {

        imui.Begin(c, BLOCK); {
            if (im.If(c) && results === previousResults) {
                imdom.Str(c, "NOTE: viewing previous results");
            } im.IfEnd(c);
        } imui.End(c);

        im.For(c); for (const res of results) {
            im.KeyedBegin(c, res); {
                let resState; resState = im.GetInline(c, im.GetInline);
                if (!resState) {
                    const prevResult = getPreviousResult(res);
                    resState = im.Set(c, { prevResult });
                }

                regressions += imBenchmarkResultsViewer(c, res, resState.prevResult);
            } im.KeyedEnd(c);
        } im.ForEnd(c);

        // TODO: view results for other user agents.

        imdom.Str(c, "Regressions: ");
        imdom.Str(c, regressions);

        if (imButtonIsClicked(c, "Copy to clipboard")) {
            const code = `[${JSON.stringify(getUserAgentString())} as UserAgentString]: ${JSON.stringify(results)},`;
            navigator.clipboard.writeText(code);
        }

        // Previous results
        {
            const prevResultsState = im.GetInline(c, imBenchmarkReportViewer) ??
                im.Set(c, { currentUserAgent: Object.keys(previousResultsByUserAgent)[0] });

            imSubheadingBegin(c); imdom.Str(c, "Previous results"); imSubheadingEnd(c);

            imui.Begin(c, ROW); imui.FlexWrap(c); {
                im.For(c); for (const userAgent in previousResultsByUserAgent) {
                    if (imButtonIsClicked(c, userAgent, prevResultsState.currentUserAgent === userAgent)) {
                        prevResultsState.currentUserAgent = userAgent;
                    }
                } im.ForEnd(c);
            } imui.End(c);

            im.Switch(c, prevResultsState.currentUserAgent); {
                const prevResults = previousResultsByUserAgent[prevResultsState.currentUserAgent as UserAgentString];
                im.For(c); for (const result of prevResults) {
                    imBenchmarkResultsViewer(c, result, undefined);
                } im.ForEnd(c);
            } im.SwitchEnd(c);
        }
    } imui.End(c);
}

function imBenchmarkResultsViewer(c: ImCache, res: BenchmarkResult, resPrev: BenchmarkResult | undefined) {
    imTableCellBegin(c, CENTER, CELL_BOLD); {
        imdom.Str(c, res.name);
    } imTableCellEnd(c);

    let regressions = 0;

    imui.Begin(c, BLOCK); {
        if (im.IsFirstRender(c)) {
            imdom.setStyle(c, "display", "grid");
            imdom.setStyle(c, "gap", "1px");
            imdom.setStyle(c, "padding", "1px");
            imdom.setStyle(c, "backgroundColor", cssVars.fg);
        }

        if (im.Memo(c, res.variable2.length)) {
            imdom.setStyle(c, "gridTemplateColumns", "1fr ".repeat(res.variable2.length + 1));
        }

        imTableCellBegin(c, CENTER, CELL_BOLD); imdom.Str(c, "↓" + res.variable1Name + " x " + res.variable2Name + "->"); imui.End(c);
        im.For(c); for (const v2 of res.variable2) {
            imTableCellBegin(c, CENTER, CELL_BOLD); imdom.Str(c, v2); imui.End(c);
        } im.ForEnd(c);


        im.For(c); for (let v1Idx = 0; v1Idx < res.variable1.length; v1Idx++) {
            imTableCellBegin(c, CENTER, CELL_BOLD); imdom.Str(c, res.variable1[v1Idx]); imui.End(c);

            im.For(c); for (let v2Idx = 0; v2Idx < res.variable2.length; v2Idx++) {
                imTableCellBegin(c, CENTER); {
                    const thisMeasurement = getBenchmarkMeasurement(res, v1Idx, v2Idx);
                    const prevResult = !resPrev ? thisMeasurement :
                        getBenchmarkMeasurement(resPrev, v1Idx, v2Idx);

                    let measurementState; measurementState = im.GetInline(c, im.GetInline);
                    if (!measurementState) {
                        const mean = computeMean(thisMeasurement);
                        const tolerance = computeStandardDeviation(thisMeasurement, mean);

                        const meanPrev = computeMean(prevResult);
                        const tolerancePrev = computeStandardDeviation(prevResult, meanPrev);

                        measurementState = im.Set(c, {
                            mean,
                            meanPrev,
                            tolerance,
                            tolerancePrev,
                        });
                    }

                    const split = measurementState.mean - measurementState.meanPrev;

                    imdom.Str(c, measurementState.mean.toFixed(0));
                    imdom.Str(c, " +/- ");
                    imdom.Str(c, measurementState.tolerance.toFixed(0));
                    imdom.Str(c, " x");
                    imdom.Str(c, thisMeasurement.values.length);

                    imui.Begin(c, INLINE); {
                        if (im.If(c) && resPrev && split !== 0) {

                            const withinTolerance = Math.abs(split) < measurementState.tolerancePrev;

                            imui.Fg(c, withinTolerance ? "" : split < 0 ? "rgb(0, 180, 0)" : "rgb(255, 0, 0)");

                            imdom.Str(c, " (");
                            imdom.Str(c, split < 0 ? "-" : "+");
                            imdom.Str(c, Math.abs(split).toFixed(0));
                            imdom.Str(c, "ms");

                            imdom.Str(c, withinTolerance ? " (ok)" : split < 0 ? "(good)" : "(bad)");

                            if (!withinTolerance && split > 0) {
                                regressions++
                            }

                            imdom.Str(c, ")");
                        } im.IfEnd(c);
                    } imui.End(c);
                } imui.End(c);
            } im.ForEnd(c);
        } im.ForEnd(c);
    } imui.End(c);

    // xd
    return regressions;
}
