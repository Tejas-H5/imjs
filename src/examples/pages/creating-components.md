## Creating components

Components are just imperative procedures, and the act of rendering is imperative in nature.
This is primarily for performance/convenience reasons. Despite this, the code itselfs can look quite declarative.
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
-   imdom.ElBegin is a method that opens an immediate-mode scope, within which more DOM nodes may be rendered. 
    This scope must eventually be closed off with another call to imdom.ElEnd. 
    The convention here is that any function named imXBegin can be assumed to open some kind of scope that must be 
        closed off with a call to a corresponding imXEnd method. 
    User methods that aren't suffixed with 'Begin' can be assumed to not create a scope.
-   For imdom.ElBegin to be performant, it must create a DOM element on the first render, and then reuse it on subsequent renders. 
    The 'c' is the immediate-mode cache where imdom.ElBegin saves it's div. 
    This cache is passed to every immediate mode function, as that makes it more explicit that a function reads from the 
        immediate-mode cache somehow. 
    The 'im' prefix is only for methods that actually write entries into the immediate mode state, which will be important later.
-   Between imdom.Begin and imdom.End, there are two calls to imStr. 
    This method creates a single Text node under the current DOM element, and updates the text whenever the object reference changes by 
        calling by calling toString() on this object.
-   Since the entire framework runs in an animation loop, state can be read directly from anywhere without making any framework-specific 
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
- `im.Get`, `im.GetInline`, `im.Set` are the state-management primitives that all methods use to save immediate-mode 
        state entries.
- `imGet(c, typeId)` requests state at the current index, increments the index, then either returns what we set in 
    the previous frame, or undefined. 
- It will panic if the typeId does not line up with the typeId that was issued at that index in the previous frame.
    This is important - if you were to gate a call to `im.Get()` behind an if-statement, it
    would move all subsequent calls to im.Get one index over, which can lead to silent data corruption!
    Before getting state, we check that the typeId specified this frame is the same as the one we already have,
        and then throw if that isn't the case to avoid this bug.
- As such, a `typeId` is simply a locally unique reference used to identify a particular piece of state in the
    current component.
    I've decided to make it a function, because you've probably always got some kind of function lying around that
    you can just use!
    It was way better than defining a bunch of unique integers everywhere.
- `im.Get` will actually assume that the function you used as the unique local identifier
    for a piece of state was the constructor for that state (a common idiom), and as such, can infer 
    it's return type. 
- However, it's a bit tedious to define constructors for every piece of state while you're prototyping - 
    `im.GetInline` is like `im.Get`, except we can specify any typeId at all, and it will not use type-inference to link 
        the typeId to a return type, allowing us to create state directly inline without creating any constructor methods.
- `im.Set` will write to the current immediate-mode slot. 
    It MUST be called before the next call to `im.Get`, if the slot hasn't been initialised at least once. 
    The bug is fairly common, so we throw when you don't do this.
- `imdom.On` is a DOM-related immediate-mode helper that wraps the `addEventListener` callback. 
    Whenever that callback fires, your entire app will be synchronously rerendered, so that
        methods on the event object like `ev.preventDefault()` can be called and work. 
    When the particular subtree is 'destroyed', the event listener will automatically be removed.
]

You'll notice that it's quite a bit verbose. Luckily, our code isn't in any arbitrary DSL - they are just function calls!
We can just refactor/compress it as if it were any other code. Doing it now will also help clean up the next examples:

```ts - Counter - refactored

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

TODO: mention begin/end pairs


## However, there is a problem

You'll notice that there are a couple of things I've avoided showing in this page. 
Namely, `if`, `for`, `switch`, etc. You know - the things that make a programming language useful!

Sadly, they don't _just work(TM)_. It will be explained in the next page!

