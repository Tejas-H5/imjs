# imJS

ImJS is an immediate-mode ui framework that aims to significantly simplify programming frontend UIs.
This repository is a central place where I aim to put all the related code, tests, utils, and tooling.
It's a bit annoying to spread this out in various util folders in different projects.

```ts
function newAppState() {
    return { count: 0 };
}

function imApp(c: ImCache) {
    const s = imState(c, newAppState);

    imElBegin(c, EL_DIV); {
        imElBegin(c, EL_DIV); {
            imStr(c, "The count is "); imStr(c, s.count);
        } imElEnd(c, EL_DIV);

        if (imButtonIsClicked("increment")) {
            s.count++;
        }

        if (imIf(c) && s.count > 10) {
            imStr(c, "That is a very high count ... you sure you want to order this many ?");
            
            if (imButtonIsClicked("Submit")) {
                s.count++;
            }
        } imIfEnd(c):
    } imElEnd(c, EL_DIV);
}

```

## The main idea

I believe that the majority of difficult problems that arise when developing a web framework pretty much go away
if that framework is capable of rerendering itself at 60fps. 

- How to notify the correct part of the UI to rerender? 
    - No need. Rerendering the whole UI is cheap, and the program can do this as many times as needed without dropping frames.
    - This means that state can be stored and queried from literally anywhere
    - Asyncronous state can also just be directly observed like normal state
    - Third-party libraries may have their own internal state that that isn't a part of the framework's lifecycle. This is no longer an issue
    - This also applies to UI states. I'm sure we've all encounted that bug where an element things it is being hovered, even though the mouse is long-gone.
        This is not something that usually happens when the hovered state is managed at a global level, and then queried every frame. 

In addition to this, the friction for animating things decreases significantly, since the entire app is alread running in an animation loop.

This does _NOT_ mean, that I am just rendering a bunch of UI components to a canvas like Flutter.
We are still using the DOM - but the backbone that is controling the DOM is programmed with an
immediate-mode syncronous top -> bottom rendering loop instead of tree of nodes that granularly updates subtrees of itself.

The main thing that makes this possible is the immediate mode cache, which can be seen passed around as `c: ImCache` as the first
argument to every component. 
The `ImCache` is a tree-like datastructure, where we push and pop a series of `ImCacheEntries`. 
These entries store immediate mode state that allows the framework to rerender itself quickly after the first render, e.g Dom nodes.
The entries follow a very similar rule to React's 'rule of hooks', where each element can only render the same number of items each time.

A framework that achieves 60fps rerenders does not have to use an immediate-mode syncronous approach to components.
I've decided to use it here, because of the numerous other coordination problems and animation problems it ends up solving. 
For example, getting keyboard shortcuts to the correct component may seem a bit difficult to get working correctly, 
if you plan to have lots of nested views that can all be navigated via the keyboard.
An immediate-mode loop can make it very simple - all event code can simple check if `!handled`, and set it to true before
handling it. I've written a much longer `Why.md` that should detail prior designs, and how I eventually arrived at this one.

The result, is a very simple framework with no 'magic'. All code can be stepped into, debugged, and profiled like every other function.
State management, can be done with plain old javascript objects. You don't _need_ to use immutability at all.
Refactoring is also simpler - extracting a component is now as simple as extracting code out of one function and into another one.
It isn't kinda sorta the same component but slightly different - it is identical.
Because state can be defined inline with other components, you also don't need to do refactors when you don't want to.
In React, it is pretty commonplace to extract a new component for every list item for example, because the alternative
is to have massive monolithic components where it is very difficult to reason about what does what.

Because the idea is so simple, it is also very limited in scope. There will be a point when this framework is 'Finished', and 
I'm only pushing minor patches or documentation updates.

## Organisation/Architecture

I recommend that you just copy-paste these files into wherever you want, and then use them.
It will be some time till I figure out how to make an NPM package.
Unlike what the name suggests, this project is actually TypeScript-first.

- im-core.ts
    - The core immediate mode framework lives here. It has no knowledge of things like "the dom". 
        In theory, you can use it to maintain any dynamic tree-like structure, not not just UI.
        This package does _not_ contain a diffing algorithm, for simplicity. 
        This means that you'll have to write one for every concrete target.
        I think this is OK - things like canvas-based im-GUI don't need a diffing algorithm, for example,
        whereas things like the DOM do.
- im-dom.ts
    - A bridge between im-js and the DOM. Contains something vaguely resembling a diffing algorithm, but isn't quite a diffing algorithm.
- im-ui/
    - Optional - contains a cohesive UI system with implementations for various UI primitives, like text inputs/areas, checkboxes, scroll views, layouting, etc. I will be constantly adding to this and improving it as I make more stuff. You may be more knowledgeable about UI, and may decide to make your own instead.
- tests/
    - testing-framework.ts
        - Contains the custom testing framework. It contains features like `.branch()`, which allows us to test more cases
            with less testing code. I haven't seen anything like this in other test frameworks, AFAIK.
- `file`.tests.ts
    -  tests for `file`
