# imJS - Overview

`imJS` is an immediate-mode UI framework that rerenders your UI at your monitor's refresh-rate
    with `requestAnimationFrame`!
Surprisingly, it works.
It's a bit overkill for a documentation page like this one, but I'm using it anyway.
As far as I know, this is a 'new' approach specifically in the web word.
Or at least, most other web frameworks that have become widely used in industry
#url[don't work like this., https://youtu.be/0C-y59betmY]

## Why another JavaScript UI framework?

I decided to start working on my own framework for a few reasons:

#list[
- I have found state management to be a total pain in most web frameworks:
    #list[
    -   For state in third-party libraries, you need to subscribe to all the right events 
            to notify your app of state changes. 
        It's very easy to miss a callback, and render stale data.
    -   There are also other kinds of 'state' that are more intangible, like `Date.now()`. 
        Writing a clock component that ticks correctly every second, for example, is actually 
            not as straightforward as I'd like it to be.
    -   I also find the idea of a 'state management framework' silly in-and-of itself. 
        Directly mutating your data in a predictable manner is simpler and typically more performant.
        The fact that there are tens of different libraries for something I can already do just fine with plain 
        JavaScript, feels like a massive design fault.
    ]
    Polling all state at the monitor's refresh rate will allow UI elements to observe any state
        from anywhere, especially but not limited to `Date.now()`.
-   I did not like the reliance on third-party libraries that the framework (possibly intentionally)
        nudged me towards in order to get anything done.
    Writing custom things in such a way that they work nicely inside React, for example, is far more
        of a pain than just writing custom things in the simplest way possble.
- I did not like the fact that in order to create a list component, frameworks like React
    would force me extract out a new component, just so I could use hooks in that component
]

If you could not tell, most of my experiences are from React, but I'll give it credit where it
    is due.
Before react functional components, the web didn't have any other ways to create 
    composable, reusable components in such a simple way.
In fact, they have influenced a lot of my design decisions in this framework.

## What does the usage code look like?

The usage code reads a lot like if a React functional component were imperatively rendered.
You will also need to make good use code blocks, and put related constructs onto the same line where appropriate:

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
                    "You have one thing to do" : state.items.length < 20 ?
                    `You have ${state.items.length} things to do!` : 
                    ``
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

Unlike other frameworks, this one wholly rejects the idea that all state must be immutable, 
    and that UI is literally some kind of pure function of state.
I would argue that rendering to a buffer by incrementing an index, and then
    resetting that index back to 0 and doing it again, while being impure by nature,
    is in practice the same thing - but a hell of a lot faster.

The difference between the two worldviews, then, is that I can rerender my UI at 60fps+, and they can't. :D

If you don't have motion sickness, tap the example below to un-pause it:

```ts - you will try imjs ... you will try imj - hey dont look away

// <------- You can drag this middle thing to resize it btw

const subliminalMessage = "you will try imjs"

function imGalaxyOfDivs(c: ImCache) {
    if (im.isFirstRender(c)) {
        imdom.setStyle(c, "overflow", "hidden");
    }

    const state = im.GetInline(c, imGalaxyOfDivs) ??
        im.Set(c, { paused: true });

    if (imdom.hasMousePress(c)) {
        // Notice how we did not do setState({...state, paused: !state.paused}) here. 
        // Isn't that just amazing or what? The bar is that low...
        state.paused = !state.paused;
    }

    // This one will cause the CPU fan to start spinning, so we shouldn't ever
    // run it when we're not looking directly at it.
    const visible = imdom.TrackVisibility(c, 0).isVisible;
    if (im.If(c) && visible) {
        imdom.ElBegin(c, el.DIV); {
            const numArms    = 5;

            if (im.isFirstRender(c)) {
                imdom.setStyle(c, "position", "relative");
                imdom.setStyle(c, "width", "100%");
                imdom.setStyle(c, "height", "100%");
            }

            imdom.ElBegin(c, el.DIV); {
                if (im.isFirstRender(c)) {
                    imdom.setStyle(c, "zIndex", "100");
                    imdom.setStyle(c, "backgroundColor", "black");
                    imdom.setStyle(c, "color", "white");
                    imdom.setStyle(c, "position", "absolute");
                    imdom.setStyle(c, "top", "0");
                    imdom.setStyle(c, "left", "0");
                }

                const fpsRingbuffer = im.State(c, newRingBuffer);
                pushValue(fpsRingbuffer, im.getFpsCounterState(c).frameMs);

                imdom.Str(c, Math.floor(1000 / getAverage(fpsRingbuffer.values)));
                imdom.Str(c, " fps");
            } imdom.ElEnd(c, el.DIV);

            imdom.ElBegin(c, el.DIV); {
                if (im.isFirstRender(c)) {
                    imdom.setStyle(c, "backgroundColor", "transparent");
                    imdom.setStyle(c, "height", "100%");
                    imdom.setStyle(c, "transform", "translate(50%, 50%)");
                }

                const anim = im.GetInline(c, imGalaxyOfDivs) ??
                    im.Set(c, { t: 0,  });

                if (!state.paused) {
                    anim.t += im.getDeltaTimeSeconds(c);
                    if (anim.t > 2 * Math.PI) {
                        anim.t -= 2 * Math.PI;
                    }
                }

                im.For(c); for (let armIdx = 0; armIdx < numArms; armIdx++) {
                    let angleOffset = (armIdx / numArms) * 2 * Math.PI + anim.t;
                    let tMult = 1;

                    const numSquares = subliminalMessage.length * 3;
                    im.For(c); for (let squareIdx = 0; squareIdx < numSquares; squareIdx++) {
                        let angle = tMult * (squareIdx / numSquares) * 2 * Math.PI + anim.t;
                        if (angle > 2 * Math.PI) {
                            angle -= 2 * Math.PI;
                        }

                        const size = 10 * angle;
                        const positionOffset = 60;

                        const x = positionOffset * Math.cos(angle + angleOffset) * angle;
                        const y = positionOffset * Math.sin(angle + angleOffset) * angle;

                        let opacity = 1;
                        let padAngle = 1;
                        if (angle < padAngle) {
                            opacity = angle / padAngle;
                        } else {
                            let angleFromTheBack = 2 * Math.PI - angle;
                            if (angleFromTheBack < padAngle) {
                                opacity = angleFromTheBack / padAngle;
                            }
                        }

                        const letter = subliminalMessage[squareIdx % subliminalMessage.length];
                        imSquareLetter(c, x, y, size, opacity, letter);
                    } im.ForEnd(c);
                } im.ForEnd(c);
            } imdom.ElEnd(c, el.DIV);
        } imdom.ElEnd(c, el.DIV);
    } im.IfEnd(c)
}

function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}

function newRingBuffer(): RingBuffer {
    return {
        // dont cheat the benchmark by filling with 0ms
        values: Array(100).fill(10000),
        i: 0,
    };
}

function pushValue(rb: RingBuffer, value: number) {
    rb.values[rb.i] = value;
    rb.i = (rb.i + 1) % rb.values.length;
}

function getAverage(values: Array<number>) {
    let n = 0;
    for (const val of values) {
        n += val;
    }
    return n / values.length;
}


function imSquareLetter(
    c: ImCache,
    x: number, y: number,
    size: number,
    opacity: number,
    letter: string
) {
    // flooring to, the values change way less frequently.
    // Only chrome macbook retina HDR users shall notice.
    x = Math.floor(x);
    y = Math.floor(y);
    size = Math.floor(size);
    opacity = Math.floor(opacity * 255) / 255;

    if (im.If(c) && opacity > 0.01) {
        imdom.ElBegin(c, el.DIV); {
            if (im.isFirstRender(c)) {
                imdom.setStyle(c, "position", "absolute");
                imdom.setStyle(c, "transform", "translate(50%, 50%)")
                imdom.setStyle(c, "fontWeight", "bold")
                // Does literally nothing what the heck
                imdom.setStyle(c, "textRendering", "optimizeSpeed")
            }

            if (im.Memo(c, size))    { imdom.setStyle(c, "fontSize", 18 + size + "px"); }
            if (im.Memo(c, x))       { imdom.setStyle(c, "top", x + "px"); }
            if (im.Memo(c, y))       { imdom.setStyle(c, "left", y + "px"); }
            if (im.Memo(c, opacity)) { imdom.setStyle(c, "opacity", "" + opacity); }

            imdom.Str(c, letter);
        } imdom.ElEnd(c, el.DIV);
    } im.IfEnd(c);
}


```

OK, maybe that one wasn't quite 60fps, and it's probably making your computer 
    fan spin a little.
It's way more taxing than most UIs will ever be though, since
    the opacity and position of every element is changing every render.
If you profile this page while it's running, you'll find that the most expensive 
    methods are actually the calls to the DOM API's own style setters, as opposed 
    to data-manipulations done in this framework.
Don't believe me? Click the example to pause it - the FPS should go right back up to 
    your monitor's refresh-rate.

If the code examples haven't put you off the framework by now, then great!
However, some things about these examples may have stuck out to you. 

#list[
-   What is this `c: ImCache` thing all the UI elements have as their first argument?
-   Who are `im`, `el` and `imdom`?
-   What is `im.If` and `im.For`, and why do I need them?
-   Why `im.GetInline`? Does this imply the existance of `im.Get`?
-   How do I handle exceptions? 
]

Before I tell you, you should probably #url[get set up, /?test=How+to+install+imJS] first.
