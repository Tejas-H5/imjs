# What is imJS

`imJS` is an immediate-mode web-UI framework I've spent a couple years evolving alongside my personal projects.
Here are the main things that I want to do in my code all the time, which are currently 
poorly supported or impossible to do in other modern Web-UI frameworks:

#list[
- I want to store my state anywhere, especially directly in plain objects that live outside of the UI lifecycle
    #list[ 
    - Not Proxy objects or observables or UI lifecycle state or event emitters - actual plain objects
    - I do NOT want to learn the pros and cons of every state-management library in order to get started with my project -
        I would rather spend years making my own UI framework :D
    ]
- I want to mutate arrays, maps, sets, and datastructures directly, as oppopsed to shallow-copying them
- I want rendering to be an imperative result of iterating my data structures and specifying what gets rendered, as 
    opposed to allocating a massive tree-object and reconciling it with the previous tree object.
    #list[ 
    - This is just as much for my own convenience as it is for performance 
    - If re-rendering my entire UI at 60fps becomes possble due to this, that would be very nice! (it does)
        #list[
        - Both of these go hand-in-hand somewhat - each makes the other more useful/viable
        ]
    ]
- A lot of my UI depends on the current date/time or Date.now(), which cannot be cleanly expressed as a 'dependency' 
    in many UI frameworks. I want writing these UIs to be a lot easier than they currently are
- I do *not* want to ever manually call a `rerender()` method, if I can avoid it
- I want to be able to configure all styles via JavaScript
    #list[
    - It's useful to have the css color AND the actual `{ r, g, b, a }` representaiton of a colour available in JavaScript, for example.
        If everything is just in JavaScript from the start, you can get this without a build step.
    ]
- I want to keep more complicated UIs as a single function for as long as possible, so I can defer refactoring 
    to when I've got a good idea of how it should be set up.
    #list[
    - I want to be able to declare immediate-mode state anywhere in the UI tree, not just at the top. 
        I do not want to use a framework that imposes a refactor on me every time my list component need their own copy of some
        immedate-mode state (in React you will know them as 'hooks'). Rather than doing this:

    ```tsx
    const List = (props) => {
        return (
            <div>{props.items.map(v => <ListValue value={v} key={v.id} />)}</div>
        );
    }
    const ListValue = (props) => { 
        const user = useFetchUser(props.value.userId);
        return <>{user.name}</>;
    }
    ```

        I'd like to do something like this instead:

    ```tsx
    const List = (props) => {
        return (
            <div>
                {props.items.map(v => {
                    const user = useFetchUser(props.value.userId);
                    return <>{user.name}</>;
                })}
            </div>
        )
    }
    ```

        NOTE: this framework does not make use of jsx - it looks quite different.
    ]
]

If you read this list of dotpoints and thought "These points are silly - you can easily to X with [framework of your choice] here", then
great! You can stop reading these pages now and save yourself some time - you probably won't find this framework particularly useful.

However, if any or a large number of those points resonated with you, then continue reading - you may find this framework useful.

## Main idea

The claim I stake this framework on, is that if a UI framework could simply rerender it's UI at the refresh rate 
    of the monitor using `reqestAnimationFrame`, every problem associated with web UI would be completely gone:

#list[
- Which library do users need to install to keep track of shared state and notify the right VDom subtree to 
    rerender so that rerenders occur as little as possbile?
    #list[ 
    - No need 
    - the entire UI will just update every frame so we don't need to do this 
    ]
- Which library do users need to install to track and react to asyncronous state?
    #list[ 
    - None. It can be observed directly, just like any state 
    ]
- How do we integrate with vanillaJS libraries that are external to the state management system but have their own queryable state
    #list[ 
    - Nothing special, now that any value anywhere can simply be read from and written to by the UI
    ]
- How do we robustly notify the UI elements that the mouse is no-longer over them, so that they aren't stuck in a 
    hover state because someone used the framework's `useState` equivelant instead of css :hover ?
    #list[ 
    - Now that we're in an animation loop, we _can_ rely on variables in code. 
        The 'app didn't rerender when it was supposed to' or 'event didnt fire for some reason' classes of bug 
        are completely gone.
    ]
- Which library do users need to install animate the style or pretty much anything else using values in their code?
    #list[
    - None, you can now just use simple JavaScript and maths. It's pretty insane how far you can get with these two for other things:
        #list[
        - #url[Tsoding cube video, https://www.youtube.com/watch?v=qjWkNZ0SXfo]
        - #url[dsp for audio programming, https://www.dspforaudioprogramming.com]
        ]
    ]
]

Problems that were originally non-trivial in the existing frameworks that required various external libraries to get right, 
    become far simpler to just implement on your own.

If a UI framework could make this possible in a way that doesn't comprimise too heavily on other things, the ceiling for what 
    a single person can accomplish with just domain-knowledge (knowledge about the programming language itself, and about 
    maths/physics/animation/digital-signal-processing/whatever as opposed to web/css/framework-specific knowledge) just got a lot higher.

But JavaScript is a script kiddie toy language (not even a real language btw). 
There's no way it could loop over the 5000 nodes in your UI right?
Actually, it is no longer 2015, and thanks to v8 it's gotten quite fast! 
Even Firefox's thing (spider-monkey) is fast too. 
It is still twice as slow as v8, but that just means your app rerenders in 1ms instead of 0.5ms).

<!-- 
I've decided to break this page up into multiple smaller pages.
Because reading is kinda annoying, so I want people to be able to read one page at a time and pace themselves. 
-->
