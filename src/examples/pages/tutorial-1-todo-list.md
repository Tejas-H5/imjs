# Tutorial 1 - a TODO List

We will implement the skeleton of a TODO app on this page. 
It should be enough to explain the entire framework well enough that you can 
    use it to make your own stuff. 
It'll take an hour to follow along with at home, and you WILL want to follow along.
It doesn't deal with any web requests or async stuff - it is purely
    a distillation of the the problem space that I built this framework
    for - offline tooling that I could and build quickly, capable
    of doing _whatever_ I wanted with no limitations.


## Part 0 - getting started

You'll need to already know how to set up a blank TypeScript project. 
If you don't, I'd suggest initializing a Vite vanilla TypeScript project,
    and then deleting most of the assets to get to a blank page.
You should be left with a `html` file that pulls in a single `index.ts` file,
    which will be the entrypoint for this tutorial.

#url[Install the framework, /?test=How+to+install+imJS] if you 
    haven't already.

To get started, you'll need to paste this into your entrypoint:

```typescript
import { ImCache, im, imdom } from "im-js";

const globalCache = im.newCache();
imMain(globalCache);

function imMain(c: ImCache) {
    im.CacheBegin(c, imMain); {
        imdom.Begin(c, document.body); {
            imApp(c);
        } imdom.End(c, document.body);
    } im.CacheEnd(c);
}

function imApp(c: ImCahe) {
    imdom.Str(c, "Henlo");
}
```

There's a lot going on here, and I've not been able to explain it well with
    a series of dot-points. 
Instead, here's the same code again with explanatory comments:

```typescript
import {
    ImCache,
    im, // im is the namespace that contains all the core framework primitives.
        // Rather than importing tens of methods, you only need to import this one 
        // object with all the functions on it.
        // Whether you're using this framework in a DOM context, or any other 
        // contexts I decide to support in the future, this will always be relevant.
        // It does NOT retain any global/internal state.
    imdom, // imdom contains anything related to the DOM. It also contains a global
           // event system that is used to allow methods like `imdom.hasMouseOver` to work.
           // The global event system subscribes to events on `document` and `window`, so it's
           // state is also stored as a global variable.
} from "im-js";

const globalCache = im.newCache(); // This is the immediate-mode cache. 
                                   // All framework state lives here.

imMain(globalCache);  // You'll need to call the main method once to kickstart rendering

// By convention, every function that retains immediate-mode state, or calls some other method starting with `im` should itself start with `im`.
// For namespaces starting with `im`, methods starting with a Captial letter like im.Begin() can also be assumed to write immediate-mode state.
// Methods that only read from immediate-mode state don't need to be prefixed with `im`.
// We can already see this from their first `c: ImCache` parameter.
// This convention will be useful later.
function imMain(
    c: ImCache // I could have made this a global variable that I retain in my framework, but I
               // didn't - accepting the parameter explicitly makes it more obvious at the callsite
               // that this method reads from or writes to immediate-mode state. 
               // It is even worth all the `c` being passed in everywhere.
) {
    im.CacheBegin(c, imMain); { // If the cache is not yet initialised, im.CacheBegin initialises the cache, and then
                                // kicks off an animation loop that uses imMain to continuously rerender the UI.

        // This region of code can't render DOM nodes, yet.

        imdom.Begin(c, document.body); { // If the DOM module is not yet initialized, imdom will initialize it, and
                                         // make `document.body` the root where `imApp` can append things to

            // This region now supports rendering things to the DOM, as well as
            // using event-system helpers from `imdom`, like `imdom.hasMouseOver`, 
            // `imdom.keyIsDown`, etc.
            imApp(c);

        } imdom.End(c, document.body);

        // This region of code can no longer render DOM nodes

    } im.CacheEnd(c); // im.CacheEnd does some sanity-checks. 
                      // Were the same number of scopes pushed and popped?
                      // Did we render the same number of entries this render?
                      // If any of these fail, the code throws. 
                      // It also measures how long the render took, which is useful while
                      // developing to know whether your code is any good. 
                      // Code that you put after im.CacheEnd won't be measured, so
                      // you probably never want to do that.
}

// This is where the rest of the examples will take place!
function imApp(c: ImCahe) {
    imdom.Str(c, "Henlo");
}
```

Don't worry too much if you don't get it 100%, it should make more sense
    by the end of the tutorial.

## Part 1 - getting the skeleton of the app in place

Let's get some TODO items drawing:

```ts - Basic skeleton
import { ImCache, im, imdom, el } from "im-js";

// Storing everything in global state for now. 
const items = [
    // Let's keep the tutorial simple, and only store strings instead
    // of structured objects
    "item 1",
    "item 2",
    "item 3",
]

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.H3); {
        imdom.Str(c, "TODO List");
    } imdom.ElEnd(c, el.H3); 

    // NOTE: there is a bug here - we'll fix it later
    for (const item of items) {
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, item);
        } imdom.ElEnd(c, el.DIV);
    }
}
```

Nice! The next thing I want to implement, is adding more items:

```ts - Basic skeleton - adding items - attempt one
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [ "item 1", "item 2", "item 3" ];

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

    // NOTE: there is still a bug here - we'll fix it later
    for (const item of items) {
        imdom.ElBegin(c, el.DIV); imdom.Str(c, item); imdom.ElEnd(c, el.DIV);
    }

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            items.push("item " + items.length);
        }

        imdom.Str(c, "New Item");
    } imdom.ElEnd(c, el.BUTTON);
}
```

Strange - you would have thought that would work, but it didn't:

```
Error: Expected div here, but got button instead - Either your begin/end pairs probably aren't lining up right, or you're conditionally rendering immediate-mode state
```

