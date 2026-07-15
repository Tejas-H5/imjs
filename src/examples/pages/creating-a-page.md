# Creating a page

Your first page will need to be this:

```typescript
import { ImCache, im, imdom } from "im-js";

const globalImCache: ImCache = [];
imMain(globalImCache);

function imMain(c: ImCache) {
    im.CacheBegin(c, imMain); {
        imdom.Begin(c, document.body); {
            imApp(c);
        } imdom.End(c, document.body);
    } im.CacheEnd(c);
}

function imApp(c: ImCahe) {
    imdom.Str(c, "Your app goes here");
}
```

`imJS` has now been fully set up, and you can start #url[making actual components!, /?test=Creating+components]

Nerds and GOATs can keep reading:

## How it works

#list[
- `globalImCache` is the immediate-mode cache that saves DOM-nodes, among other things,
    that the app can reuse between renders.
- `c: ImCache` is where you pass in the cache. I could have made this cache a
    global variable that lived inside my library, but this makes it more clear
    which functions are `im-js`-related (and easier to test).
    #list[
    - I don't have UI testing yet, but it's one of the things on my list
    ]
- `im.CacheBegin(c, imMain);` initialises the framework, and starts the animation loop
- `imdom.Begin(c, document.body)` initialises the DOM adapter, and makes `document.body` 
    the root of the DOM that the framework will start appending to.
    It is assumed to be the singular global root, and as such, will also initialise and
        poll the global event system that methods like `imdom.IsKeyPressed` and `imdom.hasMousePress`
        rely on.
- `imApp` is your app
- `imdom.End` closes off the `imdom.Begin` from earlier.
    It also finalizes the list of DOM elements that were rendered, but just the ones
        under `document.body`. 
    Other elements would have had `imdom.End` called on them by then, so the
        children would have been finalized by this point.
- `im.CacheEnd` closes off the cache from earlier.
    This is
]

