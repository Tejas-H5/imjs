# Tutorial 3 - kanban board

In this tutorial, we're going to be building a kanban board.
It's not going to be the prettiest - I'll leave the styling entirely up to you.
But it _will_ be fully interactive. 
We'll be seeing how we can make use of the global event system that
    I've decided to ship _alongside_ this framework as opposed to a separate library.

I assume you're familiar with how the framework works by now - if not, you'll 
have to check out #url[Tutorial 1, /?test=Tutorial+1+-+a+TODO+List].

First let's make the outline. 
I'm thinking we need 3 columns to put our tasks in - "Todo", "In progress" and "Done".
This time, I'm going to start by having refactored out my styling system immediately:

```ts - Basic outline
function imKanabBoard(c: ImCache) {
    imRowBegin(c: ImCache); {
        imColBegin(c); {
            imHeadingBegin(c); imStr(c, "Todo"); imHeadingEnd(c);
        } imColEnd(c);
        imColBegin(c); {
            imHeadingBegin(c); imStr(c, "In-Progress"); imHeadingEnd(c);
        } imColEnd(c);
        imColBegin(c); {
            imHeadingBegin(c); imStr(c, "Done"); imHeadingEnd(c);
        } imColEnd(c);
    } imRowEnd(c);
}

//////////////////////////
// UI components

function imStr(c: ImCache, val: Stringifyable) {
    imdom.Str(c, val);
}

function imHeadingBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.H2);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "white-space", "nowrap");
    return result;
}
function imHeadingEnd(c: ImCache) {
    imdom.ElEnd(c, el.H2);
}

const gap = "10px";

function imColBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "column");
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "row");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imRowEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}

```

Let's add some tasks into each row, and see how that looks:


```ts - Some tasks #diff[-1]
function imKanabBoard(c: ImCache) {
    imRowBegin(c); {
        imColBegin(c); {
            imHeadingBegin(c); imStr(c, "Todo"); imHeadingEnd(c);
            imRowBegin(c); imRowEnd(c);
            imCard(c, "Task 1");
        } imColEnd(c);
        imColBegin(c); {
            imHeadingBegin(c); imStr(c, "In-Progress"); imHeadingEnd(c);
            imRowBegin(c); imRowEnd(c);
            imCard(c, "Task 2");
        } imColEnd(c);
        imColBegin(c); {
            imHeadingBegin(c); imStr(c, "Done"); imHeadingEnd(c);
            imRowBegin(c); imRowEnd(c);
            imCard(c, "Task 3");
        } imColEnd(c);
    } imRowEnd(c);
}

//////////////////////////
// UI components

function imCard(c: ImCache, taskName: string) {
    imRowBegin(c); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "padding", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border-radius", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border", "2px solid #000");

        imStr(c, taskName);
    } imRowEnd(c);
}

function imStr(c: ImCache, val: Stringifyable) {
    imdom.Str(c, val);
}

function imHeadingBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.H2);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "white-space", "nowrap");
    return result;
}
function imHeadingEnd(c: ImCache) {
    imdom.ElEnd(c, el.H2);
}

const gap = "10px";

function imColBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "column");
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "row");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imRowEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
```

Now, I want some way to add tasks.
Before we proceed, let's rewrite our UI as a function of actual data.
I imagine each column to be `{ name, Task[] }` and each task to be `{ name }`.

Additionally, I think it is better if we don't read to and write from 
    global variables in our UI, unless it's far more convenient to do so.
Doing this obfuscates the dependencies and context that a particular piece of code needs,
    which makes understanding and refactoring the logic of the component more difficult.
Some things like event handling are assumed to be doable across the entire page, so 
    I have no qualms with making the global event system a global variable we read to 
    and write from directly (but there is still some tension I hold with this opinion -
    I may change my mind on this in the future).

Anyway, let's get back on-topic, and do the refactor:

```ts - Data-driven refactor #diff[-1]
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
    kanbanBoard.columns.forEach((c, i) => c.tasks.push(newKanbanTask("Task " + i)));
    return kanbanBoard;
}

const globalState = {
    kanbanBoard: newKanbanBoard(),
};

function imMain(c: ImCache) {
    imKanabBoard(c, globalState.kanbanBoard);
}

function imKanabBoard(c: ImCache, kanbanBoard: KanbanBoard) {
    imRowBegin(c); {
        im.For(c); for (const col of kanbanBoard.columns) {
            imColBegin(c); {
                imHeadingBegin(c); imStr(c, col.name); imHeadingEnd(c);
                imRowBegin(c); imRowEnd(c);

                im.For(c); for (const task of col.tasks) {
                    imCard(c, task.name);
                } im.ForEnd(c);
            } imColEnd(c);
        } im.ForEnd(c);
    } imRowEnd(c);
}

//////////////////////////
// UI components

function imCard(c: ImCache, taskName: string) {
    imRowBegin(c); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "padding", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border-radius", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border", "2px solid #000");

        imStr(c, taskName);
    } imRowEnd(c);
}

function imStr(c: ImCache, val: Stringifyable) {
    imdom.Str(c, val);
}

function imHeadingBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.H2);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "white-space", "nowrap");
    return result;
}
function imHeadingEnd(c: ImCache) {
    imdom.ElEnd(c, el.H2);
}

const gap = "10px";

function imColBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "column");
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "row");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imRowEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
```

Perhaps it would have been better to cut this 'mistake', and start the tutorial
with the correct state, but I think it is more honest/helpful to show the 
actual sequence in which I coded this. 

Now that we have our data, let's give ourselves a way to push tasks onto the first column.
Around these parts, we subscribe to the 
    #url[Act on press, https://x.com/ID_AA_Carmack/status/1787850053912064005?lang=en]
    way of doing things!

```ts - Adding new tasks #diff[-1] #id[prev1]
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
    kanbanBoard.columns.forEach((c, i) => c.tasks.push(newKanbanTask("Task " + i)));
    return kanbanBoard;
}

const globalState = {
    kanbanBoard: newKanbanBoard(),
};

function imMain(c: ImCache) {
    imKanabBoard(c, globalState.kanbanBoard);
}

function imKanabBoard(c: ImCache, kanbanBoard: KanbanBoard) {
    imRowBegin(c); {
        let deferredEvent: DeferredEvent | undefined;

        im.For(c); for (let colIdx = 0; colIdx < kanbanBoard.columns.length; colIdx++) {
            const col = kanbanBoard.columns[colIdx];
            imColBegin(c); {
                imHeadingBegin(c); imStr(c, col.name); imHeadingEnd(c);
                imRowBegin(c); imRowEnd(c);

                im.For(c); for (const task of col.tasks) {
                    imCard(c, task.name);
                } im.ForEnd(c);
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

function imCard(c: ImCache, taskName: string) {
    imRowBegin(c); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "padding", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border-radius", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border", "2px solid #000");

        imStr(c, taskName);
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "white-space", "nowrap");
    return result;
}
function imHeadingEnd(c: ImCache) {
    imdom.ElEnd(c, el.H2);
}

const gap = "10px";

function imColBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "column");
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "row");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imRowBeginCentered(c: ImCache) {
    const result = imRowBegin(c);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "justify-content", "centered");
    return result;
}
function imRowEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
```

Of course, we must avoid mutating the kanban board whilst rendering it. 

## The hard part

Let's not waste any more time, and get straight to implementing dragging/dropping
    the cards between columns.
First, the dragging.
The simplest possible implementation of dragging and dropping a UI component
    has two states - either we are dragging something, or we aren't.
The pseudocode would look something like:

```typescript
imRowBegin(c) {
    if (
        user has started moving mouse, and 
        mouse is held, and 
        mouse started being pressed specifically on this UI element
            (as opposed to entering the UI element while already being presed)
    ) {
        dragState.state = DRAGGING;
    }

    if (mouse is not pressed rn or escape key pressed) {
        dragState.state = NOT_DRAGGING;
    }
} imRowEnd(c);
```

Let's write it for real this time:

```ts - Dragging in isolation #diff[-2]
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
    kanbanBoard.columns.forEach((c, i) => c.tasks.push(newKanbanTask("Task " + i)));
    return kanbanBoard;
}

const globalState = {
    kanbanBoard: newKanbanBoard(),
};

function imMain(c: ImCache) {
    imKanabBoard(c, globalState.kanbanBoard);
}

function imKanabBoard(c: ImCache, kanbanBoard: KanbanBoard) {
    imRowBegin(c); {
        let deferredEvent: DeferredEvent | undefined;

        im.For(c); for (let colIdx = 0; colIdx < kanbanBoard.columns.length; colIdx++) {
            const col = kanbanBoard.columns[colIdx];
            imColBegin(c); {
                imHeadingBegin(c); imStr(c, col.name); imHeadingEnd(c);
                imRowBegin(c); imRowEnd(c);

                im.For(c); for (const task of col.tasks) {
                    imCard(c, task.name);
                } im.ForEnd(c);
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

function imCard(c: ImCache, taskName: string) {
    imRowBegin(c); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "padding", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border-radius", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border", "2px solid #000");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "userSelect", "none");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "cursor", "pointer");

        const mouse = imdom.getMouse();
        const dnd = im.GetInline(c, imCard) ??
            im.Set(c, { x: 0, y: 0, isDragging: false, });

        if (imdom.hasMousePress(c) && !dnd.isDragging) {
            dnd.isDragging = true;
            dnd.x = mouse.x;
            dnd.y = mouse.y;
        } 
        if (!mouse.leftMouseButton) {
            dnd.isDragging   = false;
        }

        if (im.Memo(c, mouse.x) | im.Memo(c, mouse.y) | im.Memo(c, dnd.isDragging)) {
            let xOffset = 0, yOffset = 0;
            if (dnd.isDragging) {
                xOffset = mouse.x - dnd.x;
                yOffset = mouse.y - dnd.y;
            }
            imdom.setStyle(c, "transform", `translate(${xOffset}px, ${yOffset}px)`);
        }

        imStr(c, taskName);
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "white-space", "nowrap");
    return result;
}
function imHeadingEnd(c: ImCache) {
    imdom.ElEnd(c, el.H2);
}

const gap = "10px";

function imColBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "column");
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "row");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imRowBeginCentered(c: ImCache) {
    const result = imRowBegin(c);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "justify-content", "centered");
    return result;
}
function imRowEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
```

Cool - we implemented dragging, but now we need to implement dropping. 
What I now know after having implemented it, is that it is a lot harder.
Here's how I ended up doing it:

```ts - Dropping #diff[-1]
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
    kanbanBoard.columns.forEach((c, i) => c.tasks.push(newKanbanTask("Task " + i)));
    return kanbanBoard;
}

const globalState = {
    kanbanBoard: newKanbanBoard(),
};

// we now need to store what we're dragging somewhere.
let currentDraggedItem = null;

function imMain(c: ImCache) {
    const mouse = imdom.getMouse();

    imKanabBoard(c, globalState.kanbanBoard);

    // Do this at the global scope. It shouldn't be managed by a single component.
    // Make sure we do this _after_ we render our app and not before, so that
    // if (!mouse.leftMouseButton && currentDraggedItem) {}. can work
    if (!mouse.leftMouseButton) {
        currentDraggedItem = null;
    }
}

function imKanabBoard(c: ImCache, kanbanBoard: KanbanBoard) {
    imRowBegin(c); {
        let deferredEvent: DeferredEvent | undefined;

        im.For(c); for (let colIdx = 0; colIdx < kanbanBoard.columns.length; colIdx++) {
            const col = kanbanBoard.columns[colIdx];
            imColBegin(c); {
                imHeadingBegin(c); imStr(c, col.name); imHeadingEnd(c);
                imRowBegin(c); imRowEnd(c);

                im.For(c); for (const task of col.tasks) {
                    imCard(c, task);
                } im.ForEnd(c);

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

                const canDrop = imdom.hasMouseOver(c) && !!currentDraggedItem
                if (im.Memo(c, canDrop)) {
                    imdom.setStyle(c, "backgroundColor", canDrop ? "#DDD" : "");
                }

                const mouse = imdom.getMouse();
                if (canDrop && currentDraggedItem && !mouse.leftMouseButton) {
                    const taskToAdd = currentDraggedItem;
                    currentDraggedItem = null;

                    deferredEvent = () => {
                        // TODO: consider a more efficient representation for our columns
                        // Remove the task from it's current column, and move it to this one.
                        for (const col of kanbanBoard.columns) {
                            col.tasks = 
                                col.tasks.filter(t => t !== taskToAdd);
                        }
                        col.tasks.push(taskToAdd);
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

function imCard(c: ImCache, task: Task) {
    imRowBegin(c); {
        if (im.IsFirstRender(c)) imdom.setStyle(c, "padding", "10px");
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border-radius", "10px");
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "white-space", "nowrap");
    return result;
}
function imHeadingEnd(c: ImCache) {
    imdom.ElEnd(c, el.H2);
}

const gap = "10px";

function imColBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "column");
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "row");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imRowBeginCentered(c: ImCache) {
    const result = imRowBegin(c);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "justify-content", "centered");
    return result;
}
function imRowEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
```

To summarize:

#list[
- We now track the current dragged item as a global `currentDraggedItem` value. 
    It kinda makes sense, because you can only drag one thing at a time.
    Making it global also gives any drop surface in the entire app an opportunity
    to consume it, when needed. Clearing this thing out is also a global responsibility now - it doesn't
        really make sense for this to be done on a per-UI-element basis.
    If there are 10 draggable surfaces, we would be clearing this value 10 times when 
        the mouse is released.
    If there were 0 draggable surfaces, we actually wouldn't be clearing anything at all.
    We can extend the type to be `{ type: itemType, val: Value }` when 
    we want to start dragging different types of items.
    In React, moving state out of a component to somewhere it can be shared by 
        other components is where you would pause and reach for a state management library.
    But here, we don't care about where the state comes from, so it's business as usual.
- We check `!mouse.leftMouseButton && currentDraggedItem` to know if the item
    can be dropped. 
    In other frameworks, this is where you pause, and reach for css, but 
    we were actually able to extract this out, and plug it directly into styling logic.
    There are no event handlers to worry about adding/removing at precise moments.
    This is why immediate-mode code is so much easier to write.
]

But actually, I want to be able to reorder tasks within the same column.
It's actually pretty simple - we just need to do the drop check 
on a per-element basis and then `splice` the item into the right position.
Right? 

```ts - Dropping, but more precise (not working) #diff[-1]
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

        imKanabBoard(c, globalState.kanbanBoard);
    } imColEnd(c);

    // Do this at the global scope. It shouldn't be managed by a single component.
    // Make sure we do this _after_ we render our app and not before, so that
    // if (!mouse.leftMouseButton && currentDraggedItem) {}. can work
    if (!mouse.leftMouseButton) {
        currentDraggedItem = null;
    }
}

function imKanabBoard(c: ImCache, kanbanBoard: KanbanBoard) {
    imRowBegin(c); {
        let deferredEvent: DeferredEvent | undefined;

        im.For(c); for (let colIdx = 0; colIdx < kanbanBoard.columns.length; colIdx++) {
            const col = kanbanBoard.columns[colIdx];
            let droppingTask = false;
            let dropTaskBefore: KanbanTask | undefined;

            imColBegin(c); {
                imHeadingBegin(c); imStr(c, col.name); imHeadingEnd(c);
                imRowBegin(c); imRowEnd(c);

                im.For(c); for (let taskIdx = 0; taskIdx < col.tasks.length; taskIdx++) {
                    const task = col.tasks[taskIdx];

                    imBlockBegin(c); {
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
        if (im.IsFirstRender(c)) imdom.setStyle(c, "border-radius", "10px");
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "white-space", "nowrap");
    return result;
}
function imHeadingEnd(c: ImCache) {
    imdom.ElEnd(c, el.H2);
}

function imBlockBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
}
function imBlockEnd(c: ImCache) {
    const result = imdom.ElEnd(c, el.DIV);
}

const gap = "10px";
function imColBegin(c: ImCache) {
    const result = imdom.ElBegin(c, el.DIV);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "display", "flex");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "column");
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
    if (im.IsFirstRender(c)) imdom.setStyle(c, "flex-direction", "row");
    if (im.IsFirstRender(c)) imdom.setStyle(c, "gap", gap);
    return result;
}
function imRowBeginCentered(c: ImCache) {
    const result = imRowBegin(c);
    if (im.IsFirstRender(c)) imdom.setStyle(c, "justify-content", "centered");
    return result;
}
function imRowEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
```

Took quite a while actually - in order to add feedback properly, we've added a new
    `imBlockBegin/End` we can use to wrap a particular element.
This allows us to add interactivity to a slot in the column, without touching 
    `imCard`.
The dragging/dropping is a behaviour of the kanban board, and not the card.

Additionally, the first drag handler I implemented was like this:

```typescript
const mouse = imdom.getMouse();
if (dropColIdx !== -1 && currentDraggedItem && !mouse.leftMouseButton) {
    deferredEvent = () => {
        // Delete task from all columns
        for (const otherCol of kanbanBoard.columns) {
            otherCol.tasks = otherCol.tasks.filter(t => t !== taskToAdd);
        }
        // Then add it to the correct position in our column
        col.tasks.splice(dropIdx, 0, taskToAdd);
    };
}
```

This is actually wrong, and you've probably already noticed why - if I delete a task
    that is before a particular task, then the `dropColIdx` we got by hovering over
    a task is now one index too high.
The solution is actually quite simple, and I intuitively already arrived at it
    based on where I put this divider:

``` typescript
if (im.If(c) && canDrop) {
    dropCol = col;
    dropTaskBefore = task;
    imDivider(c);
} im.IfEnd(c);

imCard(c, task);
```

Rather than tracking the drop index, we can simply track the task that we should insert it
    before, which is what the code does now.
