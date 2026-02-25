# Why does this exist

In this day and age, where AI agents can spit out whatever React component you want in a couple of seconds,
why bother with yet another UI framework? It seems a bit pointless, but it isn't.

Over the years, there are a couple of programming ideas that I have learned that have helped me greatly improve the performance,readability and maintainability of my code:

- Prefer reusing memory instead of allocating new memory, unless it is inconvenient to do so
    - Prefer iterating datastructures over materializing them
    - Prefer mutability over immutability, unless it is inconvenient/buggy to do so
- Prefer keeping functions together for as long as possible, and only refactor logic that you will actually reuse, instead of prematurely breaking them up into lots of tiny pieces, unless inconvenient to do so
- Prefer declaring state as close as possible to where it is actually needed
- Prefer APIs that provide primitives and operations on those primitives instead of an API that accepts a craptonne of callbacks, unless actually inconvenient to do so
- Prefer grouping related values into single objects, and pass that object around, instead of passing around lots of values
- Functions with fewer inputs and outputs are simpler, easier to reason about, and easier to maintain
    - Spamming early returns should only be done in 'leaf' functions with limited scope
- The code should be the source of truth for as much as possible. 
    - The entire program and possibly even the build script should be written in the same language if at all possible, and DSLs/scripting languages should be avoided unless inconvenient or actually needed
    - If your program has logic relating to styling, the code should always have some way to read it, and dynamically set it using arbitrary values/state. (this is a dig at css).
- Only use libraries/dependencies for things that are legitimately difficult or time-consuming to implement/get right yourself, or that you don't really care too much about, unless you believe they are inferior to what you can cook up yourself and this difference actually matters to you
- Prefer reimplementable ideas over reuseable code. If your code is tightly coupled to a specific language feature, like annotations, decorators, Aspects/pointcuts, async-await, typescript type inference, comptime, etc. it becomes difficult to transfer the knowledge/ideas elsewhere. 

My experience with web in general, is that the frameworks make it very difficult to adhere to these principles, and the result is that it is far more work to write simple code that is easy to refactor/maintain, and where interactions remain performant. 
Even simple things like "state management" have tens of frameworks, because the actual UI framework didn't do a particularly good job of it. 
And they must all need to write themselves in a framework-agnostic way and make adapters for the actual UI frameworks people use.
In React for example, I can't simply put my state into some global object. It will no longer have any way to know about what updates.

The claim I stake this framework on, is that the main reason why all of these frameworks suck, is that they can't just rerender their UI at the refresh rate of the monitor using `reqestAnimationFrame`. (Unrelated tangent: This is most-likely because they all subscribe to the (stupid) functional-programming notion that functions should be immutable and pure, and as a result, put a giant amount of GC pressure on the javascript runtime every render. If JavaScript actually had value types/structs, React may have actually been more than capable of rendering to a continguous bump-allocator, and I would have had far less of a reason to be writing this). 
If they _could_ render components at 60fps, the following problems dissapear entirely:

- Which library do users need to install to keep track of it's state and notify the right VDom subtree to rerender so that rerenders occur as little as possbile?
    - No need - the entire UI will just update every frame so we don't need to do this
- Which library do users need to install to track and react to asyncronous state?
    - None. It can be observed directly, just like any state
- No but really. I want TanStack querying and invalidating of async state its epic your puny C programmin mind prob woudn't get it
    - I've not tried it yet, but you can probably just use the framework-agnostic core query client directly
- How do we integrate with vanillaJS libraries that are external to the state management system but have their own queryable state
    - Nothing special, now that any value anywhere can simply be read from and written to the DOM
- How do we robustly notify the UI elements that the mouse is no-longer over them, so that they aren't stuck in a hover state because someone used the framework's useState equivelant instead of css :hover ?
    - Now that we're in an animation loop, we _can_ rely on javascript variables though. In this framework, I have an event system that stores which elements we're hovering over in a Set datastructure, and query it every frame. 
- Which library do users need to install animate the style or other things using values in their code?
    - None, you can now just use simple JavaScript and maths. It's pretty insane how far you can get with these two for other things:
        - https://www.youtube.com/watch?v=qjWkNZ0SXfo
        - https://www.dspforaudioprogramming.com
    so I'm sure it will work just fine  here as well

As I hope I've demonstrated, problems that were originally non-trivial in your framework of choice that required
various external libraries to get right, become far simpler to solve on your own.
If a UI framework could make this possible in a way that doesn't comprimise too heavily on other things, 
the ceiling for what a single person can accomplish with just domain-knowledge (knowledge about the programming language itself, and about maths/physics/animation/digital-signal-processing/whatever as opposed to web/css/framework-specific knowledge) just got a lot higher.

## First failed attempt

