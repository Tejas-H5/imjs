import { COL, cssVars, EM, imAlign, imAspectRatio, imButtonIsClicked, imExtraDiagnosticInfo, imFixed, imFlex, imFpsCounterSimple, imLayoutBegin, imLayoutEnd, imRelative, imSize, imSliderInput, NA, PERCENT, PX, ROW } from "src/utils/im-ui";
import {
    getCurrentCacheEntries,
    getDeltaTimeSeconds,
    getEntriesIsInConditionalPathway,
    getEntriesRemoveLevel,
    getFpsCounterState,
    getStackLength,
    ImCache,
    imCacheBegin,
    imCacheEnd,
    imFor,
    imForEnd,
    imGet,
    imGetInline,
    imIf,
    imIfElse,
    imIfEnd,
    imMemo,
    imSet,
    imSwitch,
    imSwitchEnd,
    imTry,
    imTryCatch,
    imTryEnd,
    inlineTypeId,
    isEventRerender,
    isFirstishRender,
    markNeedsRererender
} from "../utils/im-core";
import {
    attrsSet,
    classesSet,
    EL_BUTTON,
    EL_DIV,
    EL_H1,
    EL_H3,
    EL_INPUT,
    EL_LABEL,
    EL_SPAN,
    elHasMouseOver,
    elHasMousePress,
    elSetAttr,
    elSetStyle,
    getGlobalEventSystem,
    imDomRootBegin,
    imDomRootEnd,
    imElBegin,
    imElEnd,
    imGlobalEventSystemBegin,
    imGlobalEventSystemEnd,
    imStr,
    stylesSet
} from "../utils/im-dom";
import { imVisualTestHarness, newVisualTest, VisualTest } from "src/utils/im-ui/visual-testing-harness";

let toggleA = false;
let toggleB = false;

const changeEvents: string[] = [];

let currentExample = 2;
let numAnimations = 0;

let rerenders = 0;

function imExamples(c: ImCache) {
    imElBegin(c, EL_DIV); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "display", "flex");
            elSetStyle(c, "gap", "10px");
        }

        if (imButtonIsClicked(c, "Conditional rendering, memo, array block", currentExample === 0)) {
            currentExample = 0;
        }
        if (imButtonIsClicked(c, "Error boundaries", currentExample === 1)) {
            currentExample = 1;
        }
        if (imButtonIsClicked(c, "Realtime rendering", currentExample === 2)) {
            currentExample = 2;
        }
        if (imButtonIsClicked(c, "Tree view example", currentExample === 3)) {
            currentExample = 3;
        }
    } imElEnd(c, EL_DIV);

    imDivider(c);

    // TODO: convert these into automated tests
    imSwitch(c, currentExample); switch (currentExample) {
        case 0: imMemoExampleView(c); break;
        case 1: imErrorBoundaryExampleView(c); break;
        case 2: imRealtimeExampleView(c); break;
        case 3: imTreeExampleView(c); break;
    } imSwitchEnd(c);

    imLayoutBegin(c, ROW); imFixed(c, 0, NA, 0, PX, 0, PX, 0, PX); {
        imElBegin(c, EL_DIV); {
            if (isFirstishRender(c)) {
                elSetStyle(c, "flex", "1");
            }
        } imElEnd(c, EL_DIV);

        imElBegin(c, EL_DIV); {
            imStr(c, "[" + rerenders + " rerenders ]");
        } imElEnd(c, EL_DIV);

        imElBegin(c, EL_DIV); {
            imStr(c, "[" + getStackLength(c) + " stack size ]");
        } imElEnd(c, EL_DIV);

        imElBegin(c, EL_DIV); {
            imStr(c, "[" + numAnimations + " animations in progress ]");
        } imElEnd(c, EL_DIV);

        imLayoutBegin(c, ROW); {
            imStr(c, "[");
            const fps = getFpsCounterState(c);
            imFpsCounterSimple(c, fps);
            imExtraDiagnosticInfo(c, true);
            imStr(c, "]");
        } imLayoutEnd(c);
    } imLayoutEnd(c);
}

const tests: VisualTest[] = [
    newVisualTest("imMemo example", imMemoExampleView),
];