## Part 1.5 - understanding the core of the framework

Before we can go further, we'll need to understand how the framework actually works.
Every render, immediate-mode methods will push and pop 'immediate-mode entries' on
    the immediate-mode cache. 
These entries are just arrays.
State is saved into them using `im.Get` and `im.Set` like so:

```
function imThing(c: ImCache) {
    let state = im.Get(c, document.createTextNode);
    if (!state) state = im.Set(c, document.createTextNode("Hi"));

    let state2 = im.Get(c, newDomAppender);
    if (!state2) state2 = im.Set(c, newDomAppender(getCurrentParent(c)));

    ...
}
```

All immediate-mode methods will eventually call `im.Get` and `im.Set` at some point
    to retain state between renders, like DOM nodes, the previous text being rendered, 
    so on.
As a result, state becomes associated with the
    callsite by the order in which it was called:

#table[
#row #cell*Code* #cell *Immediate-mode entry list*
#row
#cell
``` typescript
const items = [ "item 1", "item 2", "item 3" ];

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.H3); {       // #1
        imdom.Str(c, "TODO List");   // #2
    } imdom.ElEnd(c, el.H3);         

    for (const item of items) { // items has 3 values
        imdom.ElBegin(c, el.DIV); { // #3, #5, #7
            imdom.Str(c, item);     // #4, #6, #8
        } imdom.ElEnd(c, el.DIV);   
    }

    
    imdom.ElBegin(c, el.BUTTON); { // #9
        const clickEv = imdom.On(c, ev.CLICK); // #10
        if (clickEv) {
            items.push("item " + items.length);
        }

        imdom.Str(c, "New Item"); // #11
    } imdom.ElEnd(c, el.BUTTON); 
}
```
#cell
```text
c[CACHE_CURRENT_ENTRIES]: [
    DomElement{ h3 },  imdom.newDomAppender,     #1
    DomTextElement,    document.createTextNode,  #2

    DomElement{ div }, imdom.newDomAppender,     #3
    DomTextElement,    document.createTextNode,  #4
    DomElement{ div }, imdom.newDomAppender,     #5
    DomTextElement,    document.createTextNode,  #6
    DomElement{ div }, imdom.newDomAppender,     #7
    DomTextElement,    document.createTextNode,  #8

    DomElement{ button },      imdom.newDomAppender,     #9
    Inline state for imdom.On, imdom.On,                 #10
    DomTextElement,            document.createTextNode,  #11
]
```
]

You'll notice that even though we're putting text 'inside' divs and buttons,
    immediate-mode state is still stored linearly. 
This is because the concept of a 'parent' is completely orthogonal to 
    immediate-mode state. 
The only thing that matters is that the same state is accessed in the same order
    every single render, and I hope that the table above has made it obvious why!

(Also if you've used React before, doesn't this sound a lot like the 
    #url[rule of hooks, https://react.dev/reference/rules/rules-of-hooks]? 
Coincidence? I've never read the React sourcecode, but I'll hazard a guess that 
    what they call 'hooks' and what I call 'immediate-mode state' are the same thing,
    though we've implemented it differently)

But we don't just store your state - we store a second thing called the 'type identifier'
    alongside your state. 
Rather than being a number or string, it is a reference to a method that 
    may or may not have been used to construct the state. 
This is more useful than a number, or a literal type id, because:
#list[
- You don't need to generate a bunch of numbers for all your state
- You probably already have a method or two lying around anyway
- Methods can usually associated with a return-type, which can help us out with 
    type-inference when we want it to.
]
This should catch the majority of common conditional/out-of-order rendering bugs.
When they don't line up right, it's because you've started/stopped rendering something in
    that area, which is exactly the kind of bug that we wanted to catch.

In the example above, the `typeId` actually wasn't enough!
If you look closer, the `typeId` for a div, _and_ for a button are both 
    `imdom.newDomAppender`.
So how the heck did `im.Get` and `im.Set` tell them apart? 
It didn't. `imdom` needed to add it's own assertions within the 
    `imdom.ElBegin`/`imdom.ElEnd` method to catch this.
There are sufficiently many begin/end pair assertions in `im` and `imdom` such that 
    you don't have to write them in your own code at all.

Back to the problem at hand - how do we render multiple things, if we need to render
    the same number of things every render?
The answer, is to look at list rendering differently.
Rather rendering n items, we're rendering 1 list, where each loop iteration renders 1 item
    in a repeating manner. 
This is exactly what we achieve with the `im.For` / `im.ForEnd` control-flow annotation.
Let's try adding multiple items again:

```ts - Basic skeleton - adding more items - working
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [ "item 1", "item 2", "item 3" ];

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

    // We have now added im.For(c); here. 
    // I typically write it on the same line as `for` because
    // I think it looks nicer.
    im.For(c); for (const item of items) {
        imdom.ElBegin(c, el.DIV); imdom.Str(c, item); imdom.ElEnd(c, el.DIV);
    } im.ForEnd(c);
    // im.For must be closed off with im.ForEnd. 

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            items.push("item " + (items.length + 1));
        }

        imdom.Str(c, "New Item");
    } imdom.ElEnd(c, el.BUTTON);
}
```

Cool, it works. 
And we were able to fix the `(items.length + 1)` bug as well.

How do callsites get mapped to state now?

