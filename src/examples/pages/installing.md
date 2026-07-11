# How to install imJS

imJS is actually written entirely in TypeScript (I just didn't like the name imTS very much). 
As such, these instructions assume you already know how to set up an empty typescript SPA project.
Once you've done that, you'll need to copy the entire `/im-js` folder into somewhere in your project. 
Ideally, some sort of absolute path you've set up where you can just import things from it like `import { ... } from "im-js"`.

### Note about code-formatters

This framework abuses the hell out of the semi-colon. 
We achieve similar-ish code aesthetics to a React component by putting multiple relevant function calls on the same line,
    as you'll see in a moment. 
As such, if you're using formatting tools, I would recommend using a formatter that does *not* convert
    multiple constructs on the same line like this:

```typescript
im.For(c); for (const item of items) {
    ...
} im.ForEnd(c);
```

To multiple lines:

```typescript
// 'fixed it' :D
im.For(c); 
for (const item of items) 
{
    ...
} 
im.ForEnd(c);
```

The default TypeScript formatter for example will not do this.
Other formatters may or may-not be configurable for this, I wouldn't really know about them.


#list[
-  `im-core` contains immediate-mode primitives that you will need for control-flow, state management.
-  `im-dom` is the DOM adapter for im-core, and gives you additional utilities for building and controlling the DOM via the framework, 
    and global event hooks to respond to common user input. It is by no means a 100% comprehensive DOM wrapper, and you _will_
    need to create your own utility methods to do various DOM things.
-   By looking at how im-dom works, you can in theory build an adapter for any other tree structure. 
]

This repo also contains an `im-ui` folder with all the UI components I use in my projects. 
It is completely optional. 
It has a peer-dependency on `"im-js"`, meaning that for those components to work, you need to have a compatible version of 
    `"im-js"` available and importable via the absolute path.
Just copy the ones you want into your project as you need, and make any necessary changes.
You can also PR those changes #url[upstream, https://github.com/Tejas-H5/imjs] if you think its useful 🥺👉👈.

If people actually start using the framework, I will consider making an npm account and putting this stuff on there.