export function imExampleMain(c: ImCache) {
    rerenders++;

    imCacheBegin(c, imExampleMain); {
        imDomRootBegin(c, document.body); {
            const ev = imGlobalEventSystemBegin(c); {
                imLayoutBegin(c, COL); imFixed(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                    imVisualTestHarness(c, tests);
                } imLayoutEnd(c);
            } imGlobalEventSystemEnd(c, ev);
        } imDomRootEnd(c, document.body);
    } imCacheEnd(c);
}


function imMemoExampleView(c: ImCache) {
    imElBegin(c, EL_H1); {
        imStr(c, "Im memo changes");
    } imElEnd(c, EL_H1);

    let i = 0;
    imFor(c); for (const change of changeEvents) {
        imElBegin(c, EL_DIV); {
            imStr(c, i++);
            imStr(c, ":");
            imStr(c, change);
        } imElEnd(c, EL_DIV);
    } imForEnd(c);

    imDivider(c);

    imElBegin(c, EL_DIV); { imStr(c, `toggleA: ${toggleA}, toggleB: ${toggleB}`); } imElEnd(c, EL_DIV);
    imElBegin(c, EL_DIV); { imStr(c, `expected: ${toggleA ? (toggleB ? "A" : "B") : (toggleB ? "C" : "D")}`); } imElEnd(c, EL_DIV);

    if (imIf(c) && toggleA) {
        if (imIf(c) && toggleB) {
            if (imIf(c) && toggleB) {
                if (imMemo(c, toggleB)) {
                    changeEvents.push("A");
                }

                imElBegin(c, EL_DIV); imStr(c, "A"); imElEnd(c, EL_DIV);
            } imIfEnd(c);
        } else {
            imIfElse(c);

            if (imMemo(c, toggleB)) {
                changeEvents.push("B");
            }

            imElBegin(c, EL_DIV); imStr(c, "B"); imElEnd(c, EL_DIV);
        } imIfEnd(c);
    } else {
        imIfElse(c);
        if (imIf(c) && toggleB) {
            if (imMemo(c, toggleB)) {
                changeEvents.push("C");
            }

            imElBegin(c, EL_DIV); imStr(c, "C"); imElEnd(c, EL_DIV);
        } else {
            imIfElse(c);

            if (imMemo(c, toggleB)) {
                changeEvents.push("D");
            }

            imElBegin(c, EL_DIV); imStr(c, "D"); imElEnd(c, EL_DIV);
        } imIfEnd(c);
    } imIfEnd(c);
    imElBegin(c, EL_DIV); {
        imStr(c, "Bro");
        imStr(c, "!");
    } imElEnd(c, EL_DIV);
}

function imErrorBoundaryExampleView(c: ImCache) {
    imElBegin(c, EL_H1); imStr(c, "Error boundary example"); imElEnd(c, EL_H1);

    imDivider(c);

    imElBegin(c, EL_DIV); {
        const tryState = imTry(c); try {
            const { err, recover } = tryState;

            if (imIf(c) && err) {
                imElBegin(c, EL_DIV); imStr(c, "Your component encountered an error:"); imElEnd(c, EL_DIV);
                imElBegin(c, EL_DIV); imStr(c, err); imElEnd(c, EL_DIV);
                // Why don't we do this for the root of the program xDD)"); imElEnd(c, EL_DIV);

                imButton(c); {
                    imStr(c, "<Undo>");
                    if (elHasMousePress(c)) {
                        recover();
                    }
                } imButtonEnd(c);
            } else {
                imIfElse(c);

                imButton(c); {
                    imStr(c, "Red button (use your imagination for this one, apologies)");
                    if (elHasMousePress(c)) {
                        throw new Error("nooo your not supposed to actually press it! You have now initiated the eventual heat-death of the universe.");
                    }
                } imButtonEnd(c);
            } imIfEnd(c);
        } catch (err) {
            imTryCatch(c, tryState, err);
        } imTryEnd(c, tryState);
    } imElEnd(c, EL_DIV);
}

