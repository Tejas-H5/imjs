import { BLOCK, COL, cssVars, EM, END, imAlign, imAspectRatio, imBg, imButtonIsClicked, imCheckbox, imFg, imFixed, imFlex, imGap, imJustify, imLayoutBegin, imLayoutBeginInternal, imLayoutEnd, imRelative, imSize, imSliderInput, LEFT, lerp01, NA, newCssBuilder, PERCENT, PX, ROW } from "src/utils/im-ui";
import { imVisualTestHarness, imVisualTestInstallation, newVisualTest, VisualTest } from "src/utils/im-ui/visual-testing-harness";
import {
    getCurrentCacheEntries,
    getDeltaTimeSeconds,
    getFpsCounterState,
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
    imKeyedBegin,
    imKeyedEnd,
    imMemo,
    imSet,
    imSwitch,
    imSwitchEnd,
    imTry,
    imTryCatch,
    imTryEnd,
    inlineTypeId,
    isEventRerender,
    isFirstishRender
} from "../utils/im-core";
import {
    EL_BUTTON,
    EL_DIV,
    EL_H1,
    EL_H2,
    EL_H3,
    EL_INPUT,
    EL_LABEL,
    EL_LI,
    EL_P,
    EL_SPAN,
    EL_UL,
    elHasMouseClick,
    elHasMouseOver,
    elHasMousePress,
    elSetAttr,
    elSetClass,
    elSetStyle,
    getGlobalEventSystem,
    imDomRootBegin,
    imDomRootEnd,
    imElBegin,
    imElEnd,
    imGlobalEventSystemBegin,
    imGlobalEventSystemEnd,
    imStr
} from "../utils/im-dom";

const brb = newCssBuilder()
    .cn(`brb`, [
        `:hover { cursor: pointer; }`
    ])

function imBigRedButton(c: ImCache) {
    const s = imGetInline(c, imBigRedButton) ?? imSet(c, {
        c1: false, c2: false, c3: false,
        c4: false, c5: false, c6: false,
    });

    imLayoutBegin(c, ROW); imJustify(c);  {
        imLayoutBegin(c, COL); imAlign(c, END); imJustify(c); imSize(c, 0, NA, 300, PX); imGap(c, 10, PX); imFlex(c); {
            imLayoutBegin(c, ROW); imJustify(c, END); imAlign(c); imGap(c, 10, PX); {
                imStr(c, "Approval from Sarge");
                const ev = imCheckbox(c, s.c1);
                if (ev) s.c1 = ev.checked;
            } imLayoutEnd(c);

            imLayoutBegin(c, ROW); imJustify(c, END); imAlign(c); imGap(c, 10, PX); {
                imStr(c, "Approval from Master Chief");
                const ev = imCheckbox(c, s.c2);
                if (ev) s.c2 = ev.checked;
            } imLayoutEnd(c);

            imLayoutBegin(c, ROW); imJustify(c, END); imAlign(c); imGap(c, 10, PX); {
                imStr(c, "Approval from POTUS");
                const ev = imCheckbox(c, s.c3);
                if (ev) s.c3 = ev.checked;
            } imLayoutEnd(c);
        } imLayoutEnd(c);

        imLayoutBegin(c, COL); imAlign(c); imJustify(c); imSize(c, 0, NA, 300, PX); {
            imLayoutBegin(c, ROW); imAspectRatio(c, 1, 1); imSize(c, 0, NA, 100, PERCENT); imAlign(c); imJustify(c); {
                const animState = imGetInline(c, imBigRedButton) ?? imSet(c, {
                    t: 0,
                    presses: 0,
                    radialGradient: 50,
                });

                if (imMemo(c, animState.radialGradient)) {
                    elSetStyle(
                        c,
                        "background",
                        `radial-gradient(circle at center, red, transparent ${animState.radialGradient}% `
                    );
                }

                imButton(c); {
                    if (isFirstishRender(c)) {
                        elSetStyle(c, "fontSize", "40px");
                        elSetStyle(c, "borderRadius", "1000px");
                        elSetStyle(c, "aspectRatio", "1/1");
                        elSetStyle(c, "padding", "40px");
                    }

                    const blinkPhaseOn = Math.floor(animState.t * 3) % 2 === 1;
                    const armed =
                        s.c1 &&
                        s.c2 &&
                        s.c3 &&
                        s.c4 &&
                        s.c5 &&
                        s.c6;

                    const col = armed ? "#990000" : "#999999";

                    if (imMemo(c, armed)) {
                        elSetClass(c, brb, armed);
                    }

                    imBg(c, col);

                    if (blinkPhaseOn || armed) {
                        animState.t += getDeltaTimeSeconds(c);
                        animState.radialGradient = lerp01(animState.radialGradient, 70, 10 * getDeltaTimeSeconds(c));
                    } else if (!armed && !blinkPhaseOn) {
                        animState.t = 0;
                        animState.radialGradient = lerp01(animState.radialGradient, 40, 10 * getDeltaTimeSeconds(c));
                    }

                    imLayoutBegin(c, ROW); imSize(c, 100, PX, 100, PX); imAlign(c); imJustify(c); {
                        if (isFirstishRender(c)) {
                            elSetStyle(c, "padding", "10px");
                            elSetStyle(c, "backgroundColor", "white");
                        }

                        imLayoutBegin(c, BLOCK); imSize(c, 20, PX, 20, PX); {
                            if (isFirstishRender(c)) elSetStyle(c, "padding", "10px");
                            imBg(c, blinkPhaseOn ? "#FF0000" : col);
                        } imLayoutEnd(c);
                    } imLayoutEnd(c);

                    if (armed && elHasMouseClick(c)) {
                        animState.presses++;
                        if (animState.presses < 10) {
                            // Maybe 'recover()' is not such a good idea in all cases ...
                            throw new Error(
                                "Error when requesting POST /prometheon/gigaanuke?target=everything&priority=highest - " +
                                "503 Service Unavailable - please try again"
                            );
                        } else {
                            throw new Error(
                                "Error when requesting POST /prometheon/gigaanuke?target=everything&priority=highest - " +
                                "503 Service Unavailable - all giganukes have already been fired. The world is about to end soon - it's back to rock carvings for you!"
                            );
                        }
                    }
                } imButtonEnd(c);
            } imLayoutEnd(c);
        } imLayoutEnd(c);

        imLayoutBegin(c, COL); imAlign(c, LEFT); imJustify(c); imSize(c, 0, NA, 300, PX); imGap(c, 10, PX); imFlex(c); {
            imLayoutBegin(c, ROW); imAlign(c); imGap(c, 10, PX); {
                const ev = imCheckbox(c, s.c4);
                if (ev) s.c4 = ev.checked;
                imStr(c, "I know what I am doing");
            } imLayoutEnd(c);

            imLayoutBegin(c, ROW); imAlign(c); imGap(c, 10, PX); {
                const ev = imCheckbox(c, s.c5);
                if (ev) s.c5 = ev.checked;
                imStr(c, "You sure you want to do this");
            } imLayoutEnd(c);

            imLayoutBegin(c, ROW); imAlign(c); imGap(c, 10, PX); {
                const ev = imCheckbox(c, s.c6);
                if (ev) s.c6 = ev.checked;
                imStr(c, "Final checkbox!! lets go");
            } imLayoutEnd(c);
        } imLayoutEnd(c);
    } imLayoutEnd(c);
}

