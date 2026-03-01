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

I believe that the majority of difficult problems that arise when developing a web framework pretty much go away if that framework is capable of rerendering every component from the top to the bottom at 60fps. 
We no longer need to store all this bookkeeping state+logic that is usually needed to notify the correct UI subtree that it's state has changed, and it specifically needs a rerender - the UI can just read the state out of a plain object as-is. 
Now that state can be stored anywhere, asyncronous state can also just be directly read like normal state.
Integrating with third-party libraries also becomes easier. Since we can read any state from anywhere, we no longer need to create an <insert framework X here> adapter through which we interact with it, and can just use it directly.

Even other problems that I didn't think this would solve also get solved. I'm sure we've all encounted that bug where an element things it is being hovered, even though the mouse is long-gone. It has something to do with how React doesn't run onMouseLeave events when unmounting a div. We can now maintain a set of Dom nodes the mouse is over that updates once every frame at the global level, and is always up-to-date. This state can be directly read like any other state, which eliminates this bug.

In addition to all of this, the friction for animating things decreases significantly, since the entire app is alread running in an animation loop.
Programming web frontends stops feeling like looking up various things on MDN (there is still some of that) and more like programming in Processing.js or Raylib.

This does _NOT_ mean, that I am just rendering a bunch of UI components to a canvas like Flutter. We are still using the DOM - but the backbone that is controling the DOM is programmed with an immediate-mode syncronous top -> bottom rendering loop instead of tree of nodes that granularly updates subtrees of itself.

The main thing that makes this possible is the immediate mode cache, which can be seen passed around as `c: ImCache` as the first argument to every component. 
The `ImCache` is a tree-like datastructure, where we push and pop a series of `ImCacheEntries`. 
These entries store immediate mode state that allows the framework to rerender itself quickly after the first render, e.g Dom nodes.
The entries follow a very similar rule to React's 'rule of hooks', where each element can only render the same number of items each time.

A framework that achieves 60fps rerenders does not necessarily have to use an immediate-mode syncronous approach to components.
I've decided to use it here, because of the numerous other coordination problems and animation problems it ends up solving. 
For example, getting keyboard shortcuts to the correct component may seem a bit difficult to get working correctly, 
if you plan to have lots of nested views that can all be navigated via the keyboard.
An immediate-mode loop can make it very simple - all event code can simple check if `!handled`, and set it to true before
handling it. I've written a much longer `Why.md` that should detail prior designs, and how I eventually arrived at this one.

## Organisation/Architecture

I recommend that you just copy-paste these files into wherever you want, and then use them.
It will be some time till I figure out how to make an NPM package or packages.
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
    - testing.ts
        - Contains the custom testing framework. It contains features like `.branch()`, which allows us to test more cases with less testing code. I haven't seen anything like this in other test frameworks, AFAIK. The same 'immediate-mode mindset' was used to think of this.
- `file`.tests.ts (anywhere)
    -  tests for `file`
- `/build`
    - Contains a custom build script. You don't need to adopt it to use this framework
