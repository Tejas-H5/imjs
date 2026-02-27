# Motivation / Why does this exist

In this day and age, where AI agents can spit out whatever React component you want in a couple of seconds,
why bother with yet another UI framework?

Over the years, there are several heuristics I have learned that have greatly improved the performance, readability and maintainability of the code I write. Apart from things relating to naming/formatting/code organisation, they are as follows:

- Prefer keeping functions together for as long as possible, and only refactor logic that you will actually reuse, instead of prematurely breaking them up into lots of tiny pieces, unless actually inconvenient to keep them together
    - https://caseymuratori.com/blog_0015
    - http://number-none.com/blow/john_carmack_on_inlined_code.html
- Prefer reusing memory instead of allocating new memory, unless it is inconvenient to do so
    - Prefer iterating datastructures over materializing them
    - Prefer mutability over immutability, unless it is inconvenient/buggy to do so
- Prefer declaring state as close as possible to where it is actually needed
- Prefer APIs that provide primitives and operations on those primitives instead of an API that accepts tens of callbacks, unless actually inconvenient to do so
- Functions with fewer inputs and outputs are simpler, easier to reason about, and easier to maintain
    - Prefer grouping related input values into singular objects. Doing so will actually simplify the code
    - There should mostly only be two types of functions in your codebase:
        - Massive functions with lots of indentation and complex algorithmic logic, and just 1 return at the end. Possibly guard clauses at the very top if needed.
        - Simple functions that read sequentially, and make heavy use of early-returns to reduce indentation
- The code should be the source of truth for itself, as much as possible. 
    - The entire program and possibly even the build script should be written in the same language if at all possible, and DSLs/scripting languages should be avoided unless inconvenient or actually needed
    - If your program has logic relating to styling, it should just live in the code, so that it can be dynamically driven by any variable in the future
- Only use libraries/dependencies for things where the productivity it offers or the robustness of it's code is actually worth the hit in build times, CI run times, and increase to the program's size. 
    - In web, the size might matter a lot more than in native. 100mb of javascript is possibly too much, whereas a 100mb dll isn't anything to be concerned with
    - Do not use dependencies that the entire industry says they are 'best practice', but all you ever seem to encounter when you use them are the downsides
- Prefer reimplementable ideas over reuseable code. If your code is tightly coupled to a specific language feature, like annotations, decorators, Aspects/pointcuts, async-await, typescript type inference, comptime/reflection, etc. it becomes difficult to transfer the knowledge/ideas elsewhere. 
- You can make pretty much anything with procedural code that just makes use of structs and functions.

Regardless of wheter you may or may not agree with them, my experience with web in general has been that most of the frameworks make it very difficult for me to make use of these principles. 
Even simple things like "state management" have tens of frameworks, because the actual UI framework didn't do a particularly good job of it. 
And they must all need to write themselves in a framework-agnostic way and make adapters for the actual UI frameworks people use.
In React for example, I can't simply put my state into some global object - it should at least be in a React.Context or a `[state, setState]` tuple somewhere so that React can be aware of updates that we make to it. 
You probably don't want to do this - it is not ideal for performance.

The claim I stake this framework on, is that if a UI framework could simply rerender their UI at the refresh rate of the monitor using `reqestAnimationFrame`, pretty much every problem associated with writing web frameworks, which currently require lots of 'clever' code to solve, would be completely gone:

- Which library do users need to install to keep track of it's state and notify the right VDom subtree to rerender so that rerenders occur as little as possbile?
    - No need - the entire UI will just update every frame so we don't need to do this
- Which library do users need to install to track and react to asyncronous state?
    - None. It can be observed directly, just like any state
- No but really. I want TanStack querying and invalidating of async state. Also an event system to globally react to these
    - I've not tried it yet, but you can probably just use the framework-agnostic core query client directly
- How do we integrate with vanillaJS libraries that are external to the state management system but have their own queryable state
    - Nothing special, now that any value anywhere can simply be read from and written to by the UI
- How do we robustly notify the UI elements that the mouse is no-longer over them, so that they aren't stuck in a hover state because someone used the framework's useState equivelant instead of css :hover ?
    - Now that we're in an animation loop, we _can_ rely on javascript variables though. In this framework, I have an event system that stores which elements we're hovering over in a Set datastructure, and query it every frame. 
- Which library do users need to install animate the style or pretty much anything else using values in their code?
    - None, you can now just use simple JavaScript and maths. It's pretty insane how far you can get with these two for other things:
        - https://www.youtube.com/watch?v=qjWkNZ0SXfo
        - https://www.dspforaudioprogramming.com

