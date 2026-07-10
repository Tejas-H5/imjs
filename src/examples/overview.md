# Overview

imJS is an immediate-mode web-UI framework I created due to my frustration with existing solutions. 
I discuss every design choice in detail #url[on this page, "https://github.com/Tejas-H5/imjs/blob/main/Why.md"].
This page just explains how to use ImJS to build things if you've never used it before.
I hope you're on Keyboard+Mouse - if not, this page won't be very nice to use right now. 
I intend to fix at some point in the distant future.

## How to install

imJS is actually written entirely in TypeScript. I just didn't like the name imTS very much. In order to use it, 
you'll need to copy the im-js folder into somewhere in your project. Ideally, some sort of absolute path
where you can just import it like `import { ... } from "im-js"`.

#list[
#dot 
    `im-core` contains immediate-mode primitives that you will need for control-flow and state management.
#dot 
    `im-dom` is the DOM adapter for im-core, and gives you utilities for building and controlling the DOM via the framework, 
    and global event hooks to respond to common user input. It is by no means a 100% comprehensive DOM wrapper, and you may 
    need to create your own utility methods to do some things.
#dot
    By looking at how im-dom works, you can in theory build an adapter for any other tree structure. 
]

This repo also contains an im-ui folder with all the UI components I use in my projects. It is completely optional. 
Just copy the ones you want into your project as you need, and make any necessary changes.

## Creating components

Components are just imperative procedures, and the act of rendering is imperative in nature.
This is primarily for performance reasons. Despite this, the code itselfs can look quite declarative.
Control-flow is not so straightforward though, and I'll discuss this later. 
For now, here's a simple component that renders the current date/time:

```ts - A simple component - date time
import { ImCache, imdom, el } from "im-js";

function imDateTimeViewer(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.Str(c, "Today's date is ");
        imdom.Str(c, new Date());
    } imdom.ElEnd(c, el.DIV);
}
```

There is actually _a lot_ going on here, so let's unpack it:

#list[
#dot 
    imdom.ElBegin is a method that opens an immediate-mode scope, within which more DOM nodes may be rendered. 
    This scope must eventually be closed off with another call to imdom.ElEnd. 
    The convention here is that any function named imXBegin can be assumed to open some kind of scope that must be 
        closed off with a call to a corresponding imXEnd method. 
    User methods that aren't suffixed with 'Begin' can be assumed to not create a scope.
#dot
    For imdom.ElBegin to be performant, it must create a DOM element on the first render, and then reuse it on subsequent renders. 
    The 'c' is the immediate-mode cache where imdom.ElBegin saves it's div. 
    This cache is passed to every immediate mode function, as that makes it more explicit that a function reads from the 
        immediate-mode cache somehow. 
    The 'im' prefix is only for methods that actually write entries into the immediate mode state, which will be important later.
#dot
    Between imdom.Begin and imdom.End, there are two calls to imStr. 
    This method creates a single Text node under the current DOM element, and updates the text whenever the object reference changes by 
        calling by calling toString() on this object.
#dot
    Since the entire framework runs in an animation loop, state can be read directly from anywhere without making any framework-specific 
        adapters. 
    This expression will always be up-to-date.
]

The fact that state can be read from anywhere is half the benefit of framework.
Let's make something a tiny bit more complicated - the counter example that the other frameworks all use in their docs:

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

I've ommited the imports for brevity. 
This example is not much more complicated than the other example, but a couple more things are happening:

#list[
#dot
    `im.Get`, `im.GetInline`, `im.Set` are the state-management primitives that all methods use to save immediate-mode 
        state entries.
#dot
    `imGet(c, typeId)` requests state at the current index, increments the index, then either returns what we set in 
    the previous frame, or undefined. 
#dot
    It will panic if the typeId does not line up with the typeId that was issued at that index in the previous frame.
    This is important - if you were to gate a call to `im.Get()` behind an if-statement, it
    would move all subsequent calls to im.Get one index over, which can lead to silent data corruption!
    Before getting state, we check that the typeId specified this frame is the same as the one we already have,
        and then throw if that isn't the case to avoid this bug.