#table[
#row #cell*Code* #cell *Immediate-mode entry list*
#row
#cell
``` typescript
const items = [ "item 1", "item 2", "item 3" ];

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.H3); {       // #c0-1
        imdom.Str(c, "TODO List");   // #c0-2
    } imdom.ElEnd(c, el.H3);         

    im.For(c); for (const item of items) { // #c0-3
        imdom.ElBegin(c, el.DIV); { // #c1-1, #c1-3, #c1-5
            imdom.Str(c, item);     // #c1-2, #c1-4, #c1-6
        } imdom.ElEnd(c, el.DIV);   
    } im.ForEnd(c);

    imdom.ElBegin(c, el.BUTTON); { // #c0-4
        const clickEv = imdom.On(c, ev.CLICK); // #c0-5
        if (clickEv) {
            items.push("item " + items.length);
        }

        imdom.Str(c, "New Item"); // #c0-6
    } imdom.ElEnd(c, el.BUTTON); 
}
```
#cell
```text
c[CACHE_CURRENT_ENTRIES + 0]: [
    DomElement{ h3 },  imdom.newDomAppender,     #c0-1
    DomTextElement,    document.createTextNode,  #c0-2

    CacheEntriesList,  im.CacheEntriesBegin      #c0-3

    DomElement{ button },      imdom.newDomAppender,     #c0-4
    Inline state for imdom.On, imdom.On,                 #c0-5
    DomTextElement,            document.createTextNode,  #c0-6
]
c[CACHE_CURRENT_ENTRIES + 1]: [
    DomElement{ div }, imdom.newDomAppender,     #c1-1
    DomTextElement,    document.createTextNode,  #c1-2

    DomElement{ div }, imdom.newDomAppender,     #c1-3
    DomTextElement,    document.createTextNode,  #c1-4

    DomElement{ div }, imdom.newDomAppender,     #c1-5
    DomTextElement,    document.createTextNode,  #c1-6

    ...  growable
]
```
]

The subtle difference for `im.For`, is that it is expected to be variable in length,
but all the same rules still apply. 
State still can't be accessed out-of-order or conditionally.
It does mean you can get a bit clever though - for example, if you wanted to omit a particular
component for the first iteration, but render it for subsequent iterations, 
that is totally valid, since the same indices will still always request the same state:

```ts - Comma seperated list
function imCommaSeperatedList(c: ImCache) {
    for (let i = 0; i < 10; i++) {
        if (i > 0) {
            imdom.Str(c, ", ")
        }

        imdom.Str(c, i);
    }
}
```

If you're expecting to find similar control-flow annotations to be present for switches, 
    if-statements, and try-catch blocks, well done - you've been paying attention. 
Here's what it looks like for if-statements:

```ts - if-statements

function imIfStatementDemo(c: ImCache) {
    const thisSecond = Math.floor(Date.now() / 1000) % 3;
    if (im.If(c) && thisSecond === 0) {
        imdom.Str(c, "This second is perfectly divisble by 3");
    } else if (im.ElseIf(c) && thisSecond === 1) {
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, "This second is NOT perfectly divisbly by 3");
        } imdom.ElEnd(c, el.DIV);
    } else {
        im.Else(c);

        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, "Soon, that will be fixed. ");
        } imdom.ElEnd(c, el.DIV);
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, "Circle of life and all.");
        } imdom.ElEnd(c, el.DIV);
    } im.IfEnd(c);
}

```

Conditional blocks also allow a variable number of immediate-mode state entries, 
    but they are not as flexible as list blocks.
Rather, they allow either `n` entries every render, or 0 entries. 
If 0 entries were rendered, the framework assumes that 
    the corresponding isn't being taken anymore - it can unmount/destroy those entries,
    and prepare the entries for the next branch, so on untill `im.IfEnd`.

Here's what it looks like for switch statements:

```ts - switch-statements

function imSwitchStatementDemo(c: ImCache) {
    const thisSecond = Math.floor(Date.now() / 1000) % 3;
    im.Switch(c, thisSecond); switch(thisSecond) {
        case 0: {
            imdom.Str(c, "This second is perfectly divisble by 3");
        } break;
        case 1: {
            imdom.ElBegin(c, el.DIV); {
                imdom.Str(c, "This second is NOT perfectly divisbly by 3");
            } imdom.ElEnd(c, el.DIV);
        } break;
        case 2: {
            imdom.ElBegin(c, el.DIV); {
                imdom.Str(c, "Soon, that will be fixed. ");
            } imdom.ElEnd(c, el.DIV);
            imdom.ElBegin(c, el.DIV); {
                imdom.Str(c, "Circle of life and all.");
            } imdom.ElEnd(c, el.DIV);
        } break;
    } im.SwitchEnd(c);
}

```

A switch stores a `Map<ValidKey, ImCacheEntries>`, and retrieves the one
    corresponding to the key on demand.
Every unique key is assumed to map to it's own component/state.
Unlike if-branches, switches will actually invoke destructors on their
    elements and free up memory when a branch is not being taken.
This makes them less performant than if-statements, but also less memory-hungry.
The same thing holds true for `im.KeyedBegin` / `im.KeyedEnd`, which we will encounter later.

We also have control-flow annotationsfor try/catch. 
They are a bit more involved, but you'll need them to implement error 
    boundaries in your app:

```ts - try-catch example

function imTryCatchExample(c: ImCache) {
    const tryState = im.Try(c); try {
        const { err, recover } = tryState;
        if (im.If(c) && err) {
            imdom.ElBegin(c, el.DIV); {
                imdom.Str(c, "An error occured:");
            } imdom.ElEnd(c, el.DIV);
            imdom.ElBegin(c, el.DIV); {
                imdom.Str(c, err);
            } imdom.ElEnd(c, el.DIV);
        } else {
            im.Else(c);

            imdom.Str(c, "Gee I hope nothing bad will happen");

            throw new Error("Something bad happend");
        } im.IfEnd(c);
    } catch(err) {
        im.TryCatch(c, tryState, err);

        // Don't actually render anything in this region.
        // The only way to do that is to throw an exception every animation frame.
        // This destroys performance, and pollutes logs.
    } im.TryEnd(c, tryState);
}

```


