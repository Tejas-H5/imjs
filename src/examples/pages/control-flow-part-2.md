# Control flow part 2 - keyed rendering, switch, try-catch

In the previous page, we learned about how `imJS` does `if-statements` and `for-loops`.
There is a bit more you'll need to know to make optimal use of the framework.

## Keyed rendering

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
        if (imButtonIsClicked(c, "Shuffle items")) {
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
        if (imButtonIsClicked(c, "Shuffle items")) {
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

## Error boundaries with Try-catch

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
                if (imButtonIsClicked(c, "Dismiss error")) {
                    recover();
                }
            } imDivEnd(c);
        } else if (im.Else(c)) { 
            if (imButtonIsClicked(c, "Click here to launch orbital nuke!")) {
                if (s.orbitalNukes <= 0) throw new Error("All orbital nukes have already been used");
                s.orbitalNukes--;
            }
        } im.IfEnd(c);
    } catch (err) {
        im.Catch(c, tryState, err);
    } im.TryEnd(c, tryState);
}
```

A cool (or crap) thing about this approach, is that a lot of event handling also happens in the render method.
This means that errors that occur in an event can actually propagate into an error boundary!
This can be great or terrible depending on who you are and what you're trying to do, but it's something to be aware of.

## The end ... or is it?

Yes, it is. Nice!
The next page will be about state management.
But I thought the whole point of this framework was that we store our state in plain objects??
All will be revealed in this next page.