function imRealtimeExampleView(c: ImCache) {
    let currentExampleState; currentExampleState = imGet(c, imDivider);
    if (!currentExampleState) {
        currentExampleState = imSet(c, { example: 1 })
    }

    imElBegin(c, EL_DIV); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "display", "flex");
            elSetStyle(c, "gap", "10px");
        }

        if (imButtonIsClicked(c, "Sine waves", currentExampleState.example === 0)) {
            currentExampleState.example = 0;
        }
        if (imButtonIsClicked(c, "Lots of things", currentExampleState.example === 1)) {
            currentExampleState.example = 1;
        }
    } imElEnd(c, EL_DIV);

    imDivider(c);

    imElBegin(c, EL_DIV); {
        const SIZE = 1;

        let state; state = imGet(c, imRealtimeExampleView);
        if (!state) {
            const val = {
                renderTime: 0,
                isAnimating: false,
                rerenders: 0,
                itemsIterated: 0,
                t: 0,
            };
            state = imSet(c, val);
        }

        imElBegin(c, EL_DIV); {
            imSwitch(c, currentExampleState.example); switch (currentExampleState.example) {
                case 0: {
                    imElBegin(c, EL_H1); imStr(c, "Snake sine thing idx"); imElEnd(c, EL_H1);

                    imDivider(c);

                    const NUM = 500 / SIZE;
                    for (let i = 0; i < NUM; i++) {
                        pingPong(c, getDeltaTimeSeconds(c) * i / NUM, 100, state.t);
                    }
                } break;
                case 1: {
                    imOldRandomStuffExampleApplication(c, getDeltaTimeSeconds(c));
                } break;
            } imSwitchEnd(c);
        } imElEnd(c, EL_DIV);
    } imElEnd(c, EL_DIV);
}

function pingPong(c: ImCache, phase: number, size: number, t: number) {
    imElBegin(c, EL_DIV); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "height", size + "px");
            elSetStyle(c, "position", "relative");
        }

        imElBegin(c, EL_DIV); {
            if (isFirstishRender(c)) {
                elSetStyle(c, "backgroundColor", "black");
                elSetStyle(c, "backgroundColor", "black");
                elSetStyle(c, "position", "absolute");
                elSetStyle(c, "top", "0");
                elSetStyle(c, "bottom", "0");
                elSetStyle(c, "aspectRatio", "10 / 1");
            }

            const pingPong = 0.5 * (1 + Math.sin((1 * ((t / 1000) + phase)) % (2 * Math.PI)));
            elSetStyle(c, "left", "calc(" + (pingPong * 100) + "% - " + size * 10 * (pingPong) + "px)");
        } imElEnd(c, EL_DIV);

    } imElEnd(c, EL_DIV);
};