## Part 2 - onwards

Let's get back to building the TODO list. 

I want to be able to edit some of these items though.
I also don't want them to be center-aligned.
Let's start putting them in text inputs, instead of divs.

To make sure that they're actually updating, let's render 
    a second copy of the list just below our inputs that should update
    in realtime.

```ts - Basic skeleton - adding more items - editing
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [ "item 1", "item 2", "item 3" ];

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            imdom.ElBegin(c, el.DIV); {
                const input = imdom.ElBegin(c, el.INPUT).root; {
                    // Use im.IsFirstRender to run expensive initialisation logic.
                    if (im.IsFirstRender(c)) {
                        input.value = item;
                    }

                    const inputEv = imdom.On(c, ev.INPUT);
                    if (inputEv) {
                        items[itemIdx] = input.value;
                        // Currently, there is one frame of latency between when we edit it here
                        // and when the animation frame rerenders the component. 
                        // This is fine for 99% of usecases.
                        // However, we can get the framework to enqueue a second render pass straight-away
                        // in the same event tick by uncommenting this:
                        // im.rerenderCache(c);
                        // I'm leaving it commented out
                    }
                } imdom.ElEnd(c, el.INPUT);
            } imdom.ElEnd(c, el.DIV);
        } im.ForEnd(c);

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            imdom.ElBegin(c, el.DIV); {
                imdom.Str(c, item);
            } imdom.ElEnd(c, el.DIV);
        } im.ForEnd(c);

        imdom.ElBegin(c, el.BUTTON); {
            const clickEv = imdom.On(c, ev.CLICK);
            if (clickEv) items.push("item " + (items.length + 1));
            imdom.Str(c, "New Item");
        } imdom.ElEnd(c, el.BUTTON);
    } imdom.ElEnd(c, el.DIV);
}
```

Seems like it's working! But I want a way to prioritize my TODO list. 
Let's try adding a way to move things around. 
We'll probably want to make our button component reuseable:

```ts - Basic skeleton - moving around, attempt 1
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [ "item 1", "item 2", "item 3" ];

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            imdom.ElBegin(c, el.DIV); {
                const input = imdom.ElBegin(c, el.INPUT).root; {
                    if (im.IsFirstRender(c)) {
                        input.value = item;
                    }

                    const inputEv = imdom.On(c, ev.INPUT);
                    if (inputEv) {
                        items[itemIdx] = input.value;
                    }
                } imdom.ElEnd(c, el.INPUT);

                if (im.If(c) && itemIdx > 0) {
                    if (imButtonIsClicked(c, "up")) {
                        [items[itemIdx - 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx - 1]];
                    }
                } im.IfEnd(c);


                if (im.If(c) && itemIdx < items.length - 1){ 
                    if (imButtonIsClicked(c, "down")) {
                        [items[itemIdx + 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx + 1]];
                    }
                } im.IfEnd(c);
            } imdom.ElEnd(c, el.DIV);
        } im.ForEnd(c);

        imItemsDebugView(c);

        if (imButtonIsClicked(c, "New item")) {
            items.push("item " + (items.length + 1));
        }
    } imdom.ElEnd(c, el.DIV);
}

function imItemsDebugView(c: ImCache) {
    im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, item);
        } imdom.ElEnd(c, el.DIV);
    } im.ForEnd(c);
}

function imButtonIsClicked(c: ImCache, text: string): boolean {
    let result = false;

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            result = true;
        }
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}
```

It doesn't seem to work. 
Our debug view shows that the items are being moved up and down correctly,
    but the inputs themselves never change. 
It's probably the `im.IsFirstRender` thing that makes the text input
    only sync values on the first render.
Let's just drop that:

```ts - Basic skeleton - still not working
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [ "item 1", "item 2", "item 3" ];

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            imdom.ElBegin(c, el.DIV); {
                const input = imdom.ElBegin(c, el.INPUT).root; {
                    input.value = item;

                    const inputEv = imdom.On(c, ev.INPUT);
                    if (inputEv) {
                        items[itemIdx] = input.value;
                    }
                } imdom.ElEnd(c, el.INPUT);

                if (im.If(c) && itemIdx > 0) {
                    if (imButtonIsClicked(c, "up")) {
                        [items[itemIdx - 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx - 1]];
                    }
                } im.IfEnd(c);


                if (im.If(c) && itemIdx < items.length - 1){ 
                    if (imButtonIsClicked(c, "down")) {
                        [items[itemIdx + 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx + 1]];
                    }
                } im.IfEnd(c);
            } imdom.ElEnd(c, el.DIV);
        } im.ForEnd(c);

        imItemsDebugView(c);

        if (imButtonIsClicked(c, "New item")) {
            items.push("item " + (items.length + 1));
        }
    } imdom.ElEnd(c, el.DIV);
}

function imItemsDebugView(c: ImCache) {
    im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, item);
        } imdom.ElEnd(c, el.DIV);
    } im.ForEnd(c);
}

function imButtonIsClicked(c: ImCache, text: string): boolean {
    let result = false;

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            result = true;
        }
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}

```

It's still not working! 
The input value is being updated so frequently, that we can no longer type our own text in 
    edgewise. 
We need to only update the input's text when the item's text has actually changed.
We can use `im.Memo` for this:

```ts - Basic skeleton - 'working'!
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [ "item 1", "item 2", "item 3" ];

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            imdom.ElBegin(c, el.DIV); {
                const input = imdom.ElBegin(c, el.INPUT).root; {
                    // Use im.Memo to check if a value has changed between frames.
                    if (im.Memo(c, item)) {
                        input.value = item;
                    }

                    const inputEv = imdom.On(c, ev.INPUT);
                    if (inputEv) {
                        items[itemIdx] = input.value;
                    }
                } imdom.ElEnd(c, el.INPUT);

                if (im.If(c) && itemIdx > 0) {
                    if (imButtonIsClicked(c, "up")) {
                        [items[itemIdx - 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx - 1]];
                    }
                } im.IfEnd(c);


                if (im.If(c) && itemIdx < items.length - 1){ 
                    if (imButtonIsClicked(c, "down")) {
                        [items[itemIdx + 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx + 1]];
                    }
                } im.IfEnd(c);
            } imdom.ElEnd(c, el.DIV);
        } im.ForEnd(c);

        imItemsDebugView(c);

        if (imButtonIsClicked(c, "New item")) {
            items.push("item " + (items.length + 1));
        }
    } imdom.ElEnd(c, el.DIV);
}

function imItemsDebugView(c: ImCache) {
    im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, item);
        } imdom.ElEnd(c, el.DIV);
    } im.ForEnd(c);
}

function imButtonIsClicked(c: ImCache, text: string): boolean {
    let result = false;

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            result = true;
        }
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}

```

Seems like it's working! Alright, I also need to start storing whether we've completed
a task or not. We need to make a couple changes:

#list[
- items now needs to become a list of objects. I had thought strings would be enough
    for this demo, but I was wrong.
- We need a checkbox we can use to keep track of the done state.
]


```ts - Basic skeleton - let's add some checkboxes to toggle a DONE state
import { ImCache, im, imdom, el, ev } from "im-js";

function newTodoListItem(name: string) {
    return {
        name: name,
        done: false,
    };
}

const items = [
    // Now a structured object
    newTodoListItem("item 1"),
    newTodoListItem("item 2"),
    newTodoListItem("item 3"),
];


function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            imdom.ElBegin(c, el.DIV); {
                // This is the new checkbox we added.
                // It responds to input events, and toggles the checked state.
                const checkbox = imdom.ElBegin(c, el.INPUT).root; {
                    if (im.IsFirstRender(c)) {
                        imdom.setAttr(c, "type", "checkbox");
                    }

                    // Still need to derive checked from the actual state...
                    // If only there were a better way ...
                    if (im.Memo(c, item.done)) {
                        checkbox.checked = item.done;
                    }

                    const inputEv = imdom.On(c, ev.INPUT);
                    if (inputEv) {
                        item.done = !item.done;
                    }
                } imdom.ElEnd(c, el.INPUT);

                const input = imdom.ElBegin(c, el.INPUT).root; {
                    if (im.Memo(c, item.name)) input.value = item.name;
                    const inputEv = imdom.On(c, ev.INPUT);
                    if (inputEv) {
                        items[itemIdx].name = input.value;
                    }
                } imdom.ElEnd(c, el.INPUT);

                if (im.If(c) && itemIdx > 0) {
                    if (imButtonIsClicked(c, "up")) {
                        [items[itemIdx - 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx - 1]];
                    }
                } im.IfEnd(c);

                if (im.If(c) && itemIdx < items.length - 1){ 
                    if (imButtonIsClicked(c, "down")) {
                        [items[itemIdx + 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx + 1]];
                    }
                } im.IfEnd(c);
            } imdom.ElEnd(c, el.DIV);
        } im.ForEnd(c);

        imItemsDebugView(c);

        if (imButtonIsClicked(c, "New item")) {
            const newItem = newTodoListItem("item " + (items.length + 1));
            items.push(newItem);
        }
    } imdom.ElEnd(c, el.DIV);
}

function imItemsDebugView(c: ImCache) {
    im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, item.name);
            imdom.Str(c, item.done ? "[done]" : "[incomplete]");
        } imdom.ElEnd(c, el.DIV);
    } im.ForEnd(c);
}

function imButtonIsClicked(c: ImCache, text: string): boolean {
    let result = false;

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            result = true;
        }
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}

```

It works! We didn't need to rearchitect very much, and
 not a single closure, or `.map` in sight. Very nice.
And, we didn't have to extract out a list component. 
We can defer that to a point in time where we're better equipped
to make a correct boundary.

## Part 3 - let's get fancy

I think manually checking each box individually is annoying. 
I'd much prefer being able to glissando over them, like how
Vjekoslav is doing in #url[this xeet, https://x.com/vkrajacic/status/2048090943358742628].
Pretty cool! I'm sure other people (including myself) have had
    this idea themselves in the past too, but have found themselves thinking
    "nah, its too complicated for too little gain, and I cant be bothered installing
    a library for this". 
Not the case here - we're already in an animation loop, so let's just implement it:

