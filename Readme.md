# imJS

ImJS is an immediate-mode ui framework that aims to significantly simplify programming frontend UIs.
This repository is a central place where I aim to put all the related code, tests, utils, and tooling.
It's a bit annoying to spread this out in various util folders in different projects.

## Philosophy

See Why.md for more info. There's just too much yapping to put it all here.

## Organisation/Architecture

I recommend that you just copy-paste these files into wherever you want, and then use them.
It will be some time till I figure out how to make an NPM package.
Unlike what the name suggests, this project is actually TypeScript-first.

- im-core.ts
    - The core immediate mode framework lives here. It has no knowledge of things like "the dom". 
        In theory, you can use it to maintain any dynamic tree-like structure, not not just UI.
        This package does _not_ contain a diffing algorithm, for simplicity. 
        This means that you'll have to write one for every concrete target.
        I think this is OK - things like canvas-based im-GUI don't need a diffing algorithm, for example,
        whereas things like the DOM do.
- im-dom.ts
    - A bridge between im-js and the DOM. Contains something vaguely resembling a diffing algorithm, but isn't quite a diffing algorithm.
- im-ui/
    - Optional - contains a cohesive UI system with implementations for various UI primitives, like text inputs/areas, checkboxes, scroll views, layouting, etc. I will be constantly adding to this and improving it as I make more stuff. You may be more knowledgeable about UI, and may decide to make your own instead.
- tests/
    - testing-framework.ts
        - Contains the custom testing framework. It contains features like `.branch()`, which allows us to test more cases
            with less testing code. I haven't seen anything like this in other test frameworks, AFAIK.
- `file`.tests.ts
    -  tests for `file`