function imOldRandomStuffExampleApplication(c: ImCache, t: number) {
    let gridState = imGet(c, newGridState);
    if (!gridState) gridState = imSet(c, newGridState());

    imElBegin(c, EL_H1); {
        imStr(c, "Rendering ");
        imStr(c, gridState.gridRows);
        imStr(c, " rows x ");
        imStr(c, gridState.gridCols);
        imStr(c, " cols = ~");
        imStr(c, gridState.gridRows * gridState.gridCols);
        imStr(c, " DOM nodes, excluding the UI around it");
    } imElEnd(c, EL_H1);

    const target = imGetInline(c, imOldRandomStuffExampleApplication) ?? imSet(c, {
        budgetMsLower: 4,
    });
    const budgetMsUpper = target.budgetMsLower + 1;

    imLayoutBegin(c, ROW); imAlign(c); {
        imElBegin(c, EL_H3); imSize(c, 200, PX, 0, NA); {
            imStr(c, "frame budget: ");
            imStr(c, target.budgetMsLower);
            imStr(c, "ms ");
        } imElEnd(c, EL_H3);

        imLayoutBegin(c, ROW); imSize(c, 0, NA, 2, EM); imFlex(c); {
            target.budgetMsLower = imSliderInput(c, 4, 16, 0.5, target.budgetMsLower);
        } imLayoutEnd(c);
    } imLayoutEnd(c);

    imDivider(c);

    const tryState = imTry(c); try {
        const { err, recover } = tryState;
        if (imIf(c) && !err) {
            imElBegin(c, EL_DIV); {
                if (isFirstishRender(c)) {
                    elSetStyle(c, "display", "flex");
                    elSetStyle(c, "height", "4em");
                }

                const n = 20;
                let pingPong; pingPong = imGet(c, inlineTypeId(imElBegin));
                if (!pingPong) pingPong = imSet(c, { pos: 0, dir: 1 });

                if (pingPong.pos === 0) {
                    pingPong.dir = 1;
                } else if (pingPong.pos === n) {
                    pingPong.dir = -1;
                }
                if (pingPong.pos < n || pingPong.pos > 0) {
                    pingPong.pos += pingPong.dir;
                }

                imFor(c); for (let i = 0; i <= n; i++) {
                    imElBegin(c, EL_DIV); {
                        if (isFirstishRender(c)) {
                            elSetStyle(c, "flex", "1");
                            elSetStyle(c, "height", "100%");
                        }

                        const present = i === pingPong.pos;
                        const changed = imMemo(c, present);
                        if (changed) {
                            // elSetStyle(c, "backgroundColor", present ? "#000" : "#FFF");
                        }
                    } imElEnd(c, EL_DIV);
                } imForEnd(c);
            } imElEnd(c, EL_DIV);


            const dt = getDeltaTimeSeconds(c); 0.03;


            const fps = getFpsCounterState(c);
            // Let's see how many things we can render in 4 to 5 ms
            if (fps.renderMs > budgetMsUpper) {
                resize(gridState, gridState.gridRows - 1, gridState.gridCols);
            } else if (fps.renderMs < target.budgetMsLower) {
                resize(gridState, gridState.gridRows + 1, gridState.gridCols);
            }

            const { values, gridRows: gridRowsState, gridCols } = gridState;
            const gridRows = Math.floor(gridRowsState / 10) * 10;

            if (!isEventRerender(c)) {
                for (let i = 0; i < 10; i++) {
                    const randomRow = Math.floor(Math.random() * gridRows);
                    const randomCol = Math.floor(Math.random() * gridCols);
                    const cell = gridState.values[randomRow * gridCols + randomCol];
                    cell.signal = 1;
                    cell.col = cssVars.fg;
                }
            }

            // Normally would use flex-wrap here. But we want to test the performance of double-list

            imFor(c); for (let row = 0; row < gridRows; row++) {
                imElBegin(c, EL_DIV); {
                    if (isFirstishRender(c)) {
                        elSetAttr(c, "style", "display: flex;");
                    }

                    imFor(c); for (let col = 0; col < gridCols; col++) {
                        imElBegin(c, EL_DIV); imRelative(c); imSize(c, 50, PX, 50, PX); imAspectRatio(c, 1, 1); {
                            const idx = col + gridCols * row;

                            if (isFirstishRender(c))        elSetStyle(c, "display", " inline-block");
                            if (imMemo(c, values[idx].col)) elSetStyle(c, "backgroundColor", values[idx].col);

                            if (elHasMouseOver(c)) {
                                values[idx].signal = 1;
                                values[idx].col = "blue";
                            }

                            // NOTE: usually you would do this with a CSS transition if you cared about performance, but
                            // I'm just trying out some random stuff.
                            let val = values[idx].signal;
                            if (val > 0) {
                                val -= dt;
                                if (val < 0) {
                                    val = 0;
                                }
                                values[idx].signal = val;
                            }

                            const valRounded = Math.round(val * 255) / 255;
                            const styleChanged = imMemo(c, valRounded);
                            if (styleChanged) {
                                elSetStyle(c, "opacity", "" + valRounded);
                            }

                            imElBegin(c, EL_DIV); {
                                if (isFirstishRender(c)) {
                                    elSetStyle(c, "position", "absolute");
                                    elSetStyle(c, "top", "25%");
                                    elSetStyle(c, "left", "25%");
                                    elSetStyle(c, "right", "25%");
                                    elSetStyle(c, "bottom", "25%");
                                    elSetStyle(c, "backgroundColor", "white");
                                }
                            } imElEnd(c, EL_DIV);
                        } imElEnd(c, EL_DIV);
                    } imForEnd(c);
                } imElEnd(c, EL_DIV);
            } imForEnd(c);
        } else {
            imIfElse(c);

            imElBegin(c, EL_DIV); {
                if (isFirstishRender(c)) {
                    elSetAttr(c, "style", `display: absolute;top:0;bottom:0;left:0;right:0;`);
                }

                imElBegin(c, EL_DIV); {
                    if (isFirstishRender(c)) {
                        elSetAttr(c, "style", `display: flex; flex-direction: column; align-items: center; justify-content: center;`);
                    }

                    imElBegin(c, EL_DIV); {
                        imStr(c, "An error occured: " + err);
                    }
                    imElEnd(c, EL_DIV);
                    imElBegin(c, EL_DIV); {
                        imStr(c, "Click below to retry.")
                    }
                    imElEnd(c, EL_DIV);
                } imElEnd(c, EL_DIV);
            } imElEnd(c, EL_DIV);
        } imIfEnd(c);
    } catch (err) {
        imTryCatch(c, tryState, err);

        console.error(err);
    } imTryEnd(c, tryState);
}