```ts - Basic skeleton - drag + toggle checkboxes
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [
    newTodoListItem("item 1"),
    newTodoListItem("item 2"),
    newTodoListItem("item 3"),
];

function newTodoListItem(name: string) {
    return {
        name: name,
        done: false,
    };
}


function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

        // We'll need to store whether we have started a glissando or not.
        // When prototyping, we can just use GetInline with any method we have lying around.
        // Unlike Get, GetInline does not tie the return type of the typeId to it's own
        // return type. Instead, it will lie to TypeScript and say it returns `undefined`
        // all the time, so that we fall back on the type returned by `im.Set`, which
        // is what we actually want.
        const state = im.GetInline(c, imTodoList)
            ?? im.Set(c, { startedGliss: false });

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];
            imdom.ElBegin(c, el.DIV); {
                const checkbox = imdom.ElBegin(c, el.INPUT).root; {
                    if (im.IsFirstRender(c)) {
                        imdom.setAttr(c, "type", "checkbox");
                    }

                    if (im.Memo(c, item.done)) {
                        checkbox.checked = item.done;
                    }

                    // I've removed the ev.INPUT event handler. 
                    // If we find this causes accessibility problems,
                    // we'll re-add it later.

                    // We'll make use of the global event system - it has already 
                    // added a bunch of global event handlers that rerender the 
                    // UI in response to any events.
                    const mouse = imdom.getMouse();
                    const hasMouseOver = imdom.hasMouseOver(c);

                    // Mouse over && started -> We can toggle
                    if (im.Memo(c, hasMouseOver) && hasMouseOver && state.startedGliss) {
                        item.done = !item.done;
                    }

                    // Left-mouse pressed -> We can toggle one, and start a gliss
                    // needs to be after we process toggling before.
                    if (imdom.hasMousePress(c) && mouse.leftMouseButton) {
                        state.startedGliss = true;
                        item.done = !item.done;
                    }

                    // Started gliss && no more mouse button -> stop gliss
                    if (state.startedGliss && !mouse.leftMouseButton) {
                        state.startedGliss = false;
                    }
                } imdom.ElEnd(c, el.INPUT);

                const input = imdom.ElBegin(c, el.INPUT).root; {
                    if (im.Memo(c, item.name)) input.value = item.name;
                    const inputEv = imdom.On(c, ev.INPUT);
                    if (inputEv) {
                        items[itemIdx].name = input.value;
                    }
                } imdom.ElEnd(c, el.INPUT);

                if (im.If(c) && itemIdx > 0) {
                    if (imButtonIsClicked(c, "up")) {
                        [items[itemIdx - 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx - 1]];
                    }
                } im.IfEnd(c);


                if (im.If(c) && itemIdx < items.length - 1){ 
                    if (imButtonIsClicked(c, "down")) {
                        [items[itemIdx + 1], items[itemIdx]] 
                            = [items[itemIdx], items[itemIdx + 1]];
                    }
                } im.IfEnd(c);
            } imdom.ElEnd(c, el.DIV);
        } im.ForEnd(c);

        imItemsDebugView(c);

        if (imButtonIsClicked(c, "New item")) {
            const newItem = newTodoListItem("item " + (items.length + 1));
            items.push(newItem);
        }
    } imdom.ElEnd(c, el.DIV);
}

function imItemsDebugView(c: ImCache) {
    im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, item.name);
            imdom.Str(c, item.done ? "[done]" : "[incomplete]");
        } imdom.ElEnd(c, el.DIV);
    } im.ForEnd(c);
}

function imButtonIsClicked(c: ImCache, text: string): boolean {
    let result = false;

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            result = true;
        }
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}

```

This kind of thing was just me typing for around 2 min. 
It's not perfect, but it's pretty close and it was super quick and easy to implement.
Also, the fact that I can write my list component _inline_ without a mandated
refactoring made it easier to try out the idea.

## Part 4 - code cleanup

I think we've been putting it off long enough - let's extract out the list item, 
so that it's easier to work with:

```ts - Basic skeleton - code cleanup
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [
    newTodoListItem("item 1"),
    newTodoListItem("item 2"),
    newTodoListItem("item 3"),
];

function newTodoListItem(name: string) {
    return {
        name: name,
        done: false,
    };
}

function newTodoListState() {
    return { startedGliss: false };
}

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

        // It's typical for GetInline to eventually be cleaned up to
        // be im.State, or im.Get/im.Set when the constructor takes in arguments.
        const state = im.State(c, newTodoListState);

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];

            // You extract this code and call itthe same way you would
            // for any other function.
            imTodoListItem(c, item, itemIdx, state);
        } im.ForEnd(c);

        imItemsDebugView(c);

        if (imButtonIsClicked(c, "New item")) {
            const newItem = newTodoListItem("item " + (items.length + 1));
            items.push(newItem);
        }
    } imdom.ElEnd(c, el.DIV);
}

function imTodoListItem(
    c: ImCache,
    item: TodoListItem,
    itemIdx: number,
    state: TodoListState,
) {
    imdom.ElBegin(c, el.DIV); {
        const checkbox = imdom.ElBegin(c, el.INPUT).root; {
            if (im.IsFirstRender(c)) {
                imdom.setAttr(c, "type", "checkbox");
            }

            if (im.Memo(c, item.done)) {
                checkbox.checked = item.done;
            }

            // I've removed the ev.INPUT event handler. 
            // If we find this causes accessibility problems,
            // we'll re-add it later.

            // We'll make use of the global event system - it has already 
            // added a bunch of global event handlers that rerender the 
            // UI in response to any events.
            const mouse = imdom.getMouse();
            const hasMouseOver = imdom.hasMouseOver(c);

            // Mouse over && started -> We can toggle
            if (im.Memo(c, hasMouseOver) && hasMouseOver && state.startedGliss) {
                item.done = !item.done;
            }

            // Left-mouse pressed -> We can toggle one, and start a gliss
            // needs to be after we process toggling before.
            if (imdom.hasMousePress(c) && mouse.leftMouseButton) {
                state.startedGliss = true;
                item.done = !item.done;
            }

            // Started gliss && no more mouse button -> stop gliss
            if (state.startedGliss && !mouse.leftMouseButton) {
                state.startedGliss = false;
            }
        } imdom.ElEnd(c, el.INPUT);

        const input = imdom.ElBegin(c, el.INPUT).root; {
            if (im.Memo(c, item.name)) input.value = item.name;
            const inputEv = imdom.On(c, ev.INPUT);
            if (inputEv) {
                items[itemIdx].name = input.value;
            }
        } imdom.ElEnd(c, el.INPUT);

        if (im.If(c) && itemIdx > 0) {
            if (imButtonIsClicked(c, "up")) {
                [items[itemIdx - 1], items[itemIdx]] 
                    = [items[itemIdx], items[itemIdx - 1]];
            }
        } im.IfEnd(c);


        if (im.If(c) && itemIdx < items.length - 1){ 
            if (imButtonIsClicked(c, "down")) {
                [items[itemIdx + 1], items[itemIdx]] 
                    = [items[itemIdx], items[itemIdx + 1]];
            }
        } im.IfEnd(c);
    } imdom.ElEnd(c, el.DIV);
}

function imItemsDebugView(c: ImCache) {
    im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, item.name);
            imdom.Str(c, item.done ? "[done]" : "[incomplete]");
        } imdom.ElEnd(c, el.DIV);
    } im.ForEnd(c);
}

function imButtonIsClicked(c: ImCache, text: string): boolean {
    let result = false;

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            result = true;
        }
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}

```