#dot
    As such, a `typeId` is simply a locally unique reference used to identify a particular piece of state in the
    current component.
    I've decided to make it a function, because you've probably always got some kind of function lying around that
    you can just use!
    It was way better than defining a bunch of unique integers everywhere.
#dot
    `im.Get` will actually assume that the function you used as the unique local identifier
    for a piece of state was the constructor for that state (a common idiom), and as such, can infer 
    it's return type. 
#dot
    However, it's a bit tedious to define constructors for every piece of state while you're prototyping - 
    `im.GetInline` is like `im.Get`, except we can specify any typeId at all, and it will not use type-inference to link 
        the typeId to a return type, allowing us to create state directly inline without creating any constructor methods.
#dot
    `im.Set` will write to the current immediate-mode slot. 
    It MUST be called before the next call to `im.Get`, if the slot hasn't been initialised at least once. 
    The bug is fairly common, so we throw when you don't do this.
#dot
    `imdom.On` is a DOM-related immediate-mode helper that wraps the `addEventListener` callback. 
    Whenever that callback fires, your entire app will be synchronously rerendered, so that
        methods on the event object like `ev.preventDefault()` can be called and work. 
    When the particular subtree is 'destroyed', the event listener will automatically be removed.
]

You'll notice that it's quite a bit verbose. Luckily, our code isn't in any arbitrary DSL - they are just function calls!
We can just refactor/compress it as if it were any other code. Doing it now will also help clean up the next examples:

```ts Counter - refactored

function imSimpleComponentCounterRefactored(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });

    imDivBegin(c); {
        imStr(c, "The count is ");
        imStr(c, s.count);
    } imDivEnd(c);

    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);
}

function imStr(c: ImCache, val: Stringifyable) {
    imdom.Str(c, val);
}

function imDivBegin(c: ImCache) {
    imdom.ElBegin(c, el.DIV);
}

function imDivEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}

function imExampleButtonIsClicked(c: ImCache, text: string): MouseEvent | null {
    let result: MouseEvent | null = null;
    imdom.ElBegin(c, el.BUTTON); {
        result = imdom.On(c, ev.MOUSEDOWN);
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);
    return result;
}

```

`imSimpleComponentCounterRefactored` is WAY more readable now. Defining your state and UI layout directly within
control flow in this way is the other half of the benefit of using this framework.
Writing new components becomes a LOT easier.

## However, there is a problem - control flow

The framework interleaves immediate-mode entries as a series of `[type][value]` entries to mitigate out-of-order reading bugs, 
    as mentioned earlier. 
*However, this only works if the next render reads from the cache in the exact same order that the previous render wrote to it!*
The restriction is quite similar to the #url[rule of hooks, https://react.dev/reference/rules/rules-of-hooks], 
    which you will be all too familiar with if you've ever used React to a serious degree.
This sounds very restrictive. How will we ever be able to do conditional rendering or list rendering? 
Sadly, it's not magic - this next component will actually stop working after incrementing the count 
    changes the current conditional pathway the code is in: 

```ts - Conditional rendering - but sadly, it doesn't just work
function imConditionalRenderingExampleIfStatementBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);

    imDivBegin(c); {
        if (s.count < 3) {
            imdom.Str(c, "It's time to pump up those numbers, rookie.");
        } else {
            imdom.ElBegin(c, el.B); {
                imdom.Str(c, "Gee, that's a high count! ");
            } imdom.ElEnd(c, el.B);
        } 
    } imDivEnd(c);

    imDivBegin(c); {
        imdom.Str(c, s.count);
    } imDivEnd(c);
}
```

`Error: Expected to populate this cache entry with type=imStr, but got newDomAppender. 
    Either your begin/end pairs probably aren't lining up right, or you're conditionally rendering immediate-mode state`.
This is because in one render, the code on line 11 (`imdom.Str`) requests the state for a DOM Text node. 
But in the next render, the code accessing that immediate-mode slot would be line 13 (`imdom.ElBegin`), which requests the state for a 
    DOM element instead.