Problems that were originally non-trivial in the existing frameworks that required various external libraries to get right, become far simpler to solve on your own.
If a UI framework could make this possible in a way that doesn't comprimise too heavily on other things, the ceiling for what a single person can accomplish with just domain-knowledge (knowledge about the programming language itself, and about maths/physics/animation/digital-signal-processing/whatever as opposed to web/css/framework-specific knowledge) just got a lot higher.
The end-goal of this framework (and every other framework, though I don't think their authors realise it yet) is to maximize the ratio of domain-knowledge:api-knowledge in a conumer's head.
A framework author's job is not to provide you a mechanism to write the most 'optimal' code, but rather, to defend your ability to write and structure the code the way you wanted to write it in the first place.

In addition to the ability to solving the problems above, and allowing me to write code using the heuristics I opened with, there are some extra requirements I would like for a UI library:

## First failed attempt

It turns out that it is very easy to write a UI framework API that can rerender itself at the monitor's refresh rate. 
The secret: in most of my apps, every UI element is in fact _not_ randomly shuffling itself spontaneously at all times, like they might in benchmarks. 
So even if the 'reconciliation' algorithm is complete trash, it wouldn't matter, as long as you only run it when dom nodes are actually moved.
Writing the framework in a way that I want to use it for all my projects, however, is very difficult.
For example, the late-stage of my first UI framework API looked something like this:

```ts
type CounterState = {
    value: number;
};

// I am a big fan of the aesthatic of React functional components. Just not their actual implementation

function ExampleOfABitOfEverything(rg: RenderGroup<CounterState>) {
    rg.preRender(() => console.log("This runs before all the element effects run"));
    rg.postRender(() => console.log("This runs after all the element effects run"));

    return div({ class: [cn.blah] }, [
        "The count is: ",
        rg.text(s => s.value),
        rg.c(Button, (c, s) => c.render({
            label: "Increment",
            onClick: () => {
                s.value++;
                rg.rerenderApp()
            }
        }),
        (() => {
            function ListItem(rg: RenderGroup<{ i: number }>) {
                return div({ class: [cn.blah] }, [
                    "Item ", rg.text(s => "" + s.i)
                ]);
            }

            rg.list(ListItem, (s, getNext) => {
                for (let i = 0; i < count; i++) {
                    getNext().render({ i });
                }
            });
        })(),
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

While the framework I have arrived at now looks nothing like this, I was still able to make pretty much anything I wanted
with this. This fact will be important later.
Here, `rg` is short for 'render group'. Any function that takes a `RenderGroup<State>` as a value is effectively a template
that can be instantiated once at the start, and then inserted into any other component using `rg.c` (the c is short for 'component').
Users can register tens of little callbacks that reside under various DOM elements, providing styling, css, text and even component
updates. This is as opposed to having a single `function render()` that needed to manually get each of those DOM element wrappers as variables, and set these things on individual items, which was what the early-stage of this framework looked like. 
It was very difficult to copy-paste subsections of UI and behaviour from one component to another, so for that reason alone, I prefer this lots-of-little-inline-callbacks approach here in particular.
The way this framework works is incredibly simple, and it ticks a lot of the dotpoints I mentioned earlier. 
- Values _can_ be packaged into objects and passed around.
- State _can_ be read from and stored anywhere.
- Rendering does _not_ place strain on the GC, and can be done on every single user interaction.
- The entire component tree _can_ be rerendered at the monitor's refresh-rate, because almost nothing happens each render! But I didn't think to do this at the time, and I was still just rendering subsets with `rg.realtime`. 
- Lists of items can be rendered by traversing datastructures arbitrarily instead of materializing them

There were however a lot of various little frictions I was encountering while writing code with it, as I started doing more complicated things:

- List rendering mandated that I make a new list item function, as the code didn't look very nice inline
- If-statement lambdas are not capable of type-narrowing, which introduced various undefined bugs in if-statements
- In order to reliably propagate state changes to the rest of the app, I must call 'rerender' whenver I make a change to any state that may be referenced by other things
- State cannot be declared as close as possible to where it is actually needed, resulting in large monolithic components much like React
- The endless closures everywhere are a pain to look at, and write
- Each component maps directly to 1 DOM element. It is very difficult to implement a fragment-like component with this model. 
- Rerendering a component mandates allocating a props object
- These components can be extracted as variables, and then slotted into the list of components later, which seems cool at first,
but introdocues a bug - the order of rendering is no longer dependent of the item's position in the UI, but rather, the order in which it is declared in the code, which can be counter-intuitive/confusing when debugging

In addition to this, there was no good way to start solving some of the other problems that were starting to appear as I 
moved to making more complicated UIs, like handling keyboard shortcuts, and making sure that keyboard/mouse reached the correct component.

At this point, I was pretty convinced that the idea couldn't be improved any further, and I took a break from web dev.


## Immediate mode - Realisation

This was untill I watched around the first 30 or so episodes of [Handmade Hero](https://youtu.be/Ee3EtYb8d1o?list=PLnuhp3Xd9PYTt6svyQPyRO_AAuMWGxPzU). 
The first couple of episodes were pretty reasonable. I even bought an Xbox controller to follow the input episode (pretty crazy that all those old MS APIs still work to this day). 
Was fun and interesting, but nothing too mindblowing.
Throughout the series, there was one main difference between the code Casey was writing and the code I was writing. 
As an highly experienced Unity developer, I knew that in order to have deterministic physics and have cleaner code, it would be beneficial to do your rendering and your updating in two separate functions. 
So while he simply had `void Render(*gameState, *input, *screen, *audio);`, I had something like `void Render(*gameState, *screen, *audio)` and `void Update(*input, *gameState)`. 
This has even helped me out in the past in another project - in order to artifically improve a physics simulation, I was able to rewrite my game loop like:
```
Render();
for (let i = 0; i < 5; i++) Update(dt / 5);
```
So this must be the better abstration.
The render was a pure function of the game state, and the upadte was effectively a pure function of the input.
If you want your code to be clean, this is what it should end up looking like anyway. 
Eventually all games reach a point where you need to split out the render loop and update loop. Right?
Anyway, I figured this difference didn't really matter too much, and would even help me out in the long run,
right up to the point where we started prototying the drawing of some levels in episode 28. 
Along the way, there were all sorts of scenarios that naturally arose where it was extremely beneficial for the code inside of the render function to have access to various intermediate values that we had computed in the updating part of the code.
Things like which block we were colliding with, where we moved to, where we were last, even the tilemap itself which was just a static variable was something that I now needed to copy-paste between methods, else I needed to put all of these intermediate computations explicitly as values in the gameState even though they were mostly transient to that frame.
The intermediate values were particularly bad, because updating the schema of the game's state required a full recompilation instead of just a hot-reload. 
But even if that was not the case, it was still more typing and busywork than simply accessing the computation you put into a local variable.
It was at that point, that I had realised the value in keeping the code for Render and Update in a single place, 
and it may have been the single most-important thing I took away from the series (I only watched till 30 and got bored after that, sorry).
It would still be possible to have some sort of rendering command buffer later-on in case I wanted to actually separate the physical act of computing the state and rendering the frame to the screen, but it was extremely beneficial to have some way for the rendering part of the code and the updating part of the code to easily communicate with one-another.

At this point, I remembered an idea I had before my first framework, about an immediate-mode API can be used to render to the DOM.
I had dismissed it immediately, because the DOM nodes need to be cached somehow, and the only way 
to reasonably do this is to render the exact same number of dom nodes every single frame.
This is extremely restrictive, and would never be useful for any sort of app...

... or, would it? Now that I understand the true benefit of immediate mode (keeping computation code and rendering code close together), 
would this idea be useful? If you recall with my first framework, every single component was specified with a static array of DOM elements, and despite that, I was able to pretty much code anything I wanted to.
This means that even though an immediate mode framework is forced to render the same number of things every frame,
it will be functionally equivelant to something that I already know was useful.

I immediately started working on this framework, and after lots of experimentaiton, It is at a point where it seems like it checks pretty much every dot-point I mentioned at the start. Other frontend frameworks will continue to 'innovate' well into the next decade. 
But I fully intend to finish and put a feature-freeze on this framework once I've validated that it can do everything that it needs to.

## The current framework, as of 2026

Let's rewrite our previous example component in this new framework:

```ts
function imExampleOfABitOfEverything(c: ImCache, s: CounterState) {
    if (imMemo(c, appState.someSignalOfSomeSort)) {
        console.log("This runs before all the element effects run")
    }

    imDivBegin(c); {
        if (isFirstishRender(c)) elSetClass(cn.blah);

        imStr(c, "The count is: ");
        imStr(c, s.value);

        if (imButtonIsClicked(c, "Increment")) {
            s.value += 1;
        }

        imFor(c); for (let i = 0; i < count; i++) {
            imDivBegin(c); {
                if (isFirstishRender(c)) elSetClass(cn.blah);

                imStr(c, "Item "); imStr(c, i);
            } imDivEnd(c);
        } imForEnd(c);

        if (imIf(c) && count > 10) {
            imStr(c, "Gee that's a high count, man");
        } else {
            imIfElse(c);
            imStr(c, "Keep clicking lil bro");
        } imIfEnd(c);

        imDivBegin(c); {
            elSetStyle("color", getColorForTime(new Date()));
            elSetStyle("class", getCssClasForTime(new Date()));

            imStr(c, "The current time is ");
            imStr(c, new Date().toIsoString());
        } imDivEnd(c);
    } imDivEnd(c);

    if (imMemo(c, appState.someSignalOfSomeSort)) {
        console.log("This runs after all the element effects run")
    }
}
```

It retains most of the benefits of the previous framework, while also:
- List rendering can now be done inline. Lists can be as deeply nested and inline as you want. Extracting a list to another component is functionally equivelant to extracting code to another function.
- If-statements _are_ capable of type-narrowing
    - Though sadly, because of the `imIf`, the type of a value in the else-branch doesn't get narrowed to the inverse type of the if branch, probably a Typescript bug that they didnt address because no-one is doing this kind of API really
- No need to call `rerender` manually
    - Unless you have decided that you really want manual control over when rerenders actually happen, and you can disable the default animation. (your loss tbh)
- State _can_ be declared as close as possible to where it is actually needed. Massive monolith components are easy to split out when needed.
    - Transient values relevant to just that frame can be easily defined in the component and used without writing to a state object anywhere
- Almost no closures in sight
- Your function can be responsible for multiple DOM elements
- Components may take in as many objects as needed, and they don't need to be props objects
- Components render in exactly the order they look like they render in
- We can now write a `switch`-like abstraction, which we couldn't before
- We can now detatch DOM nodes instead of just hiding them with CSS, which we could not do before
- Animating things is extremely low friciton now
- Error boundaries can be implemented by annotating `try-catch` with something similar to `imIf`
- Errors thrown by event handlers can actually propagate into error boundaries
- A debugger can be used to step through the rendering of every single line of code

Additionally, my event coordination problem was also solved:

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

It may not have been clear how I can render a dynamic number of items with a system that can only render a static number of things every frame, but the code should have made it a bit more obvious.
Rather than thinking of a component as something that renders an unknown number of items, we think of the component as rendering a known number of items, plus a known number of for-loops, if-statements, etc. so the number of immediate-mode-state entries underneath a particular node in the immediate mode tree remains constant.

There are more explanations for how it all works in the code itself, so I won't bother with them here.

## Drawbacks

- It is very easy to forget to end something after you've begun it. Even rendering a different number of 'immediate mode state' items every frame can cause difficult bugs. For example, if function call #6 doesn't get called in a render, then function call #7 will be pulling state from where function call #6 used to write to, which causes data corruption.
    - Sounds pretty bad, but the framework has endless assertions everywhere to make it impossible for two state objects of a different type to be read from or written to the same slot, assuming correct use of typeIds. You could still encounter bugs if all the state in a row was of the same type, but it is far more convenient to bundle up state into a singular object anyway that I've never encounted this bug in practice.
- You'll need to be cognisant of mutating collections while you're iterating and rendering them, since rendering is synchronous. A common pattern is to assign to a `let deferredAction: (() => void) |undefined` and then running it at the end if it was assigned to.
- HMR support is very limited, and using it is not recommended
    - Rendering a different number of immediate-mode-state items in a HMR update will trigger a full invalidation. The framework was not actually designed with HMR in mind, and I personally prefer writing apps in such a way that you can load in arbitrary scenarios while developing, so that you don't need HMR in the first place
- The speed of rerendering is still about 10x slower than simply writing VanillaJS code that does the same thing. The code is just easier to modify and maintain
    - No, removing all the assertions doesn't suddenly speed it up. surprisingly.
    - I still hit 60fps easily with 40-50k DOM nodes present, but I will be trying to improve this number.
- A bit more verbose to type. 
- The type of a value in the else-branch doesn't get narrowed to the inverse type of the if branch :(
- No SSR
- No suspense boundaries
- No years of industry-wide adoption
- AI is not fluent in it. yet. But you'll find that you don't really need AI to do things here

