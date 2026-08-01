# Diff test

As it turns out, our blog post needs a minimum amount of
text in order for the width of the page to actually be what it 
needs to be !

Initial state:


```ts - Cross-column dragging #diff[-1]
function newKanbanColumn(name: string): KanbanColumn {
    return { name: name, tasks: [] };
}

function newKanbanTask(name: string): KanbanTask {
    return { name }
}

function newKanbanBoard(): KanbanBoard {
    const kanbanBoard: KanbanBoard = {
        columns: ["Todo", "In Progres", "Done"].map(newKanbanColumn),
    };
    // TODO: remove this testing code later
    kanbanBoard.columns.forEach((c, i) => {
        for (let i = 0; i < 4; i++) {
            c.tasks.push(newKanbanTask("Task " + i))
        }
    });
    return kanbanBoard;
}

const globalState = {
    kanbanBoard: newKanbanBoard(),
};

// we now need to store what we're dragging somewhere.
let currentDraggedItem = null;

function imMain(c: ImCache) {
    const mouse = imdom.getMouse();

    imColBegin(c); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "width", "100%");

        imKanbanBoard(c, globalState.kanbanBoard);
    } imColEnd(c);

    // Do this at the global scope. It shouldn't be managed by a single component.
    // Make sure we do this _after_ we render our app and not before, so that
    // if (!mouse.leftMouseButton && currentDraggedItem) {}. can work
    if (!mouse.leftMouseButton) {
        currentDraggedItem = null;
    }
}

function imKanbanBoard(c: ImCache, kanbanBoard: KanbanBoard) {
    imRowBegin(c); {
        let deferredEvent: DeferredEvent | undefined;

        // TODO: fix bug in this tutorial - our typescript 'parser' cant parse generics yet
        // const mapping = im.GetInline(c, imKanbanBoard)
        //     ?? im.Set(c, new Map<Task, { top: number; left: number; used: boolean; }>());
        const mapping = im.GetInline(c, imKanbanBoard)
            ?? im.Set(c, new Map());

        for (const [key, val] of mapping) {
            if (!val.used) {
                mapping.delete(key);
            } else {
                val.used = false;
            }
        }

        im.For(c); for (let colIdx = 0; colIdx < kanbanBoard.columns.length; colIdx++) {
            const col = kanbanBoard.columns[colIdx];
            let droppingTask = false;
            let dropTaskBefore: KanbanTask | undefined;

            const colRoot = imColBegin(c).root; {
                imHeadingBegin(c); imStr(c, col.name); imHeadingEnd(c);
                imRowBegin(c); imRowEnd(c);

                im.For(c); for (let taskIdx = 0; taskIdx < col.tasks.length; taskIdx++) {
                    const task = col.tasks[taskIdx];

                    // We'll need to make sure the actual DOM node moves, rather than
                    // simply repopulates with another task's info. Otherwise the 
                    // animation won't work. 
                    im.KeyedBegin(c, task); {
                        const target = imBlockBegin(c).root; {
                            // This can be what the animation targets
                            const targetRect = target.getBoundingClientRect();

                            const animating = imBlockBegin(c).root; {
                                if (im.IsFirstRender(c)) {
                                    imdom.setStyle(c, "position", "absolute");
                                }

                                // TODO: this doesnt fix width properly.
                                // Refresh the page and scroll straight to this example, and
                                // you'll find out why.
                                imdom.setStyle(c, "width", (colRoot.clientWidth - 2) + "px");

                                const targetLeft = target.offsetLeft;
                                const targetTop = target.offsetTop;

                                let anim = mapping.get(task);
                                if (!anim) {
                                    anim = { top: 0, left: 0, used: false };
                                    mapping.set(task, anim);
                                }
                                anim.used = true;

                                const isAnimating = (
                                    Math.abs(targetLeft - anim.left) + 
                                    Math.abs(targetTop - anim.top)
                                ) > 0.01;

                                if (isAnimating) {
                                    const dt = im.getDeltaTimeSeconds(c);
                                    // TODO: do proper framerate independent lerp. for now this is ok
                                    const responsiveness = 20;
                                    anim.top    = lerp(anim.top, targetTop, responsiveness * dt);
                                    anim.left   = lerp(anim.left, targetLeft, responsiveness * dt);

                                    imdom.setStyle(c, "top", anim.top + "px");
                                    imdom.setStyle(c, "left", anim.left + "px");
                                }
                                // imdom.setStyle(c, "width", colRoot.offsetWidth + "px");

                                const canDrop = imdom.hasMouseOver(c) && !!currentDraggedItem;

                                // It's important this drop-feedback divider UI 
                                // is within the same DOM node as the one where we're querying
                                // the mouse being over - otherwise, the divider can push the UI down,
                                // which moves the row out of the mouse, which hides the divider, 
                                // causing an infinite loop. 
                                if (im.If(c) && canDrop) {
                                    droppingTask = true;
                                    dropTaskBefore = task;
                                    imDivider(c);
                                } im.IfEnd(c);

                                imCard(c, task);
                            } imBlockEnd(c);

                            const animatingRect = animating.getBoundingClientRect();
                            imdom.setStyle(c, "width", animatingRect.width + "px");
                            imdom.setStyle(c, "height", animatingRect.height + "px");
                        } imBlockEnd(c);
                    } im.KeyedEnd(c);
                } im.ForEnd(c);

                const canDrop = currentDraggedItem && !droppingTask && imdom.hasMouseOver(c);
                if (im.If(c) && canDrop) {
                    droppingTask = true;
                    imDivider(c);
                } im.IfEnd(c);

                // Make sure there's always a bit of a gap where we can drag things into
                imRowBegin(c); {
                    if (im.IsFirstRender(c)) imdom.setStyle(c, "height", "50px");
                } imRowEnd(c);

                if (im.If(c) && colIdx === 0) {
                    imRowBegin(c); {
                        if (imButtonPressed(c, "Add new task")) {
                            deferredEvent = () => {
                                // This code is not in the main rendering path. 
                                // We can afford to ignore performance here.
                                const allTasks = kanbanBoard.columns.flatMap(c => c.tasks);
                                col.tasks.push(newKanbanTask("Task " + allTasks.length));
                            };
                        }
                    } imRowEnd(c);
                } im.IfEnd(c);

                const mouse = imdom.getMouse();
                if (droppingTask && currentDraggedItem && !mouse.leftMouseButton) {
                    const task = currentDraggedItem;
                    deferredEvent = () => {
                        if (dropTaskBefore === task) {
                            // Our job here is already done
                            return;
                        }

                        for (const otherCol of kanbanBoard.columns) {
                            otherCol.tasks = otherCol.tasks.filter(t => t !== task);
                        }

                        let idx = col.tasks.indexOf(dropTaskBefore);
                        if (idx === -1) {
                            idx = col.tasks.length;
                        }
                        col.tasks.splice(idx, 0, task);
                    };
                }
            } imColEnd(c);
        } im.ForEnd(c);

        if (deferredEvent) {
            // We want to avoid mutating the kanbanBoard while we're rendering it.
            deferredEvent();
        }
    } imRowEnd(c);
}

//////////////////////////
// UI components

function lerp(a: number, b: number, t: number): number {
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return a + (b - a) * t;
}

function imDivider(c: ImCache) {
    // Some visual feedback for where we'll drop a task.
    imRowBegin(c); {
        if (im.IsFirstRender(c)) {
            imdom.setStyle(c, "backgroundColor", "#DDD");
            imdom.setStyle(c, "height", "10px");
        }
    } imRowEnd(c);
}

function imCard(c: ImCache, task: Task) {
    imRowBegin(c); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "padding", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "borderRadius", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border", "2px solid #000");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "userSelect", "none");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "cursor", "pointer");

        const mouse = imdom.getMouse();
        const dnd = im.GetInline(c, imCard) ??
            im.Set(c, { x: 0, y: 0 });

        const isDragging = currentDraggedItem === task;

        if (imdom.hasMousePress(c) && !isDragging) {
            currentDraggedItem = task;
            dnd.x = mouse.x;
            dnd.y = mouse.y;
        }

        if (im.Memo(c, mouse.x) | im.Memo(c, mouse.y) | im.Memo(c, isDragging)) {
            let xOffset = 0, yOffset = 0;
            if (isDragging) {
                xOffset = mouse.x - dnd.x;
                yOffset = mouse.y - dnd.y;
            }
            imdom.setStyle(c, "transform", `translate(${xOffset}px, ${yOffset}px)`);
            imdom.setStyle(c, "zIndex", isDragging ? "1000" : "");
            // The card will block the mouse pointer from registering a
            // mouse-over event on the column, so we'll need to let mouse events
            // through when we are dragging for dropping to work
            imdom.setStyle(c, "pointerEvents", isDragging ? "none" : "");
        }

        imStr(c, task.name);
    } imRowEnd(c);
}

function imButtonPressed(c: ImCache, text: string): boolean {
    let result = false;
    imdom.ElBegin(c, el.BUTTON); {
        imStr(c, text);

        result = imdom.hasMousePress(c);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}

function imStr(c: ImCache, val: Stringifyable) {
    imdom.Str(c, val);
}

function imHeadingBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.H2);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "whiteSpace", "nowrap");
    return result;
}
function imHeadingEnd(c: ImCache) {
    imdom.ElEnd(c, el.H2);
}

function imBlockBegin(c: ImCache) {
    return imdom.ElBegin(c, el.DIV);
}
function imBlockEnd(c: ImCache) {
    const result = imdom.ElEnd(c, el.DIV);
}

const gap = "10px";
function imColBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flexDirection", "column");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex", "1");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imColEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}

function imRowBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flexDirection", "row");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imRowBeginCentered(c: ImCache) {
    const result = imRowBegin(c);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "justifyContent", "centered");
    return result;
}
function imRowEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
```

