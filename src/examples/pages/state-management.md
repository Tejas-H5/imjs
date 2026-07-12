# State management, and reacting to changes

We've already seen how to initialize state with the counter from earlier:

```ts - Counter
function imSimpleComponentCounter(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? 
        im.Set(c, { count: 0 });

    imdom.ElBegin(c, el.DIV); {
        imdom.Str(c, "The count is ");
        imdom.Str(c, s.count);
    } imdom.ElEnd(c, el.DIV);

    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.BUTTON); {
            const mouseDown = imdom.On(c, ev.MOUSEDOWN);
            if (mouseDown) {
                s.count++;
            }
            imdom.Str(c, "Increment the count");
        } imdom.ElEnd(c, el.BUTTON);
    } imdom.ElEnd(c, el.DIV);
}
```

But what about more complicated state, like something that needs to be 'initialised' and 'destroyed'?
And how do we react to state changes in code that's rerendering itself 60 times a second?
The two are closely related, actually.

## Initialisation, destruction

There are primarily two ways to initialize state. 
The first, and most common way, is to call `isFirstRender(c)`. 
It returns true in the first render, and false in subsequent renders.
Each callsite is evaluated seperately, so a component can call it multiple times. 
However, it is assumed that you only call it a constant number of times. 

```ts - isFirstRender
function imIsFirstRenderExample(c: ImCache) {
    imDivBegin(c); {
        if (im.isFirstRender(c)) {
            imdom.setStyle(c, "display", "flex");
            imdom.setStyle(c, "gap", "10px");
        }

        im.For(c); for (let i = 0; i < 5; i++) {
            imDivBegin(c); imdom.Str(c, i); imDivEnd(c);
        } im.ForEnd(c);
    } imDivEnd(c);
}
```

There are other times when you want to initialize state only once, and then clean up after that state once the component is destroyed.
You probably want `im.Get`/`im.Set`, combined with `im.onImmediateModeBlockDestroyed`:

```ts - onImmediateModeBlockDestroyed  but it doesnt get called
function imInitializeAndDestroyState(c: ImCache) {
    const s = 
        im.GetInline(c, imInitializeAndDestroyState) ?? 
        im.Set(c, { initializationCount: 0, enabled: false, x: 0, y: 0 });

    if (imButtonIsClicked(c, "Toggle mouse tracking")) {
        s.enabled = !s.enabled;
    }

    if (im.If(c) && s.enabled) {
        let mouse; mouse = im.GetInline(c, im.GetInline);
        if (!mouse) {
            s.initializationCount++;
            const ev = (e: MouseEvent) => {
                s.x = e.pageX;
                s.y = e.pageY;
            };
            document.addEventListener("mousemove", ev);
            im.onImmediateModeBlockDestroyed(c, () => {
                document.removeEventListener("mousemove", ev)
                s.initializationCount--;
            });
            mouse = im.Set(c, true);
        }

    } im.IfEnd(c);

    imDivBegin(c); {
        imdom.Str(c, "Enabled: "); imdom.Str(c, s.enabled);
        imdom.Str(c, " Mouse.pageX: "); imdom.Str(c, s.x);
        imdom.Str(c, " Mouse.pageY: "); imdom.Str(c, s.y);
        imdom.Str(c, " Initialization count: "); imdom.Str(c, s.initializationCount);
    } imDivEnd(c);
}

```

Hey what gives! 
Disabling mouse tracking didn't remove the event?! 
Right now, if-statements will only detatch their DOM nodes, but keep state around for performance reasons. 
Destructors only run when an item gets destroyed. 
Right now, keyed list items, as well as and anything rendered under `im.Switch`, will be _destroyed_ by default to avoid memory leaks. 
I figured this was a decent compromise. 
This does mean that destructors should solely be used to free up resources/clean up memory leaks, and not to reliably run application 
    logic when a component is detatched/destroyed. 
For now, if you really need to rely on the destructor to run when a component detatches, you'll have to write it to use `imSwitch` (sorry):