The solution this framework has settled on, is for you to annotate if-blocks with calls to `im.If`, `im.IfElse`, `im.Else` and `im.IfEnd`:

```ts - Conditional rendering - using control flow annotations

function imConditionalRenderingExampleIfStatementNotBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);

    imDivBegin(c); {
        if (im.If(c) && s.count < 3) {
            imdom.Str(c, "It's time to pump up those numbers, rookie.");
        } else {
            im.Else(c);
            imdom.ElBegin(c, el.B); {
                imdom.Str(c, "Gee, that's a high count! ");
            } imdom.ElEnd(c, el.B);
        } im.IfEnd(c);
    } imDivEnd(c);

    imDivBegin(c); {
        imdom.Str(c, s.count);
    } imDivEnd(c);
}

```

Now, in one render, the  method calls look like `im.If`, `<some stuff>`, `im.IfEnd`, and in a subsequent render, 
    the method calls look like `im.If`, `im.Else`, `<some stuff>`, `im.IfEnd`. 
If `im.IfElse` was called, the framework can infer that the first if-branch wasn't taken, and can prepare a 
    separate entries list for the next branch. 
I'm not gonna lie - if we could get the framework working without this, that would be way nicer.
I do think it's a better solution to immediate-mode than the alternative solutions of disallowing state from being stored 
    in the immediate-mode tree, or using ids to disambiguate all your state.

You'll need to do something similar for for-loops. 
In this example, the immediate-mode code in the for-loop will start eating into the state of things we rendered outside the for-loop:

```ts - List rendering - broken
function imListRenderingExampleBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }

        for (let i = 0 ; i < s.count; i++) {
            if (i > 0) imdom.Str(c, ", ");
            imdom.Str(c, i);
        }

        imdom.Str(c, "The count is ");
        imdom.Str(c, s.count);
    } imDivEnd(c);
}
```

`Error: You should be rendering the same number of things in every render cycle`. 
If the framework doesn't emit this error, we have no other way of knowing about this state-collision bug 
    because the types of the two state are actually the same.

The framework deals with for-loops with the im.For and im.ForEnd methods: 

```ts - List rendering - Fixed
function imListRenderingExampleBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }

        im.For(c); for (let i = 0 ; i < s.count; i++) {
            if (i > 0) imdom.Str(c, ", ");
            imdom.Str(c, i);
        } im.ForEnd(c);

        imdom.Str(c, "The count is ");
        imdom.Str(c, s.count);
    } imDivEnd(c);
}
```

The list rendering doesn't need to be done with a for-loop - any kind of iteration is fine. 
You could have just as easily written it with .forEach or for-of, a while loop, a custom iteration function, etc. 
    as long as it isn't asyncronous.
In order to render a list of complicated items, it can be more performant to reuse the same 'entries block' for the same item 
    if it's position in the list is going to change.
To do this, you can key your list items with im.KeyedBegin/End. 
You may also want to render a different 'type' of component per item:

```ts - List rendering - keyed
function imListRenderingExampleKeyed(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? 
        im.Set(c, {
            items: [1, 2, 3, 4, 5].map(id => ({ id, isBold: id % 2 === 0 })),
        });

    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Shuffle items")) {
            s.items.sort(() => Math.random() - 0.5);
        }
        im.For(c); for (const item of s.items) {
            im.KeyedBegin(c, item); {
                if (item.isBold) {
                    imDivBegin(c); {
                        imdom.ElBegin(c, el.B); {
                            imdom.Str(c, item.id);
                        } imdom.ElEnd(c, el.B);
                    } imDivEnd(c);
                } else {
                    imDivBegin(c); {
                        imdom.Str(c, item.id);
                    } imDivEnd(c);
                }
            } im.KeyedEnd(c);
        } im.ForEnd(c);
    } imDivEnd(c);
}
```

It's a bit of a contrived example, since I could have just as easily wrote it without keying:

```ts - List rendering - not keyed

function imListRenderingExampleNotKeyed(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { 
        items: [1, 2, 3, 4, 5].map(id => ({ id, isBold: id % 2 === 0 })),
    });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Shuffle items")) {
            s.items.sort(() => Math.random() - 0.5);
        }
        im.For(c); for (const item of s.items) {
            if (im.If(c) && item.isBold) {
                imDivBegin(c); {
                    imdom.ElBegin(c, el.B); {
                        imdom.Str(c, item.id);
                    } imdom.ElEnd(c, el.B);
                } imDivEnd(c);
            } else {
                im.Else(c);
                imDivBegin(c); {
                    imdom.Str(c, item.id);
                } imDivEnd(c);
            } im.IfEnd(c);
        } im.ForEnd(c);
    } imDivEnd(c);
}

```

However, it does start making a difference when the component for each item is it's own highly complex component, 
    so it's worth knowing about. 
For now, you'll have to take my word for it, because I'm not about to write a thousand line component to prove it in this overview. 

There are other times where you'll want to to dispatch to a particular component based on 'the current view', 
    however that may be represented. 
You may think to reach for `im.Keyed`, but it won't work if someone tries to use your component twice in their block:

```ts - im.Keyed keys can't be reused in the scope
function imSwitchExampleWithKeyedUsageCode(c: ImCache) {
    imSwitchExampleWithKeyedDontDoItLikeThis(c);
    imSwitchExampleWithKeyedDontDoItLikeThis(c);
}

function imSwitchExampleWithKeyedDontDoItLikeThis(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ??
        im.Set(c, { view: "a" });

    im.KeyedBegin(c, s.view); switch (s.view) {
        case "a": {
            imDivBegin(c); {
                imdom.Str(c, "View A");
            } imDivEnd(c);
        } break;
        case "b": {
            imDivBegin(c); {
                imdom.ElBegin(c, el.B); {
                    imdom.Str(c, "View B");
                } imdom.ElEnd(c, el.B);
            } imDivEnd(c);
        } break;
    } im.KeyedEnd(c);
}
```

`You have already rendered to this key`. 
I am thinking about other ways to handle duplicate keys more gracefully, but this bug in particular is actually a you-problem, 
    and will be present in all those alternate iterations of the framework as well. 
`im.Keyed` shares it's keys amongst all other entries under the current scope, and it is a bug to render to the same key twice. 
This is where im.Switch comes in.
It's the same as `im.Keyed`, but within it's own separate immediate-mode scope. 
The usage code from earlier should work now:

```ts - imSwitch example

function imSwitchExampleUsageCode(c: ImCache) {
    imSwitchExample(c);
    imSwitchExample(c);
}

function imSwitchExample(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ??
        im.Set(c, { view: "a" });

    im.Switch(c, s.view); switch (s.view) {
        case "a": {
            imDivBegin(c); {
                imdom.Str(c, "View A");
            } imDivEnd(c);
        } break;
        case "b": {
            imDivBegin(c); {
                imdom.ElBegin(c, el.B); {
                    imdom.Str(c, "View B");
                } imdom.ElEnd(c, el.B);
            } imDivEnd(c);
        } break;
    } im.SwitchEnd(c);
}
```
The final piece of control flow you'll need, is some way to handle exceptions that get thrown while your component is rendering. 
They can come from this framework, or from any code at all really. 
Without an error boundary, the current behaviour is for the animation loop to abruptly stop working, while leaving the app intact.
It's actually not a good behaviour - a user may not even realise that the app has crashed till they try clicking a button. 
And, the button would still work since events can trigger a full rerender of the app in addition to the animation loop! 
<TODO: we gotta handle this better>. 
For now, it's recommended that you have at least one error boundary at the root of your program. 
Error boundaries are implemented by annotating try/catch in a similar way to how we do if-statements, for-loops, and switch statements:


```ts - Error boundary try-catch example

function imErrorBoundaryExampleView(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, {
        orbitalNukes: 3,
    });

    imDivBegin(c); {
        imdom.Str(c, "Orbital nukes remaining: ");
        imdom.Str(c, s.orbitalNukes);
    } imDivEnd(c);

    const tryState = im.Try(c); try {
        const { err, recover } = tryState;

        if (im.If(c) && err) {
            imDivBegin(c); {
                imdom.Str(c, "An error occured: ");
                imdom.Str(c, err);
            } imDivEnd(c);
            imDivBegin(c); {
                if (imExampleButtonIsClicked(c, "Dismiss error")) {
                    recover();
                }
            } imDivEnd(c);
        } else if (im.Else(c)) { 
            if (imExampleButtonIsClicked(c, "Click here to launch orbital nuke!")) {
                if (s.orbitalNukes <= 0) throw new Error("All orbital nukes have already been used");
                s.orbitalNukes--;
            }
        } im.IfEnd(c);
    } catch (err) {
        im.Catch(c, tryState, err);
    } im.TryEnd(c, tryState);
}
```

## State management - initialisation, destruction

There are primarily two ways to initialize state. 
The first, and most common way, is to call `isFirstRender(c)` to check if this is the first time the component is being rendered:

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

    if (imExampleButtonIsClicked(c, "Toggle mouse tracking")) {
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

    if (imExampleButtonIsClicked(c, "Toggle mouse tracking")) {
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
            if (imExampleButtonIsClicked(c, "Increment count")) {
                s.count++;
            }
        } imDivEnd(c);
    } imDivEnd(c);
}
```

Some things to notice:

#list[
#dot
    `im.Set` can be called again later, to overwrite/reset the state. 
    By default, the state is persisted unless destroyed, but here we've decided to reset it out whenever we re-attatch 
        the component as well. 
    Be careful that you aren't adding any destructuors in that initialisation block though - the previous destructor may not have ran.
#dot
    The Regular logical-or `||` operator will short-circuit, but the bitwise-or `|` operator will not. 
    #list[
    #dot Coincidentally, `im.Memo` returns a number, and not a boolean. 
    #dot If you want to query the same number of slots as you read the previous frame, you need to chain imMemo using `|` instead of `||`.
    ]
#dot
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
        if (imExampleButtonIsClicked(c, "View 0")) appState.currentView = 0;
        if (imExampleButtonIsClicked(c, "View 1")) appState.currentView = 1;
        if (imExampleButtonIsClicked(c, "View 2")) appState.currentView = 2;
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
    // const appState = im.GetInline(c, im.GetInline) ??
    //     im.Set<MemoConditionalPathwayExampleAppState>(c, { currentView: 0, logs: [] });
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
        if (imExampleButtonIsClicked(c, "View 0")) appState.currentView = 0;
        if (imExampleButtonIsClicked(c, "View 1")) appState.currentView = 1;
        if (imExampleButtonIsClicked(c, "View 2")) appState.currentView = 2;
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

## Well done!

I'm surprised you made it this far, congrats! 
You now know the framework well enough to read and understand the rest of the code, and make basically anything! 
Take a look at im-ui for more ideas of how to structure your code, if needed. 
Time to start building!

## Future scope

#list[
#dot
The global event system currently doesn't work well for mobile/touch interactions, need to fix that
#dot
In the future, I plan on making a static analysis tool (probably just an eslint rule) that matches imXBegin and imXEnd 
    and lets you know at compile time if these opening/closing pairs are matching or not. 
It turns out to be hard to solve this without making the code overly verbose, and this framework has a LOT of assertions 
    in place specifically to catch bugs relating to this.
#dot
It currently doesn't have SSR, and though there is no technical limitation that makes it impossible - 
    I simply don't care to implement it at the moment. 
But I am not against including it later.
#dot
Suspense boundaries not implemented yet.
I haven't stress-tested the framework on client-server stuff as much as I have for
    local storage/indexed-db use cases, but I may end up doing this 
    when I eventually get around to it.
]

## Out of scope

There are some things that I have specifically planned never work on:

#list[
#dot
There will never be an imJS dev-tools. 
Most things can just be done using the existing browser devtools, and this is especially the case with this framework.
#dot
HMR (Hot-module-reloading support) - the implementation details of the framework make adding it too complicated and 
    not really super worth it. 
I did not build this framework with HMR in mind at all - I would rather have a small app that can be rebuild 
    instantly than an app that takes ages to rebuild, but supports HMR, but the HMR still takes a few seconds, 
    and every now and then it causes bugs, etc. etc. 
It is too difficult to evolve my apps alongside it. 
Just persist the current state of your program to localStorage/indexedDB as needed. 
The dev-server I use can also reload my program so quickly that there is no real benefit to having HMR. 
I've had set up a custom esbuild context, but with a custom server that has an extra long KeepAlive setting 
    on the connection (surprisingly effective).
    (Someone has since figured out #url[the real issue, https://github.com/vitejs/vite/issues/21653] that my local KeepAlive solution hid)
#dot
I also plan to never introduce a mechanism by which you can manually render just a subset of the UI tree, or keep some subset of your website 'static', with dynamic islands. The complexity is not worth it - just animate the entire page.
]



```ts - Dev tools? Aint no way?!

