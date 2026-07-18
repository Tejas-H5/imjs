# The end

Now that you've completed every tutorial, you're well on your way to becoming god 
    emperor of frontend UI web-dev. 
Time to start building!

## Future scope

#list[
- Hot module reload (or another solution to this problem). 
    The stuff I work on right now is all local-first. This means that the
        software loads fast, and can read/write it's state whenever it wants.
    This also means that the framework won't be suited to debugging web apps, where your
        site might populate after some back and forth with a server.
- Real tests (written and curated by myself, not shat out in the hundreds by AI)
- The global event system currently doesn't work well for mobile/touch interactions, need to fix that
- In the future, I plan on making a static analysis tool (probably just an eslint rule) that matches imXBegin and imXEnd 
    and lets you know at compile time if these opening/closing pairs are matching or not. 
It turns out to be hard to solve this without making the code overly verbose, and this framework has a LOT of assertions 
    in place specifically to catch bugs relating to this.
- It currently doesn't have SSR, and though there is no technical limitation that makes it impossible - 
    I simply don't care to implement it at the moment. 
But I am not against including it later.
- Suspense boundaries not implemented yet.
I haven't stress-tested the framework on client-server stuff as much as I have for
    local storage/indexed-db use cases, but I may end up doing this 
    when I eventually get around to it.
- The default error behaviour is a bit shit - the animation loop simply breaks, and the page
    stops animating. But everything is still responsive! 
    The result is that everything is subtley broken, but it also isn't super clear that is the case.
    Anyway, not ideal.
]

## Out of scope

There are some things that I have specifically planned never work on:

#list[
- Making `c` an object. I designed the API the way I did because I am very much a functions+data 
    kind of programmer - thinking of problems that way has made a lot of things much easier for me.
    It also makes porting the framework to Odin, should I ever want to do this, much easier.
    (this is my favourite language. It has been for 3 years before Primeagen started 
        raising awareness of it. I was using it _before_ it was cool, nyeahhh).
- There will never be an imJS dev-tools. 
    Most things can just be done using the existing browser devtools, and this is especially the case with this framework.
- I also plan to never introduce a mechanism by which you can manually render just a 
    subset of the UI tree.
    The subtle buggy feel of a DOM that is present but not being driven by anything
    is not worth it - just animate the entire page.
]

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.

.



```ts - Dev tools? Aint no way?!

const cnHighlight = "highlighted";

let lastDomNode: DomAppender<HTMLElement> | undefined;
let nextDomNode: DomAppender<HTMLElement> | undefined;

function imJsDevToolsFinalRelease(c: ImCache, entries = im.getRootEntries(c), introspectorRoot: any = null) {
    const isRoot = !introspectorRoot;
    if (!introspectorRoot) introspectorRoot = im.getCurrentCacheEntries(c);
    if (entries === introspectorRoot) return; // Dont recurse into dev tools

    let visible = true;

    if (isRoot) {
        if (lastDomNode !== nextDomNode) {
            if (lastDomNode) imdom.setClass(c, cnHighlight, false, lastDomNode.root);
            if (nextDomNode) imdom.setClass(c, cnHighlight, true, nextDomNode.root);

            lastDomNode = nextDomNode;
        }

        const visibility = imdom.TrackVisibility(c, 0);
        visible = visibility.isVisible;
        nextDomNode = undefined;
    }

    if (im.If(c) && !visible) {
        imdom.Str(c, "Nah");
    } else {
        im.Else(c);

        if (isRoot) {
            imDivBegin(c); {
                if (im.isFirstRender(c)) imdom.setStyle(c, "position", "fixed");
                if (im.isFirstRender(c)) imdom.setStyle(c, "bottom", "10px");
                if (im.isFirstRender(c)) imdom.setStyle(c, "left", "10px");
                if (im.isFirstRender(c)) imdom.setStyle(c, "backgroundColor", cssVars.bg);

                imdom.Str(c, "Devtool enabled. 😭😭🥀");

                imdom.Str(c, lastDomNode?.root ?? "[Object object]");

                imdom.ElBegin(c, el.STYLE); {
                    if (im.isFirstRender(c)) {
                        imdom.setTextUnsafe(c, `.${cnHighlight} { outline: 10px solid #FF00FF; }`);
                    }
                } imdom.ElEnd(c, el.STYLE);
            } imDivEnd(c);
        }

        imDivBegin(c); {
            if (im.isFirstRender(c)) imdom.setStyle(c, "flex", "1");
            if (im.isFirstRender(c)) imdom.setStyle(c, "paddingLeft", "20px");

            im.For(c); im.ForEachCacheEntryItem(entries, (t, v) => {
                if (t === imdom.newDomAppender) {
                    const value = v as DomAppender<HTMLElement>;
                    imdom.ElBegin(c, el.DIV); {
                        const root = imDivBegin(c); {
                            imdom.Str(c, value.root);
                        } imDivEnd(c);

                        const hasMouseOverActualElement = imdom.hasMouseOver(c, (value as DomAppender<HTMLElement>).root);

                        if (imdom.hasMouseOver(c) || hasMouseOverActualElement) {
                            nextDomNode = value;
                        }

                        imdom.setClass(c, cnHighlight, lastDomNode === value, root.root);
                    } imdom.ElEnd(c, el.DIV);
                } else if (t === im.ImmediateModeBlockBegin) {
                    const value = v as ImCacheEntries;
                    imJsDevToolsFinalRelease(c, value, introspectorRoot);
                }
            }); im.ForEnd(c);
        } imDivEnd(c);
    } im.IfEnd(c);
}

```
