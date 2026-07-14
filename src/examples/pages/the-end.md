# The end

I'm surprised you made it this far, congrats! 
You now know the framework well enough to read and understand the rest of the code that I didn't mention, 
    as well as work on your own stuff.
Take a look at `im-dom` and `im-ui` for more ideas of how to structure your code, if needed. 
Time to start building!

## Future scope

#list[
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
]

## Out of scope

There are some things that I have specifically planned never work on:

#list[
- There will never be an imJS dev-tools. 
Most things can just be done using the existing browser devtools, and this is especially the case with this framework.
- HMR (Hot-module-reloading support) - the implementation details of the framework make adding it too complicated and 
    not really super worth it. 
I did not build this framework with HMR in mind at all - I would rather have a small app that can be rebuild 
    instantly than an app that takes ages to rebuild, but supports HMR, but the HMR still takes a few seconds, 
    and every now and then it causes bugs, etc. etc. 
It is too difficult to evolve my apps alongside it. 
Just persist the current state of your program to localStorage/indexedDB as needed. 
The dev-server I use can also reload my program so quickly that there is no real benefit to having HMR. 
I've had set up a custom esbuild context, but with a custom server that has an extra long KeepAlive setting 
    on the connection (surprisingly effective).
    (Someone has since figured out #url[the real issue, https://github.com/vitejs/vite/issues/21653] that my local KeepAlive solution hid)
- I also plan to never introduce a mechanism by which you can manually render just a subset of the UI tree, or keep some subset of your website 'static', with dynamic islands. The complexity is not worth it - just animate the entire page.
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
