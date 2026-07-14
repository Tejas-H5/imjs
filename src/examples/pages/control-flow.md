# Control flow part 1 - conditional/list rendering

The framework interleaves immediate-mode entries as a series of `[type][value]` entries to mitigate out-of-order reading bugs, 
    as mentioned earlier. 
*However, this only works if the next render reads from the cache in the exact same order that the previous render wrote to it!*
The restriction is quite similar to the #url[rule of hooks, https://react.dev/reference/rules/rules-of-hooks], 
    which you will be all too familiar with if you've ever used React to a serious degree.
This sounds very restrictive. How will we ever do conditional rendering or list rendering? 
Sadly, it's not magic - this next component will actually stop working after incrementing the count 
    changes the current conditional pathway the code is in: 

```ts - Conditional rendering - but sadly, it doesn't just work
function imConditionalRenderingExampleIfStatementBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);

    imDivBegin(c); {
        if (s.count < 3) {
            imdom.Str(c, "It's time to pump up those numbers, rookie.");
        } else {
            imdom.ElBegin(c, el.B); {
                imdom.Str(c, "Gee, that's a high count! ");
            } imdom.ElEnd(c, el.B);
        } 
    } imDivEnd(c);

    imDivBegin(c); {
        imdom.Str(c, s.count);
    } imDivEnd(c);
}
```

`Error: Expected to populate this cache entry with type=imStr, but got newDomAppender. 
    Either your begin/end pairs probably aren't lining up right, or you're conditionally rendering immediate-mode state`.
This is because in one render, the code on line 11 (`imdom.Str`) requests the state for a DOM Text node. 
But in the next render, the code accessing that immediate-mode slot would be line 13 (`imdom.ElBegin`), which requests the state for a 
    DOM element instead.
The solution this framework has settled on, is for you to annotate if-blocks with calls to `im.If`, `im.IfElse`, `im.Else` and `im.IfEnd`:

```ts - Conditional rendering - using control flow annotations

function imConditionalRenderingExampleIfStatementNotBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);

    imDivBegin(c); {
        if (im.If(c) && s.count < 3) {
            imdom.Str(c, "It's time to pump up those numbers, rookie.");
        } else {
            im.Else(c);
            imdom.ElBegin(c, el.B); {
                imdom.Str(c, "Gee, that's a high count! ");
            } imdom.ElEnd(c, el.B);
        } im.IfEnd(c);
    } imDivEnd(c);

    imDivBegin(c); {
        imdom.Str(c, s.count);
    } imDivEnd(c);
}

```

Now, in one render, the  method calls look like `im.If`, `<some stuff>`, `im.IfEnd`, and in a subsequent render, 
    the method calls look like `im.If`, `im.Else`, `<some stuff>`, `im.IfEnd`. 
If `im.IfElse` was called, the framework can infer that the first if-branch wasn't taken, and can prepare a 
    separate entries list for the next branch. 
I'm not gonna lie - if we could get the framework working without this, that would be way nicer.
I do think it's a better solution to immediate-mode than the alternative solutions of disallowing state from being stored 
    in the immediate-mode tree, or using ids to disambiguate all your state.

You'll need to do something similar for for-loops. 
In this example, the immediate-mode code in the for-loop will start eating into the state of things we rendered outside the for-loop:

```ts - List rendering - broken
function imListRenderingExampleBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }

        for (let i = 0 ; i < s.count; i++) {
            if (i > 0) imdom.Str(c, ", ");
            imdom.Str(c, i);
        }

        imdom.Str(c, "The count is ");
        imdom.Str(c, s.count);
    } imDivEnd(c);
}
```

`Error: You should be rendering the same number of things in every render cycle`. 
If the framework doesn't emit this error, we have no other way of knowing about this state-collision bug 
    because the types of the two state are actually the same.

The framework deals with for-loops with the im.For and im.ForEnd methods: 

```ts - List rendering - Fixed
function imListRenderingExampleBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }

        im.For(c); for (let i = 0 ; i < s.count; i++) {
            if (i > 0) imdom.Str(c, ", ");
            imdom.Str(c, i);
        } im.ForEnd(c);

        imdom.Str(c, "The count is ");
        imdom.Str(c, s.count);
    } imDivEnd(c);
}
```

The list rendering doesn't need to be done with a for-loop - any kind of iteration is fine. 
You could have just as easily written it with .forEach or for-of, a while loop, a custom iteration function, etc. 
    as long as it isn't asyncronous.

## The end ... or is it?

You now know how to do conditional rendering and list-rendering in `imJS`. 
Well, almost. 
There are still a couple of caveats I haven't mentioned.
I have yet to cover `im.Switch`, and `im.Try`/`im.Catch` - that will be in Part 2!



TODO: mention other caveats with keyed list rendering, like how if you swap two items while rendering a list, it messes things up.
