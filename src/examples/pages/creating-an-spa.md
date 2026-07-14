# Creating a page

## Setting up the immediate mode cache

We need to create the immediate mode cache. 
It's just an array `[]`.
It's also typical for this to just be a global variable.
The state's gotta go somewhere:

```typescript
import { ImCache } from "im-js";

function imMain(c: ImCache) {
    // TODO: implement
}

const globalImCache: ImCache = [];
imMain(globalImCache);
```

`globalImCache` gets passed into every immediate-mode function. 
It makes it clear at-a-glance that a method will _read_ from the immediate mode cache.
Methods that start with `im` AND have this `c: ImCache` arugment will most likely _write_
to the immediate-mode cache.

## Further documentation

Before we continue, you should try navigating to the definition of `im` in your editor. 
There, you'll find basically every method and constant, and it will 
    be somewhat extensively documented. 
You may even be able to figure out how to bootstrap `im-js` entirely yourself just by
    reading the code!
Try that, and when you're finished and want to check if it matches or you are just
    stuck, come back to this.

## Starting the animation loop

Let's start the main animation loop:

```typescript

import { ImCache, im } from "im-js";

function imMain(c: ImCache) {
    im.CacheBegin(c, imMain); {
        // TODO: write app
    } im.CacheEnd(c);
}

const globalImCache: ImCache = [];
imMain(globalImCache);
```

## im-dom

We've now set up the framework and the animation loop,  but we haven't 
    done enough to start rendering DOM nodes.
Let's do that now:

```typescript
import { ImCache, im, imdom } from "im-js";

function imMain(c: ImCache) {
    im.CacheBegin(c, imMain); {
        imdom.Begin(c, document.body); {
            // TODO: write app
        } imdom.End(c, document.body);
    } im.CacheEnd(c);
}

const globalImCache: ImCache = [];
imMain(globalImCache);
```

## Your app

`imJS` has now been fully set up, and you can start building.

```typescript
import { ImCache, im, imdom } from "im-js";

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

const globalImCache: ImCache = [];
imMain(globalImCache);
```

You are now ready to start #url[making actual components!, /?test=Creating+components]
