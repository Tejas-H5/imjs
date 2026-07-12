# imJS - Overview

`imJS` is a thin immediate-mode layer that sits above the DOM API. 
It rerenders the UI at 60fps (or whatever your monitor's refresh rate is) inside `requestAnimationFrame`.
I've been evolving it alongside my personal projects for a couple years.
As far as I know, this is a 'new' approach specifically in the web word.
Or st least, most #url[other web frameworks, https://youtu.be/0C-y59betmY] don't work like this.

## Why have I created this framework?

The fundamental problem that I've had when using other frameworks, is that my UI's state either neededed
    to live inside the UI framework, or a state management library that is integrated with the UI framework.
If my state lived in some external library, third-party dependency or wasn't really tangible state, like `Date.now()`, 
    it was always very tricky to integrate with.

Polling all state at the monitor's refresh rate will definitely fix the state problem.
But it is far too inefficient... right? Well actually, I've found that it was completely fine.
There are also a bunch of other limitations of state management frameworks that get fixed with this approach too:

#list[
- Arrays, maps, sets and objects can be directly mutated
- UI state can be queried within JavaScript in a far less buggy way
- Animating things was always possible in other frameworks, but I would always avoid it because
    animations take some effort to set up. Now, animations have far less friction
- A LOT more code and configuration can live in JavaScript
]

## What does the usage code look like?

Rendering to the DOM at 60fps is not magic. You do it by making rendering an imperative action that
allocates it's memory the first render, then reuses that memory on susbequent renders. 
It's not pretty, but it does work:


```ts - TODO List

function imTodoList(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        if (im.isFirstRender(c)) {
            imdom.setStyle(c, "width", "100%");
        }

        const state = im.GetInline(c, imTodoList) ??
            im.Set(c, { items: [] });

        imdom.ElBegin(c, el.H3); {
            if (im.If(c) && state.items.length > 0) {
                imdom.Str(c, state.items.length === 1 ? 
                    "You have one thing to do" : 
                    `You have ${state.items.length} things to do!`
                );
            } else {
                im.Else(c);
                imdom.Str(c, "You have completed all your tasks! nice.");
            } im.IfEnd(c);
        } imdom.ElEnd(c, el.H3);

        im.For(c); for (const item of state.items) {
            imdom.ElBegin(c, el.DIV); {
                imdom.Str(c, item);
            } imdom.ElEnd(c, el.DIV);
        } im.ForEnd(c);

        imdom.ElBegin(c, el.DIV); {
            let submit = false;

            const input = imdom.ElBegin(c, el.INPUT); {
                const keyEv = imdom.On(c, ev.KEYDOWN);
                if (keyEv) {
                    if (keyEv.key === "Enter") {
                        submit = true;
                    }
                }
            } imdom.ElEnd(c, el.INPUT);

            imdom.ElBegin(c, el.BUTTON); {
                imdom.Str(c, "+");
                const clickEv = imdom.On(c, ev.MOUSEDOWN);
                if (clickEv) {
                    submit = true;
                }
            } imdom.ElEnd(c, el.BUTTON);

            if (submit) {
                if (input.root.value) {
                    state.items.push(input.root.value);
                    input.root.value = "";
                    setTimeout(() => { input.root.focus() }, 1) ; 
                }
            }
        } imdom.ElEnd(c, el.DIV);
    } imdom.ElEnd(c, el.DIV);
}

```

The `im.` stuff looks fine to me, but the `imdom.` everywhere seems a bit verbose. 
Luckily, because we're in TypeScript as opposed to some sort of templating language,
    making reuseable abstractions is just a matter of extracting functions and data into self-contained and reuseable units.
I won't provide an example of this - this framework assumes you already know how to extract self-contained methods out of
    a larger more complicated method in an attempt to simplify things, i.e #url[Semantic compression, https://caseymuratori.com/blog_0015].
It's going to vary from person to person and project to project. 

The #url[next page, /?test=How+to+install+imJS] explains how you can install this framework into an existing TypeSript project.
