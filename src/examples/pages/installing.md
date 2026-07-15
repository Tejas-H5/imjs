# How to install imJS

## Downloading

There are a couple of ways:

#table[
#row
#cell[content] *Manually vendoring*
#cell
    Copy the folders you need from #url[this GitHub repository, https://github.com/Tejas-H5/imjs]
        into your project.

```
/im-js/ (required)
    The core framework. You'll need everything from here
    ...
    /im-ui/ (optional)
        A minimal design system I've included for my own convenience.
        It's optional - im-js will work without it.
```

#row
#cell
    *Npm*
#cell
    It's not available on npm (the package registry), because you can just install it from 
        #url[this GitHub repository, https://github.com/Tejas-H5/imjs] directly:

```cmd
npm install github:Tejas-H5/imjs --ignore-scripts
```
]

## Importing stuff

The main framework is everything exported from `"im-js"`:

```typescript
import { im, imdom, el, elsvg, ev, key } from "im-js";
```

I've also included `im-ui`, for my own convenience really:

```typescript
import { imButtonPressed } from "im-js/im-ui/components/im-button";
```

It's a minimal component library and design-system that I use for all my projects. 
It most-likely won't be any good for your project - it exists to draw inspiration 
    for your own design system that will be better suited to the things you're working on.

## Code-formatters

The code you write in this framework will abuse the hell out of semi-colons, code blocks
    and putting multiple relevant function calls on the same line in general 
    (See the examples on #url[previous page, /?test=imJS+-+Overview]).
Your formatter needs to be configured to not do this:

#table[
#row #cell Unformatted #cell Formatted. It's good for normal code, but bad for our framework's UI code
#row 
#cell

```typescript
im.For(c); for (const item of items) {
    ...
} im.ForEnd(c);
```
#cell

```typescript
im.For(c); 
for (const item of items) 
{
    ...
} 
im.ForEnd(c);
```
]


The default TypeScript formatter, for example, does just that - as such, 
    it's the one that I use.

Now that you're set up, let's #url[create your page, /?test=Creating a page]