Another thing I've been brushing over, is what happens when you move an item in the list.
Rather than moving the DOM nodes around, only the state moves, and each item component 
    simply rerenders to reflect the state of that index.
We can do much better, with something called 'keyed' rendering.
If you have used any other web framework at all, you already know what this is:

```ts - Basic skeleton - Keyed rendering
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [
    newTodoListItem("item 1"),
    newTodoListItem("item 2"),
    newTodoListItem("item 3"),
];

function newTodoListItem(name: string) {
    return {
        name: name,
        done: false,
    };
}

function newTodoListState() {
    return { startedGliss: false };
}

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

        const state = im.State(c, newTodoListState);

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];

            // We're now using keyed rendering. 
            // If `item` changes position in the list, we will still retain all the 
            // same state/dom nodes for that component, and render them whenever
            // they appear. This significantly reduces churn in the `imTodoListItem` 
            // instances that we render when we change the order of the items.
            // Sometimes, if imTodoListItem is sufficiently simple a component,
            // keying can be slightly less efficient, but this is not 
            // one of those cases.
            im.KeyedBegin(c, item); {
                // By 'keying' this region on 'item', we've told the framework that
                // whatever we render here should have a seperate immediate-mode entry
                // list that we reuse specifically for the key we passed in.
                // Anything can be used as a key, including strings, numbers, and 
                // in this case, object references.
                // Be careful using object references though - if they are stable, you'll be fine.
                // If they're unstable, i.e you're refetching them from the server every 
                // n seconds, you'll want to key on an id field instead.
                imTodoListItem(c, item, itemIdx, state);
            } im.KeyedEnd(c);
        } im.ForEnd(c);

        imItemsDebugView(c);

        if (imButtonIsClicked(c, "New item")) {
            const newItem = newTodoListItem("item " + (items.length + 1));
            items.push(newItem);
        }
    } imdom.ElEnd(c, el.DIV);
}

function imTodoListItem(
    c: ImCache,
    item: TodoListItem,
    itemIdx: number,
    state: TodoListState,
) {
    imdom.ElBegin(c, el.DIV); {
        const checkbox = imdom.ElBegin(c, el.INPUT).root; {
            if (im.IsFirstRender(c)) {
                imdom.setAttr(c, "type", "checkbox");
            }

            if (im.Memo(c, item.done)) {
                checkbox.checked = item.done;
            }

            const mouse = imdom.getMouse();
            const hasMouseOver = imdom.hasMouseOver(c);
            if (im.Memo(c, hasMouseOver) && hasMouseOver && state.startedGliss) {
                item.done = !item.done;
            }
            if (imdom.hasMousePress(c) && mouse.leftMouseButton) {
                state.startedGliss = true;
                item.done = !item.done;
            }
            if (state.startedGliss && !mouse.leftMouseButton) {
                state.startedGliss = false;
            }
        } imdom.ElEnd(c, el.INPUT);

        const input = imdom.ElBegin(c, el.INPUT).root; {
            if (im.Memo(c, item.name)) {
                input.value = item.name;
            }

            const inputEv = imdom.On(c, ev.INPUT);
            if (inputEv) items[itemIdx].name = input.value;
        } imdom.ElEnd(c, el.INPUT);

        if (im.If(c) && itemIdx > 0) {
            if (imButtonIsClicked(c, "up")) {
                [items[itemIdx - 1], items[itemIdx]] 
                    = [items[itemIdx], items[itemIdx - 1]];
            }
        } im.IfEnd(c);


        if (im.If(c) && itemIdx < items.length - 1){ 
            if (imButtonIsClicked(c, "down")) {
                // This interaction has now broken.
                [items[itemIdx + 1], items[itemIdx]] 
                    = [items[itemIdx], items[itemIdx + 1]];
            }
        } im.IfEnd(c);
    } imdom.ElEnd(c, el.DIV);
}

function imItemsDebugView(c: ImCache) {
    im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, item.name);
            imdom.Str(c, item.done ? "[done]" : "[incomplete]");
        } imdom.ElEnd(c, el.DIV);
    } im.ForEnd(c);
}

function imButtonIsClicked(c: ImCache, text: string): boolean {
    let result = false;

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            result = true;
        }
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}

```

The component no longer needs to be coded with the assumption that the
    item it is bound to will change - instead, the framework will 
    always use the same immediate-mode entry list for the same item.

Try clicking the up/down buttons, and you'll notice something funny. 
"Up" works just fine. "Down", however:

```text
An error has occured at runtime:
Error: You have already rendered to this key
```

This is a special class of error that happened because of the way we're
    swapping our list items:

```typescript
if (imButtonIsClicked(c, "down")) {
    // This interaction has now broken.
    [items[itemIdx + 1], items[itemIdx]] 
        = [items[itemIdx], items[itemIdx + 1]];
}
```

