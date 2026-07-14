# How to install imJS

It's not available on npm, because you can just install it from GitHub repository directly:

```shell
npm install github:Tejas-H5/imjs --ignore-scripts
```

#list[
- `--ignore-scripts` will disable install hooks. It's a strange time in the web ecosystem,
    and you'll need to start putting this on all your npm installs if you don't already
]

The main framework is everything exported from `"im-js"`:

```typescript
import { im } from "im-js";
```

I've also included `im-ui`, for my own convenience really:

```typescript
import { im } from "im-js/im-ui";
```

It's a minimal component library and design-system that I use for all my projects. 
It most-likely won't be any good for your project - it exists for you
    to quickly try stuff out, and draw inspiration from for your
    own design system that will be better suited to your projects.

## Versioning

This framework now adheres to SemVer `<major.minor.patch>`
#list[
- Increments to `major` are breaking changes, like deprecating or changing existing APIs. 
    As such, you can probably ignore them.
- Increments to `minor` include new features and functionality that are backwards-compatible.
    As such, you can still probably ignore them.
- Increments to `patch` include fixes to ~stupid mistakes I've accidentally introduced~
    critical security vulerabilities. 
    You'll want to install these ASAP. 
]

The default npm semver prefix is `^`, meaning that the `major` version is locked, while
    minor and patch will be incremented. This will be OK.

## Code-formatters

The code you write in this framework will abuses the hell out of semi-colons, code blocks
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