function imErrorUiDismissedWasClicked(c: ImCache, err: any): boolean {
    imElBegin(c, EL_DIV); imStr(c, "Your component encountered an error:"); imElEnd(c, EL_DIV);
    imElBegin(c, EL_DIV); imStr(c, err); imElEnd(c, EL_DIV);

    return imButtonIsClicked(c, "Dismiss");
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

function imHeadingBegin(c: ImCache) {
    return imElBegin(c, EL_H1);
}
function imHeadingEnd(c: ImCache) {
    return imElEnd(c, EL_H1);
}

function imParaBegin(c: ImCache) {
    return imLayoutBegin(c, BLOCK);
}
function imParaEnd(c: ImCache) {
    return imLayoutEnd(c);
}

function imSubheadingBegin(c: ImCache) {
    return imElBegin(c, EL_H2);
}
function imSubheadingEnd(c: ImCache) {
    return imElEnd(c, EL_H2);
}

const tests: VisualTest[] = [
    newVisualTest(
        "State management",
        function imStateManagement(c: ImCache) {
            imHeadingBegin(c); imStr(c, "State management"); imHeadingEnd(c);

            imParaBegin(c); {
                imStr(c, 
                    `To understand how this framework actually works, the best place to start is actually state management.
                    The core framework has no knowledge of the DOM or any other tree-like structure - you'll need to use it in conjunction with 'im-dom' (or your own custom adapter for DOM or other structures).
                    The adapter methods will call imImmediateModeBlockBegin/imImmediateModeBlockEnd internally to create 'immediate mode blocks' - a region of code for a node in the tree that has it's own immediate mode state array that it can write to and read from.
                    User code should never need to call imImmediateModeBlockBegin/End directly.
                    Instead, most user code will be persisting state within the immediate mode cache tree using the The 'imGet' and 'imSet' methods.
                    imGet works by incrementing an internal index for the current immediate-mode block, and grabbing whatever state is at that index, or undefined. 
                    imSet works by setting the value at this internal index and then returning this value. 
                    The first ever call to imGet must always be followed by a call to imSet to set the initial state. 
                    You can call imSet again in subsequent renders if you need to update the state again, e.g in response to dependencies changing.
                    imGet`
                );
            } imParaEnd(c);

            imStr(c, "TODO: examples");
        },
    ),
    newVisualTest(
        "Control flow",
        function imControlFlowExamples(c: ImCache) {
            imHeadingBegin(c); imStr(c, "Control flow"); imHeadingEnd(c);

            imParaBegin(c); {
                imStr(c, "After reading the state management section, some of you may have noticed that the only way for imGet and imSet to actually work, is if components rendered the same things in the same order every single frame! (sounds kinda like React rule of hooks, doesn't it?) How, then, can we use this framework with things like if-statements, for-loops, and other language constructs?");
            } imParaEnd(c);

            imSubheadingBegin(c); imStr(c, "If-statements and for-loops"); imSubheadingEnd(c); { 
                imParaBegin(c); {
                    imStr(c,
                        `For starters, how do you conditionally render a particular block of immediate mode items?
You'll need to annotate your control flow to let the framework know which pathway in the code is currently being rendered.
For if-statements, you'll be using "imIf/imIfElse/imIfEnd". They do two things:`)

                    imElBegin(c, EL_UL); {
                        imElBegin(c, EL_LI); imStr(c, "Rather than rendering a dynamic numer of immediate mode entries, we are rendering 1 immediate mode block. This block is simply 1 unit of immediate-mode state, so imGet and imSet will work just fine."); imElEnd(c, EL_LI);
                        imElBegin(c, EL_LI); {
                            imStr(c, `If it recieves a call to "imIfElse" or "imIfEnd" before we add any more immediate-mode state entries, then the stuff we rendered there before can be removed.`);
                            imElBegin(c, EL_UL); {
                                imElBegin(c, EL_LI); {
                                    imStr(c, `(The actual act of removal, i.e domNode.remove() must be handled by the adapter. The framework just assumes the adapter has done it's job, and marks that block as having been removed)`);
                                } imElEnd(c, EL_LI);
                            } imElEnd(c, EL_UL);
                        } imElEnd(c, EL_LI);
                    } imElEnd(c, EL_UL);

                    imStr(c, `imFor acts similarly, except you can render an arbitrary amount of elements, as long as they are in the same order ever render (if you've been paying attention, you will know why the order matters, so I won't re-explain it here). You can do any kind of syncronous traversal - but for every index in the internal state entries, you must always render the same thing.`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imIfAndForExample);
            }

            imSubheadingBegin(c); imStr(c, "Switches, keyed lists"); imSubheadingEnd(c); {

                imParaBegin(c); {
                    imStr(c,
                        `imSwitch and imKeyedBegin/End are actually both the same thing under the hood, but are used in different contexts.
imSwitch can be used to route to the right view from within a hub component.
imKeyedBegin/End can be used in much the same way as the key="blah" prop in React. 
Except imKeyedBegin can directly accept object references as values. 
As a direct consequence of this API design choice, in order to avoid memory leaks, keyed items that aren't rendered in the subsequent frame do not just get removed - they, and all their children, are recursively destroyed.
The following example should demonstrate how they work, and give you an idea of when you might want to use imKeyed.
But in case it didn't: You should use it for basically any list item with it's own immediate mode state and a non-constant ordering.

A note on imSwitch - DO NOT USE FALLTHROUGH. 
If there are multiple keys mapping to the same case using fallthrough, the framework will still think it's two different routes.
You will end up getting an exact clone of the component with different state!
Very hard and confusing to debug, but not enough of a reason for me to remove imSwitch from the framework.`
                    );

                } imParaEnd(c);

                imVisualTestInstallation(c, imSwitchAndKeyedExample);
            }

            imSubheadingBegin(c); imStr(c, "Error boundaries, aka try-catch"); imSubheadingEnd(c); {
                imParaBegin(c); {
                    imStr(c, `Error boundaries can be implemented by simply annotating a try/catch block.
In general, you shouldn't use exceptions in your control flow. 
This only exists to allow a user to recover from an error being thrown that would have otherwise crashed the entire program.
It's useful to always have at least one error boundary at the very root, so that your app can transition to another view in case of an error. 
Without it, the website will appear the exact same - but none of the dynamic elements will work, because the animation loop has stopped running.`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imErrorBoundaryExampleView);
            }

        },
    ),
    newVisualTest(
        "Composability",
        function imControlFlowExamples(c: ImCache) {
            imStr(c, "TODO");
        }
    ),
    newVisualTest(
        "Animation",
        function imControlFlowExamples(c: ImCache) {
            imStr(c, "TODO");
        }
    ),
];

function imErrorBoundaryExampleView(c: ImCache) {
    const tryState = imTry(c); try {
        const { err, recover } = tryState;

        if (imIf(c) && err) {
            if (imErrorUiDismissedWasClicked(c, err)) {
                recover();
            }
        } else if (imIfElse(c)) { 
            imBigRedButton(c);
        } imIfEnd(c);
    } catch (err) {
        imTryCatch(c, tryState, err);
    } imTryEnd(c, tryState);
}


function imIfAndForExample(c: ImCache) {
    const { flags, hiddenMessage } = imGetInline(
        c,
        imIfAndForExample
    ) ?? imSet(c, {
        flags: [false],
        hiddenMessage: `Hello there, here's a hidden message for 
you to manually click! have fun. Or not.`.split(" "),
    });

    imLayoutBegin(c, ROW); {
        imFor(c); for (let i = 0; i < hiddenMessage.length; i++) {
            const chunk = hiddenMessage[i];

            if (imIf(c) && i === 0 || flags[i - 1]) {
                if (imButtonIsClicked(c, chunk, flags[i])) {
                    flags[i] = !flags[i];
                }
            } imIfEnd(c);

            if (!flags[i]) break;
        } imForEnd(c);
    } imLayoutEnd(c);
}

function imSwitchAndKeyedExample(c: ImCache) {
    type Occupant = { name: string; toggled: boolean };

    let hotel; hotel = imGetInline(c, imGetInline);
    if (!hotel) {
        const newItem = (name: string, toggled: boolean): Occupant => ({ name, toggled });
        const logs = Array<string>();

        hotel = imSet(c, {
            currentPos: "keyed rooms", 
            items: "ABCDEFGH".split("").map((c, i) => newItem(c, i % 2 == 0)),
            logs,
            itemInstance(c: ImCache, occupant: Occupant, i: number) {
                const sI = imGetInline(c, imSet) ?? imSet(c, {
                    occupant: occupant
                });
                if (sI.occupant !== occupant) {
                    logs.push("[" + this.currentPos + "] Occupant " + occupant.name + " found someone else in their room! wtf.");
                    sI.occupant = occupant;
                }

                imLayoutBegin(c, BLOCK);
                imBg(c, occupant.toggled ? cssVars.fg : cssVars.bg);
                imFg(c, !occupant.toggled ? cssVars.fg : cssVars.bg); {
                    imStr(c, occupant.name);
                } imLayoutEnd(c);
            }
        });
    }

    imLayoutBegin(c, ROW); imJustify(c); {
        imStr(c, "=========== " + hotel.currentPos + " ===========");
    } imLayoutEnd(c);

    imLayoutBeginInternal(c, ROW); imJustify(c); imGap(c, 10, PX); {
        imSwitch(c, hotel.currentPos); switch (hotel.currentPos) {
            case "start": {
                if (imButtonIsClicked(c, "enable keyed rooms")) hotel.currentPos = "keyed rooms";
                if (imButtonIsClicked(c, "enable unkeyed rooms")) hotel.currentPos = "unkeyed rooms";
            } break;
            case "unkeyed rooms": {
                imFor(c); hotel.items.forEach((item, i) => {
                    hotel.itemInstance(c, item, i);
                }); imForEnd(c);
            } break;
            case "keyed rooms": {
                imFor(c); hotel.items.forEach((item, i) => {
                    imKeyedBegin(c, item); {
                        hotel.itemInstance(c, item, i);
                    } imKeyedEnd(c);
                }); imForEnd(c);
            } break;
        } imSwitchEnd(c);
    } imLayoutEnd(c);

    imLayoutBegin(c, ROW); imJustify(c); imGap(c, 10, PX); {
        if (imIf(c) && hotel.currentPos !== "start") {
            if (imButtonIsClicked(c, "reorder bookings")) hotel.items.sort((a, b) => (0.5 - Math.random()))
            if (imButtonIsClicked(c, "back to lobby")) hotel.currentPos = "start";
        } imIfEnd(c);
    } imLayoutEnd(c);

    imLayoutBegin(c, COL); imAlign(c); {
        imStr(c, "=========== " + "Complaints" + " ===========");
        if (imIf(c) && hotel.logs.length > 0) {
            if (imButtonIsClicked(c, "ignore complaints")) hotel.logs.length = 0;
        } imIfEnd(c);
    } imLayoutEnd(c);

    imFor(c); for (const log of hotel.logs) {
        imLayoutBegin(c, BLOCK); {
            imStr(c, log);
        } imLayoutEnd(c);
    } imForEnd(c);
}


    function newComponentState() {
        return {
            // Usually, newComponentState would not be inline like this
            x: 1,
        }
    }


export function imExampleMain(c: ImCache) {
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