Basically, we have mutated the same data structure that we're currently
    in the middle of rendering!
In the frame where we click "down", the current item moves to the next
    list position, and the next item moves to where we currently are. 

```
single frame:
    iteration 1: 

    item1, <-- currently rendering item 1, but we swapped it with item2 due to clicking "down".
    item2,

    iteration 2:

    item2, 
    item1, <-- now we're rendering item 1 again

```

We've effectively told the framework to render the current item twice. 
The way to avoid this class of error completely, is to never mutate the datastructure
    you're rendering while you're rendering it. 
This is not a new phenomenon - it's known as #url[state tearing, https://x.com/rfleury/status/2059771769234633054].
I will keep this a hard error, since the alternatives aren't that good.
This doesn't happen for the up button, because we've swapped the current value with the previous value,
so the next iteration will still be for a new value.

I've found that the simplest and most controlable way to defer this mutation, 
    short of encoding all state mutations as command objects,
    is by adding a 'deferred event' to your main UI's state.
We should just do this for all mutations on the state we're rendering:

```ts - Basic skeleton - Keyed rendering, and moving works
import { ImCache, im, imdom, el, ev } from "im-js";

const items = [
    newTodoListItem("item 1"),
    newTodoListItem("item 2"),
    newTodoListItem("item 3"),
];

function newTodoListItem(name: string) {
    return {
        name: name,
        done: false,
    };
}

function newTodoListState() {
    return {
        startedGliss: false,
        deferredEvent: null, // but it could be a () => void.
    };
}

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.H3); imdom.Str(c, "TODO List"); imdom.ElEnd(c, el.H3); 

        const state = im.State(c, newTodoListState);

        im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
            const item = items[itemIdx];

            im.KeyedBegin(c, item); {
                imTodoListItem(c, item, itemIdx, state);
            } im.KeyedEnd(c);
        } im.ForEnd(c);

        // Run any events generated by imTodoListItem
        // _after_ we've rendered the todo list. 
        // Also notice how we've written it - if `event` 
        // were to throw, we don't want state.deferredEvent to remain set,
        // and run a second time, so we're grabbing and clearing it
        // before we even call it.
        let event = state.deferredEvent;
        state.deferredEvent = null;
        if (event) {
            event();
        }

        imItemsDebugView(c);

        if (imButtonIsClicked(c, "New item")) {
            const newItem = newTodoListItem("item " + (items.length + 1));
            items.push(newItem);
        }
    } imdom.ElEnd(c, el.DIV);
}

function imTodoListItem(
    c: ImCache,
    item: TodoListItem,
    itemIdx: number,
    state: TodoListState,
) {
    imdom.ElBegin(c, el.DIV); {
        const checkbox = imdom.ElBegin(c, el.INPUT).root; {
            if (im.IsFirstRender(c)) imdom.setAttr(c, "type", "checkbox");

            if (im.Memo(c, item.done)) checkbox.checked = item.done;

            const mouse = imdom.getMouse();
            const hasMouseOver = imdom.hasMouseOver(c);
            if (im.Memo(c, hasMouseOver) && hasMouseOver && state.startedGliss) item.done = !item.done;
            if (imdom.hasMousePress(c) && mouse.leftMouseButton) {
                state.startedGliss = true;
                item.done = !item.done;
            }
            if (state.startedGliss && !mouse.leftMouseButton) state.startedGliss = false;
        } imdom.ElEnd(c, el.INPUT);

        const input = imdom.ElBegin(c, el.INPUT).root; {
            if (im.Memo(c, input.name)) input.value = item.name;
            const inputEv = imdom.On(c, ev.INPUT);
            if (inputEv) items[itemIdx].name = input.value;
        } imdom.ElEnd(c, el.INPUT);

        if (im.If(c) && itemIdx > 0) {
            // Even though 'up' technically isn't bugged, we should
            // just make this the convention for all events that mutate
            // the state we're rendering.
            if (imButtonIsClicked(c, "up")) {
                state.deferredEvent = () => {
                    [items[itemIdx - 1], items[itemIdx]] 
                        = [items[itemIdx], items[itemIdx - 1]];
                }
            }
        } im.IfEnd(c);

        if (im.If(c) && itemIdx < items.length - 1){ 
            if (imButtonIsClicked(c, "down")) {
                // This itneraction should now be fixed
                state.deferredEvent = () => {
                    [items[itemIdx + 1], items[itemIdx]] 
                        = [items[itemIdx], items[itemIdx + 1]];
                }
            }
        } im.IfEnd(c);
    } imdom.ElEnd(c, el.DIV);
}

function imItemsDebugView(c: ImCache) {
    im.For(c); for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
        const item = items[itemIdx];
        imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, item.name);
            imdom.Str(c, item.done ? "[done]" : "[incomplete]");
        } imdom.ElEnd(c, el.DIV);
    } im.ForEnd(c);
}

function imButtonIsClicked(c: ImCache, text: string): boolean {
    let result = false;

    imdom.ElBegin(c, el.BUTTON); {
        const clickEv = imdom.On(c, ev.CLICK);
        if (clickEv) {
            result = true;
        }
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);

    return result;
}

```


### The end

Congrats! You've built a todo list where you can edit the items, mark them as done/undone,
and re-prioritise the items. 
It doesn't look particularly nice - this was an imJS tutorial, not a UI design one. 

You've also learned exactly how the framework works, and how to use every feature.
The time has come for you to start building that idea you've had bouncing around
inside your head!
Right now actually - delete this silly todo list app, spend the next 5 minutes on your 
idea and see how far you get.

Still not sure what to do? Check out the next tutorial. 
It introduces a couple of ideas that we haven't seen in this one yet.
