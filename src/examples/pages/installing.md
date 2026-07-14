# How to install imJS

#url[The github repository, https://github.com/Tejas-H5/imjs] contains the following:

```
im-js/
    im-core/
    im-dom/
```

You'll need to copy the `im-js` folder somewhere that you can import from it via 
    an absolute import, i.e `import { ImCache, im, imdom, etc. } from "im-js"`.

`im-js` is a barrel module that re-exports all of `im-core` and `im-dom`. 
You'll always want both - `im` contains the core immediate mode primitives, and `imdom` contains the DOM-related adapters.

## What is the im-ui folder


```
im-js/
...
 +- im-ui/
```

I also include an `im-ui` folder with several UI components I share between multiple projects.
You do *not* need `im-ui` to use `im-js` - there are too many ways to make a design system, and while the one I've made
    is very well suited for the things I make, and may be a good source of inspiration, it will be sorely lacking or 
    wrong for the look of your project.

## Code-formatters

This framework abuses the hell out of the semi-colon, code blocks, 
    and putting multiple relevant function calls on the same line, as you've seen in the #url[previous page, /?test=imJS+-+Overview].
It makes otherwise verbose code far less verbose at minimal cost.
However, this does mean if you're using formatting tools, it would need to be configured to 
    *not* convert multiple constructs on the same line:

```typescript
im.For(c); for (const item of items) {
    ...
} im.ForEnd(c);
```

To multiple lines:

```typescript
// 'fixed it' - your welcome :D
im.For(c); 
for (const item of items) 
{
    ...
} 
im.ForEnd(c);
```

The default TypeScript formatter, for example, is the one that I use - it only fixes up whitespace and indentation without
    moving statements around.
Other formatters may or may not let you configure this.

## The end

You are now ready to #url[create your page, /?test=Creating a page]