```ts - onImmediateModeBlockDestroyed - hack workaround

function imInitializeJustOnceExampleWithWorkingDestructor(c: ImCache) {
    const s = 
        im.GetInline(c, imInitializeJustOnceExampleWithWorkingDestructor) ?? 
        im.Set(c, { initializationCount: 0, enabled: false, x: 0, y: 0 });

    if (imButtonIsClicked(c, "Toggle mouse tracking")) {
        s.enabled = !s.enabled;
    }

    // im.Switch will actually be destroyed
    im.Switch(c, s.enabled, false); if (s.enabled) {
        let mouse; mouse = im.GetInline(c, im.GetInline);
        if (!mouse) {
            s.initializationCount++;
            const ev = (e: MouseEvent) => {
                s.x = e.pageX;
                s.y = e.pageY;
            };
            document.addEventListener("mousemove", ev);
            im.onImmediateModeBlockDestroyed(c, () => {
                document.removeEventListener("mousemove", ev)
                s.initializationCount--;
            });
            mouse = im.Set(c, true);
        }
    } im.SwitchEnd(c);

    imDivBegin(c); {
        imdom.Str(c, "Enabled: "); imdom.Str(c, s.enabled);
        imdom.Str(c, " Mouse.pageX: "); imdom.Str(c, s.x);
        imdom.Str(c, " Mouse.pageY: "); imdom.Str(c, s.y);
        imdom.Str(c, " Initialization count: "); imdom.Str(c, s.initializationCount);
    } imDivEnd(c);
}

```

Do note that a lot of things you may be used to doing with a constructor/destruct pair that is local to a component, 
    like getting mouse coordinates, can actually just be done once at a global level.
    The result can then be reused by all the components (instead of each component individually registering global handlers). 
Something similar can be said for other kinds of input, async requests/tasks, and possibly other things. 
In fact, I've included a global event system in im-dom that I frequently use to handle mouse/keyboard interactions in my various UIs,
    which does just that.
There is a good chance that it may be somewhat lacking for 'production-grade' tasks at the moment -
    for example, the touch handling is currently non-existent.

## Reacting to changes

This overview would be incomplete without mentioning `im.Memo`. 
This method is used everywhere to execute code but only if some value was different than it was in the previous frame. 
If you can replace `im.Memo` with an event, you probably should. 
However, it is extremely convenient to use, so maybe you shouldn't. 
It is entirely up to you. 

A common pattern in the ThreeJS codebase for example, is to increment a version number to indicate that a piece of 
    state has changed, so that other systems can respond to this. 
`im.Memo` works well with this pattern.

It can be used in a lot of ways, here are some examples of the most common ways it is used:

```ts - im.Memo 90% of usecases

function imMemoExamples(c: ImCache) {
    const becameVisible = im.Memo(c, true);

    let s; s = im.GetInline(c, im.GetInline);
    if (!s || becameVisible) {
        s = im.Set(c, {
            secondsElapsed: 0,
            color: imui.newColor(0, 0, 0, 1),
            count: 0,
        });
    }

    const thisSecond = Math.floor(new Date().getTime() / 1000);
    if (im.Memo(c, thisSecond)) {
        s.secondsElapsed += 1;
    }

    if (im.Memo(c, thisSecond) | im.Memo(c, s.count)) {
        s.color = imui.newColorFromHsv(Math.random(), 0.5, 0.5);
    }

    imDivBegin(c); {
        if (im.Memo(c, s.color)) imdom.setStyle(c, "color", s.color.toString());

        imDivBegin(c); {
            imdom.Str(c, "Seconds elapsed: ");
            imdom.Str(c, s.secondsElapsed);
        } imDivEnd(c);

        imDivBegin(c); {
            imdom.Str(c, "Count: ");
            imdom.Str(c, s.count);
        } imDivEnd(c);

        imDivBegin(c); {
            if (imButtonIsClicked(c, "Increment count")) {
                s.count++;
            }
        } imDivEnd(c);
    } imDivEnd(c);
}
```

Some things to notice:

#list[
- 
    `im.Set` can be called again later, to overwrite/reset the state. 
    By default, the state is persisted unless destroyed, but here we've decided to reset it out whenever we re-attatch 
        the component as well. 
    Be careful that you aren't adding any destructuors in that initialisation block though - the previous destructor may not have ran.
- 
    The Regular logical-or `||` operator will short-circuit, but the bitwise-or `|` operator will not. 
    #list[
    -  Coincidentally, `im.Memo` returns a number, and not a boolean. 
    -  If you want to query the same number of slots as you read the previous frame, you need to chain imMemo using `|` instead of `||`.
    ]
- 
    More subtle, and it's got to do with this part:

``` typescript
    let s; s = im.GetInline(c, im.GetInline);
    if (!s || becameVisible) {
        s = im.Set(c, { ... });
    }
```

    We can't use `im.Memo` between `im.Get` and `im.Set`, so we've had to extract `becameVisible` to it's own variable!
    This is because `im.Memo` also uses `im.Get` and `im.Set` internally to save it's state.
    When `im.Memo` tries to call `im.Get`, we throw an error if we forgot to initialize the previous state entry.
    This is extremely useful for avoiding a particular class of bug.
    I also think it's also a good thing that we've extracted `becameVisble` out to a variable that can be reused by other components,
        as opposed to recomputing it wherever it is consumed. 
    As such, I don't consider this a 'problem' that needs 'fixing'.
]

Something to note - `im.Memo` also returns non-zero if the callsite was not being hit in the previous frame,
    and is being hit in the current frame.
The reason for this is not obvious at all, so I'll elaborate a bit. 
Let's say we make a component that should do something when it recieves custom UI focus:

```ts - imMemo conditional pathway example - Part 1

// TODO: parsing types
// type MemoConditionalPathwayExampleAppState = {
//     currentView: number;
//     logs: string[];
// };

function imMemoConditionalPathwayExample(c: ImCache) {
    const appState = im.GetInline(c, im.GetInline) ??
        im.Set(c, { currentView: 0, logs: [] });
            // TODO: parsing templates
            // <MemoConditionalPathwayExampleAppState>

    imDivBegin(c); {
        if (im.isFirstRender(c)) imdom.setStyle(c, "flex", "1");
        if (im.isFirstRender(c)) imdom.setStyle(c, "width", "100%");
        if (im.isFirstRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstRender(c)) imdom.setStyle(c, "gap", "10px");

        imMemoConditionalPathwayExampleView(c, appState, 0);
        imMemoConditionalPathwayExampleView(c, appState, 1);
        imMemoConditionalPathwayExampleView(c, appState, 2);
    } imDivEnd(c);
    im.For(c); for (const log of appState.logs) {
        imDivBegin(c); {
            imdom.Str(c, log);
        } imDivEnd(c);
    } im.ForEnd(c);
}


function imMemoConditionalPathwayExampleView(
    c: ImCache,
    appState: MemoConditionalPathwayExampleAppState,
    viewId: number,
) {
    const hasFocus = appState.currentView === viewId;

    if ((im.Memo(c, hasFocus) === im.MEMO_CHANGED) && hasFocus) {
        appState.logs.push("Now focused: " + viewId);
        if (appState.logs.length > 3) appState.logs.shift();
    }

    imDivBegin(c); {
        if (im.isFirstRender(c)) {
            imdom.setStyle(c, "flex", "1");
            // o7 sir. Div has been centered. sir o7
            imdom.setStyle(c, "display", "flex");
            imdom.setStyle(c, "alignItems", "center");
            imdom.setStyle(c, "justifyContent", "center");
        }

        if ((im.Memo(c, hasFocus)) === im.MEMO_CHANGED) imdom.setStyle(c, "border", hasFocus ? "1px solid black" : "");

        if (imdom.hasMouseOver(c)) {
            appState.currentView = viewId;
        }

        imdom.Str(c, "View ");
        imdom.Str(c, viewId);
    } imDivEnd(c);
}

```
The view code uses `im.Memo` to run some code, and then log something when it's become focused. 
However, if we decide we want a sightly different UI - maybe we only want one view appearing at a time - the naive 
    implementation of `im.Memo` which only returns true when it's input changes will no-longer work:

```ts - imMemo conditional pathway example - Part 2

function imMemoConditionalPathwayExampleUpdatedReqs(c: ImCache) {
    const appState = im.GetInline(c, im.GetInline) ??
        im.Set(c, { currentView: 0, logs: [] });

    imDivBegin(c); {
        if (im.isFirstRender(c)) imdom.setStyle(c, "flex", "1");
        if (im.isFirstRender(c)) imdom.setStyle(c, "width", "100%");
        if (im.isFirstRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstRender(c)) imdom.setStyle(c, "gap", "10px");

        im.Switch(c, appState.currentView); switch(appState.currentView) {
            case 0: imMemoConditionalPathwayExampleView(c, appState, 0); break;
            case 1: imMemoConditionalPathwayExampleView(c, appState, 1); break;
            case 2: imMemoConditionalPathwayExampleView(c, appState, 2); break;
        } im.SwitchEnd(c);

    } imDivEnd(c);
    imDivBegin(c); {
        if (im.isFirstRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstRender(c)) imdom.setStyle(c, "gap", "10px");
        if (imButtonIsClicked(c, "View 0")) appState.currentView = 0;
        if (imButtonIsClicked(c, "View 1")) appState.currentView = 1;
        if (imButtonIsClicked(c, "View 2")) appState.currentView = 2;
    } imDivEnd(c);
    im.For(c); for (const log of appState.logs) {
        imDivBegin(c); {
            imdom.Str(c, log);
        } imDivEnd(c);
    } im.ForEnd(c);
}

function imMemoConditionalPathwayExampleView(
    c: ImCache,
    appState: MemoConditionalPathwayExampleAppState,
    viewId: number,
) {
    const hasFocus = appState.currentView === viewId;

    // The naive check must be opted into like this:
    if ((im.Memo(c, hasFocus) === im.MEMO_CHANGED) && hasFocus) {
        appState.logs.push("Now focused: " + viewId);
        if (appState.logs.length > 3) appState.logs.shift();
    }

    imDivBegin(c); {
        if (im.isFirstRender(c)) {
            imdom.setStyle(c, "flex", "1");
            // o7 sir. Div has been centered. sir o7
            imdom.setStyle(c, "display", "flex");
            imdom.setStyle(c, "alignItems", "center");
            imdom.setStyle(c, "justifyContent", "center");
        }

        if ((im.Memo(c, hasFocus)) === im.MEMO_CHANGED) imdom.setStyle(c, "border", hasFocus ? "1px solid black" : "");

        if (imdom.hasMouseOver(c)) {
            appState.currentView = viewId;
        }

        imdom.Str(c, "View ");
        imdom.Str(c, viewId);
    } imDivEnd(c);
}

```

As far as each view was concerned, the focus state has never changed - `hasFocus` has always and will always evaluate to `true` 
    for every particular switch case.
However, I think it is very important that this continues to work regardless. 
The solution is to make `im.Memo` always return non-zero if the callsite was not being hit in the previous frame,
    and is being hit in the current frame!
And in this framework, it will by default (and can be opted out of, as I've done in the previous example): 

```ts - im.Memo - conditional pathway example - updated (working)
function imMemoConditionalPathwayExampleUpdatedReqsWorking(c: ImCache) {
    const appState = im.GetInline(c, im.GetInline) ??
        im.Set<MemoConditionalPathwayExampleAppState>(c, { currentView: 0, logs: [] });

    imDivBegin(c); {
        if (im.isFirstRender(c)) imdom.setStyle(c, "flex", "1");
        if (im.isFirstRender(c)) imdom.setStyle(c, "width", "100%");
        if (im.isFirstRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstRender(c)) imdom.setStyle(c, "gap", "10px");

        im.Switch(c, appState.currentView); switch(appState.currentView) {
            case 0: imMemoConditionalPathwayExampleView(c, appState, 0); break;
            case 1: imMemoConditionalPathwayExampleView(c, appState, 1); break;
            case 2: imMemoConditionalPathwayExampleView(c, appState, 2); break;
        } im.SwitchEnd(c);

    } imDivEnd(c);
    imDivBegin(c); {
        if (im.isFirstRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstRender(c)) imdom.setStyle(c, "gap", "10px");
        if (imButtonIsClicked(c, "View 0")) appState.currentView = 0;
        if (imButtonIsClicked(c, "View 1")) appState.currentView = 1;
        if (imButtonIsClicked(c, "View 2")) appState.currentView = 2;
    } imDivEnd(c);
    im.For(c); for (const log of appState.logs) {
        imDivBegin(c); {
            imdom.Str(c, log);
        } imDivEnd(c);
    } im.ForEnd(c);
}


function imMemoConditionalPathwayExampleView(
    c: ImCache,
    appState: MemoConditionalPathwayExampleAppState,
    viewId: number,
) {
    const hasFocus = appState.currentView === viewId;

    // Should work by defualt
    if ((im.Memo(c, hasFocus)) && hasFocus) {
        appState.logs.push("Now focused: " + viewId);
        if (appState.logs.length > 3) appState.logs.shift();
    }

    imDivBegin(c); {
        if (im.isFirstRender(c)) {
            imdom.setStyle(c, "flex", "1");
            // o7 sir. Div has been centered. sir o7
            imdom.setStyle(c, "display", "flex");
            imdom.setStyle(c, "alignItems", "center");
            imdom.setStyle(c, "justifyContent", "center");
        }

        if ((im.Memo(c, hasFocus)) === im.MEMO_CHANGED) imdom.setStyle(c, "border", hasFocus ? "1px solid black" : "");

        if (imdom.hasMouseOver(c)) {
            appState.currentView = viewId;
        }

        imdom.Str(c, "View ");
        imdom.Str(c, viewId);
    } imDivEnd(c);
}

```