I've also tried to fix the width, but there are a couple of seconds at the start where 
it is very wrong.
Refresh the page and scroll straight to this example to find out.
I've got no clue how to fix it actually. 
I'll leave it as an exercise to someone reading this. 
PRs accepted.
The other fixups are also an exercise to the reader.

## Code cleanup

Sure, it's great that we have dragging and dropping, and it all animates, but 
    our code is pretty hard to understand - the dragging/dropping logic and DOM is tightly 
    interwoven with everything else, and we can't reuse it anywhere. 
Here's one way we can clean it up:

```ts - Code cleanup - animated cells #diff[-1]
function newKanbanColumn(name: string): KanbanColumn {
    return { name: name, tasks: [] };
}

function newKanbanTask(name: string): KanbanTask {
    return { name }
}

function newKanbanBoard(): KanbanBoard {
    const kanbanBoard: KanbanBoard = {
        columns: ["Todo", "In Progres", "Done"].map(newKanbanColumn),
    };
    // TODO: remove this testing code later
    kanbanBoard.columns.forEach((c, i) => {
        for (let i = 0; i < 4; i++) {
            c.tasks.push(newKanbanTask("Task " + i))
        }
    });
    return kanbanBoard;
}

const globalState = {
    kanbanBoard: newKanbanBoard(),
};

// we now need to store what we're dragging somewhere.
let currentDraggedItem = null;

function imMain(c: ImCache) {
    const mouse = imdom.getMouse();

    imColBegin(c); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "width", "100%");

        imKanbanBoard(c, globalState.kanbanBoard);
    } imColEnd(c);

    // Do this at the global scope. It shouldn't be managed by a single component.
    // Make sure we do this _after_ we render our app and not before, so that
    // if (!mouse.leftMouseButton && currentDraggedItem) {}. can work
    if (!mouse.leftMouseButton) {
        currentDraggedItem = null;
    }
}

function imKanbanBoard(c: ImCache, kanbanBoard: KanbanBoard) {
    imRowBegin(c); {
        let deferredEvent: DeferredEvent | undefined;

        const animMapping = imAnimatedCellsState(c);

        im.For(c); for (let colIdx = 0; colIdx < kanbanBoard.columns.length; colIdx++) {
            const col = kanbanBoard.columns[colIdx];
            let droppingTask = false;
            let dropTaskBefore: KanbanTask | undefined;

            const colRoot = imColBegin(c).root; {
                imHeadingBegin(c); imStr(c, col.name); imHeadingEnd(c);
                imRowBegin(c); imRowEnd(c);

                im.For(c); for (let taskIdx = 0; taskIdx < col.tasks.length; taskIdx++) {
                    const task = col.tasks[taskIdx];

                    // TODO: this doesnt fix width properly.
                    // Refresh the page and scroll straight to this example, and
                    // you'll find out why.
                    const cellWidth = (colRoot.clientWidth - 2);
                    imAnimatedCellBegin(c, animMapping, task, cellWidth); {
                        const canDrop = imdom.hasMouseOver(c) && !!currentDraggedItem;

                        // It's important this drop-feedback divider UI 
                        // is within the same DOM node as the one where we're querying
                        // the mouse being over - otherwise, the divider can push the UI down,
                        // which moves the row out of the mouse, which hides the divider, 
                        // causing an infinite loop. 
                        if (im.If(c) && canDrop) {
                            droppingTask = true;
                            dropTaskBefore = task;
                            imDivider(c);
                        } im.IfEnd(c);

                        imCard(c, task);
                    } imAnimatedCellEnd(c);
                } im.ForEnd(c);

                const canDrop = currentDraggedItem && !droppingTask && imdom.hasMouseOver(c);
                if (im.If(c) && canDrop) {
                    droppingTask = true;
                    imDivider(c);
                } im.IfEnd(c);

                // Make sure there's always a bit of a gap where we can drag things into
                imRowBegin(c); {
                    if (im.IsFirstRender(c)) imdom.setStyle(c, "height", "50px");
                } imRowEnd(c);

                if (im.If(c) && colIdx === 0) {
                    imRowBegin(c); {
                        if (imButtonPressed(c, "Add new task")) {
                            deferredEvent = () => {
                                // This code is not in the main rendering path. 
                                // We can afford to ignore performance here.
                                const allTasks = kanbanBoard.columns.flatMap(c => c.tasks);
                                col.tasks.push(newKanbanTask("Task " + allTasks.length));
                            };
                        }
                    } imRowEnd(c);
                } im.IfEnd(c);

                const mouse = imdom.getMouse();
                if (droppingTask && currentDraggedItem && !mouse.leftMouseButton) {
                    const task = currentDraggedItem;
                    deferredEvent = () => {
                        if (dropTaskBefore === task) {
                            // Our job here is already done
                            return;
                        }

                        for (const otherCol of kanbanBoard.columns) {
                            otherCol.tasks = otherCol.tasks.filter(t => t !== task);
                        }

                        let idx = col.tasks.indexOf(dropTaskBefore);
                        if (idx === -1) {
                            idx = col.tasks.length;
                        }
                        col.tasks.splice(idx, 0, task);
                    };
                }
            } imColEnd(c);
        } im.ForEnd(c);

        if (deferredEvent) {
            // We want to avoid mutating the kanbanBoard while we're rendering it.
            deferredEvent();
        }
    } imRowEnd(c);
}

//////////////////////////
// UI components

function imAnimatedCellsState(c: ImCache): AnimatedCellsState {
    // TODO: fix bug in this tutorial - our typescript 'parser' cant parse generics yet
    // const mapping = im.Get(c, imAnimatedCellsState)
    //     ?? im.Set(c, new Map<Task, { top: number; left: number; used: boolean; }>());
    const mapping = im.Get(c, imAnimatedCellsState)
        ?? im.Set(c, new Map());

    for (const [key, val] of mapping) {
        if (!val.used) {
            mapping.delete(key);
        } else {
            val.used = false;
        }
    }

    return mapping;
}
function imAnimatedCellBegin(
    c: ImCache,
    mapping: AnimatedCellsState,
    itemReference: unknown,
    widthPx: number
) {
    im.KeyedBegin(c, itemReference); {
        const target = imBlockBegin(c).root; {
            // This can be what the animation targets
            const targetRect = target.getBoundingClientRect();

            const animating = imBlockBegin(c).root; {
                if (im.IsFirstRender(c)) {
                    imdom.setStyle(c, "position", "absolute");
                }

                imdom.setStyle(c, "width", widthPx + "px");

                const targetLeft = target.offsetLeft;
                const targetTop = target.offsetTop;

                let anim = mapping.get(itemReference);
                if (!anim) {
                    anim = { top: 0, left: 0, used: false };
                    mapping.set(itemReference, anim);
                }
                anim.used = true;

                const isAnimating = (
                    Math.abs(targetLeft - anim.left) + 
                    Math.abs(targetTop - anim.top)
                ) > 0.01;

                if (isAnimating) {
                    const dt = im.getDeltaTimeSeconds(c);
                    // TODO: do proper framerate independent lerp. for now this is ok
                    const responsiveness = 20;
                    anim.top    = lerp(anim.top, targetTop, responsiveness * dt);
                    anim.left   = lerp(anim.left, targetLeft, responsiveness * dt);

                    imdom.setStyle(c, "top", anim.top + "px");
                    imdom.setStyle(c, "left", anim.left + "px");
                }

                const animatingRect = animating.getBoundingClientRect();
                // We ned to specfiy `target` here for setStyle, since we're still in the 
                // scope for const animating = imBlockBegin(c).root;
                imdom.setStyle(c, "width", animatingRect.width + "px", target);
                imdom.setStyle(c, "height", animatingRect.height + "px", target);
            }
        }
    }
}

function imAnimatedCellEnd(c: ImCache) {
    {
        {
            {
            } imBlockEnd(c);
        } imBlockEnd(c);
    } im.KeyedEnd(c);
}

function lerp(a: number, b: number, t: number): number {
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    return a + (b - a) * t;
}

function imDivider(c: ImCache) {
    // Some visual feedback for where we'll drop a task.
    imRowBegin(c); {
        if (im.IsFirstRender(c)) {
            imdom.setStyle(c, "backgroundColor", "#DDD");
            imdom.setStyle(c, "height", "10px");
        }
    } imRowEnd(c);
}

function imCard(c: ImCache, task: Task) {
    imRowBegin(c); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "padding", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "borderRadius", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border", "2px solid #000");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "userSelect", "none");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "cursor", "pointer");

        const mouse = imdom.getMouse();
        const dnd = im.GetInline(c, imCard) ??
            im.Set(c, { x: 0, y: 0 });

        const isDragging = currentDraggedItem === task;

        if (imdom.hasMousePress(c) && !isDragging) {
            currentDraggedItem = task;
            dnd.x = mouse.x;
            dnd.y = mouse.y;
        }

        if (im.Memo(c, mouse.x) | im.Memo(c, mouse.y) | im.Memo(c, isDragging)) {
            let xOffset = 0, yOffset = 0;
            if (isDragging) {
                xOffset = mouse.x - dnd.x;
                yOffset = mouse.y - dnd.y;
            }
            imdom.setStyle(c, "transform", `translate(${xOffset}px, ${yOffset}px)`);
            imdom.setStyle(c, "zIndex", isDragging ? "1000" : "");
            // The card will block the mouse pointer from registering a
            // mouse-over event on the column, so we'll need to let mouse events
            // through when we are dragging for dropping to work
            imdom.setStyle(c, "pointerEvents", isDragging ? "none" : "");
        }

        imStr(c, task.name);
    } imRowEnd(c);
}

function imButtonPressed(c: ImCache, text: string): boolean {
    let result = false;
    imdom.ElBegin(c, el.BUTTON); {
        imStr(c, text);

        result = imdom.hasMousePress(c);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}

function imStr(c: ImCache, val: Stringifyable) {
    imdom.Str(c, val);
}

function imHeadingBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.H2);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "whiteSpace", "nowrap");
    return result;
}
function imHeadingEnd(c: ImCache) {
    imdom.ElEnd(c, el.H2);
}

function imBlockBegin(c: ImCache) {
    return imdom.ElBegin(c, el.DIV);
}
function imBlockEnd(c: ImCache) {
    const result = imdom.ElEnd(c, el.DIV);
}

const gap = "10px";
function imColBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flexDirection", "column");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex", "1");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imColEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}

function imRowBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flexDirection", "row");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imRowBeginCentered(c: ImCache) {
    const result = imRowBegin(c);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "justifyContent", "centered");
    return result;
}
function imRowEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
```