type TreeNode = {
    value: string;
    children: TreeNode[];
    selectedIdx: number;
    parent: TreeNode | null;
};

function newTreeNode(
    value: string,
    children: TreeNode[],
    parent: TreeNode | null = null
): TreeNode {
    const node: TreeNode = { value, children, selectedIdx: 0, parent };
    for (const child of children) {
        child.parent = node;
    }

    return node;
}

function imTreeNodeView(c: ImCache, n: TreeNode, selected: TreeNode | null, depth: number) {
    const isSelected = n === selected;

    imElBegin(c, EL_DIV); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "display", "flex");
        }

        imElBegin(c, EL_DIV); {
            if (imMemo(c, depth)) {
                elSetStyle(c, "width", (50 * depth) + "px");
            }
        } imElEnd(c, EL_DIV);


        imElBegin(c, EL_DIV); {
            if (imMemo(c, isSelected)) {
                elSetStyle(c, "width", "3ch");
                elSetStyle(c, "textAlign", "center");
                elSetStyle(c, "opacity", isSelected ? "1" : "0");
            }

            imStr(c, ">");

        } imElEnd(c, EL_DIV);

        imElBegin(c, EL_DIV); {
            imStr(c, n.value);

            imElBegin(c, EL_SPAN); {
                if (imMemo(c, isSelected)) {
                    elSetStyle(c, "display", "inline-block");
                    elSetStyle(c, "width", "3px");
                    elSetStyle(c, "height", "1em");
                    elSetStyle(c, "transform", "translate(0, 0.15em)");
                    elSetStyle(c, "backgroundColor", isSelected ? "black" : "");
                }
            } imElEnd(c, EL_SPAN);
        } imElEnd(c, EL_DIV);
    } imElEnd(c, EL_DIV);

    imFor(c); for (const child of n.children) {
        imTreeNodeView(c, child, selected, depth + 1);
    } imForEnd(c);
}