const cnHighlight = "highlighted";

let lastDomNode: DomAppender<HTMLElement> | undefined;
let nextDomNode: DomAppender<HTMLElement> | undefined;

function imJsDevToolsFinalRelease(c: ImCache, entries = im.getRootEntries(c), introspectorRoot: any = null) {
    const isRoot = !introspectorRoot;
    if (!introspectorRoot) introspectorRoot = im.getCurrentCacheEntries(c);
    if (entries === introspectorRoot) return; // Dont recurse into dev tools

    let visible = true;

    if (isRoot) {
        if (lastDomNode !== nextDomNode) {
            if (lastDomNode) imdom.setClass(c, cnHighlight, false, lastDomNode.root);
            if (nextDomNode) imdom.setClass(c, cnHighlight, true, nextDomNode.root);

            lastDomNode = nextDomNode;
        }

        const visibility = imdom.TrackVisibility(c, 0);
        visible = visibility.isVisible;
        nextDomNode = undefined;
    }

    if (im.If(c) && !visible) {
        imdom.Str(c, "Nah");
    } else {
        im.Else(c);

        if (isRoot) {
            imDivBegin(c); {
                if (im.isFirstRender(c)) imdom.setStyle(c, "position", "fixed");
                if (im.isFirstRender(c)) imdom.setStyle(c, "bottom", "10px");
                if (im.isFirstRender(c)) imdom.setStyle(c, "left", "10px");
                if (im.isFirstRender(c)) imdom.setStyle(c, "backgroundColor", cssVars.bg);

                imdom.Str(c, "Devtool enabled. 😭😭🥀");

                imdom.Str(c, lastDomNode?.root ?? "[Object object]");

                imdom.ElBegin(c, el.STYLE); {
                    if (im.isFirstRender(c)) {
                        imdom.setTextContent(c, `.${cnHighlight} { outline: 10px solid #FF00FF; }`);
                    }
                } imdom.ElEnd(c, el.STYLE);
            } imDivEnd(c);
        }

        imDivBegin(c); {
            if (im.isFirstRender(c)) imdom.setStyle(c, "flex", "1");
            if (im.isFirstRender(c)) imdom.setStyle(c, "paddingLeft", "20px");

            im.For(c); im.ForEachCacheEntryItem(entries, (t, v) => {
                if (t === imdom.newDomAppender) {
                    const value = v as DomAppender<HTMLElement>;
                    imdom.ElBegin(c, el.DIV); {
                        const root = imDivBegin(c); {
                            imdom.Str(c, value.root);
                        } imDivEnd(c);

                        const hasMouseOverActualElement = imdom.hasMouseOver(c, (value as DomAppender<HTMLElement>).root);

                        if (imdom.hasMouseOver(c) || hasMouseOverActualElement) {
                            nextDomNode = value;
                        }

                        imdom.setClass(c, cnHighlight, lastDomNode === value, root.root);
                    } imdom.ElEnd(c, el.DIV);
                } else if (t === im.ImmediateModeBlockBegin) {
                    const value = v as ImCacheEntries;
                    imJsDevToolsFinalRelease(c, value, introspectorRoot);
                }
            }); im.ForEnd(c);
        } imDivEnd(c);
    } im.IfEnd(c);
}

```