It turns out that it is very easy to write a UI framework API that can rerender itself at the monitor's refresh rate. 
The secret: in most of my apps, every UI element is in fact _not_ randomly shuffling itself spontaneously at all times, like they might in benchmarks. 
So even if the 'reconciliation' algorithm is complete trash, it wouldn't matter, as long as you only run it when dom nodes are actually moved.
The late-stage of my first UI framework API looked something like this (in other words, my third attempt at making it):

```ts
function Counter(rg: RenderGroup) {
    rg.preRender(() => {
        console.log("This is kinda like useEffect");
    });

    rg.postRender(() => {
        console.log("or maybe this is ...");
    });

    function ListItem(rg: RenderGroup<{ i: number }>) {
        return div({ class: [cn.blah] }, [
            "Item ", rg.text(s => "" + s.i)
        ]);
    }

    return div({ class: [cn.blah] }, [
        "The count is: ",
        rg.text(s => s.value),
        rg.c(Button, (c, s) => c.render({
            label: "" + s.value,
            onClick: () => {
                count++;
                rerenderApp();
            }
        }),
        rg.list(ListItem, (s, getNext) => {
            for (let i = 0; i < count; i++) {
                getNext().render({ i });
            }
        });
        rg.if(() => count > 10, rg => div({}, [
            "Gee that's a high count, man"
        ])),
        rg.else(rg => div({}, ["Keep clicking lil bro"])),
        "The current time is",
        rg.realtime(rg => 
            rg.text(s => new Date().toIsoString()),
            rg.style("color", s => getColorForTime(new Date())),
            rg.class(s => getCssClasForTime(new Date())),
        )
    ]);
}
```

Here, `rg` is short for 'render group'. Any function that takes a `RenderGroup<State>` as a value is effectively a template
that can be instantiated once at the start, and then inserted into any other component using `rg.c` (the c is short for 'component').
Users can register tens of little callbacks that reside under various DOM elements, providing styling, css, text and even component
updates. This is as opposed to having a single `function render()` that needed to manually get each of those DOM element wrappers as variables, and set these things on individual items, which was what the early-stage of this framework looked like. It was very difficult to copy-paste subsections of UI and behaviour from one component to another, so I prefer this lots-of-little-inline-callbacks approach.
The way this framework works is incredibly simple, and it ticks a lot of the dotpoints I mentioned earlier. 
- Values _can_ be packaged into objects and passed around.
- State _can_ be read from and stored anywhere.
- Rendering does _not_ place strain on the GC, and can be done on every single user interaction.
- The entire component tree _can_ be rerendered at the monitor's refresh-rate, because almost nothing happens each render! But I didn't think to do this at the time, and I was still just rendering subsets with `rg.realtime`. 
- Lists of items can be rendered by traversing datastructures arbitrarily instead of materializing them, as long as they are all the same item.

However, the current framework looks nothing like this at all, because of the various little frictions I was encountering while writing code with it:

- List rendering mandated that I make a new list item function
- If-statement lambdas are not capable of type-narrowing, which introduced various undefined bugs in the code
- In order to reliably propagate state changes to the rest of the app, I must call 'rerender' whenver I make a change to any state that may be referenced by other things
- The endless closures everywhere are a pain to look at, and write
- State cannot be declared as close as possible to where it is actually needed, resulting in monolithic components, just like React
- Each component maps directly to 1 DOM element. It is very difficult to implement a fragment-like component with this model. 
- Rerendering a component mandates allocating a props object

In addition to this, there was no good way to start solving some of the other problems that were starting to appear as I 
moved to making more complicated UIs, like handling keyboard shortcuts, and making sure that events reached the correct component.


- How do you ensure that an event only reaches a single component, instead of having the same mouse clicks or hotkeys trampling over one-another? How do you make sure that a child component always recieves an event before a parent component? How about keyboard input?
    - If the framework were to have a syncronous immediate-mode API, you could just have a global `handled` boolean that you set to true when you handle an event, and then before you handle an event, simply check if someone else has handled it or not:
```ts
function imApp(c: ImCache) {
    initEventSystem();

    imComponentBegin(c); {
        imComponent2Begin(c); {
            if (hasInput(shortcut1)) {
                if (we did the thing) {
                    eventWasHandled();
                }
            }
        } imComponent2End(c);
    } imCompoenntEnd(c);

    if (hasInput(shortcut1)) {
        // do something
        if (we did the thing) {
            eventWasHandled();
        }
    }
}

let handled = false;
function initEventSystem() {
    handled = true;
}
function hasInput(shortcutDescriptor: ShortcutDescriptor): boolean {
    if (handled) return;
    if (!globalEventSystemHasInputForShortcut(shortcutDescriptor)) return;
    return false;
}
function eventWasHandled() {
    handled = true;
}

```

This is the