function imTreeExampleView(c: ImCache) {
    imElBegin(c, EL_H1); imStr(c, "Tree viewer example"); imElEnd(c, EL_H1);

    imDivider(c);

    let state; state = imGet(c, inlineTypeId(imTreeExampleView));
    if (!state) {
        state = imSet<{
            tree: TreeNode; 
            selected: TreeNode | null;
        }>(c, {
            tree: newTreeNode("TODO", [
                newTreeNode("Immediate mode framework rewrite 4", [
                    newTreeNode("Port to ODIN, use __LINE_ and __FILE__ instead of type ids", []),
                    newTreeNode("Figure out how to make web-assembly also work with the single-html-page paradigm", []),
                ]),
                newTreeNode("Make some actual websites", [
                    newTreeNode("Finish programming language + debugger + text editor + visualizers", []),
                    newTreeNode("Finish note tree", [
                        newTreeNode("Rewrite to new framework", [
                            newTreeNode("Wow bro. you're so productive", [])
                        ]),
                    ]),
                    newTreeNode("Finish rhythm game", [
                        newTreeNode("Rewrite to new framework", []),
                        newTreeNode("Learn how to actually play the game", []),
                    ]),
                ])
            ]),
            selected: null,
        });

        if (state.selected === null) {
            state.selected = state.tree;
        }
    }

    const keyDown = getGlobalEventSystem().keyboard.keyDown

    if (keyDown) {
        if (state.selected) {
            const parent = state.selected.parent;
            if (parent !== null) {
                parent.selectedIdx = parent.children.indexOf(state.selected);
            }


            if (
                parent !== null &&
                parent.selectedIdx > 0 &&
                keyDown.key === "ArrowUp"
            ) {
                parent.selectedIdx--;
                state.selected = parent.children[parent.selectedIdx];
            } else if (
                parent !== null &&
                parent.selectedIdx < parent.children.length - 1 &&
                keyDown.key === "ArrowDown"
            ) {
                parent.selectedIdx++;
                state.selected = parent.children[parent.selectedIdx];
            } else if (
                parent !== null &&
                keyDown.key === "ArrowLeft"
            ) {
                state.selected = parent;
            } else if (
                state.selected.children.length > 0 &&
                keyDown.key === "ArrowRight"
            ) {
                const idx = state.selected.selectedIdx;
                if (idx >= 0 && idx < state.selected.children.length) {
                    state.selected = state.selected.children[idx];
                } else {
                    state.selected.selectedIdx = 0;
                    state.selected = state.selected.children[0];
                }
            } else if (keyDown.key.length === 1) { 
                const letterTyped = keyDown.key;
                if (letterTyped === "\b") {
                    state.selected.value = state.selected.value.substring(0, state.selected.value.length - 1);
                } else {
                    state.selected.value += letterTyped;
                }
            } else if (parent !== null && keyDown.shiftKey && keyDown.key === "Enter") {
                let idx = parent.selectedIdx;
                if (idx < 0 || idx >= parent.children.length) {
                    idx = 0;
                }

                const newEntry = newTreeNode("New entry", [], parent);
                parent.children.splice(idx + 1, 0, newEntry);
                state.selected = newEntry;
            }
        }
    }

    imElBegin(c, EL_DIV); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "fontFamily", "monospace");
            elSetStyle(c, "fontSize", "30px");
            elSetStyle(c, "whiteSpace", "pre-wrap");
        }

        imTreeNodeView(c, state.tree, state.selected, 0);
    } imElEnd(c, EL_DIV);
}


function imSlider(c: ImCache, labelText: string): number | null {
    let result: number | null = null;

    const root = imElBegin(c, EL_DIV); {
        imElBegin(c, EL_LABEL); {
            if (imMemo(c, labelText)) elSetAttr(c, "for", labelText);
            imStr(c, labelText);
        }; imElEnd(c, EL_LABEL);
        const input = imElBegin(c, EL_INPUT); {
            if (isFirstishRender(c)) {
                elSetAttr(c, "width", "1000px");
                elSetAttr(c, "type", "range");
                elSetAttr(c, "min", "1");
                elSetAttr(c, "max", "300");
                elSetAttr(c, "step", "1");
            }

            if (imMemo(c, labelText)) elSetAttr(c, "name", labelText)
            if (imMemo(c, input.root.value)) result = input.root.valueAsNumber;
        } imElEnd(c, EL_INPUT);
    } imElEnd(c, EL_DIV);

    return result;
}

function resize(grid: GridState, rows: number, cols: number) {
    if (rows <= 0) return;
    if (cols <= 0) return;

    grid.gridRows = rows;
    grid.gridCols = cols;

    let lastLen = grid.values.length;
    grid.values.length = rows * cols;

    if (grid.values.length < lastLen) return;
    for (let i = lastLen; i < grid.values.length; i++) {
        grid.values[i] = { signal: 0, col: cssVars.fg };
    }
}


type GridState = {
    gridRows: number;
    gridCols: number;
    values: { signal: number, col: string; }[];
}

function newGridState(): GridState {
    const s: GridState = {
        gridRows: 0,
        gridCols: 0,
        values: [],
    };

    resize(s, 10, 20);
    return s;
}

function imButton(c: ImCache) {
    return imElBegin(c, EL_BUTTON);
}

function imButtonWasClicked(c: ImCache, text: string): boolean {
    let result = false;

    imButton(c); {
        imStr(c, text);
        if (elHasMousePress(c)) result = true;
    } imButtonEnd(c);

    return result;
}

function imButtonEnd(c: ImCache) {
    imElEnd(c, EL_BUTTON);
}
function imDivider(c: ImCache) {
    imElBegin(c, EL_DIV); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "height", "2px");
            elSetStyle(c, "backgroundColor", "black");
        }
    } imElEnd(c, EL_DIV);
}

