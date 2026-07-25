# Diff test

As it turns out, our blog post needs a minimum amount of
text in order for the width of the page to actually be what it 
needs to be !

Initial state:

```ts - How #id[main]
function imMain(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.Str(c, "Hi");
    } imdom.ElEnd(c, el.DIV);
}

```

Diff with prev block

```ts - Lets go #diff[-1]
function imMain(c: ImCache) {
    imdom.ElBegin(c, el.H1); {
        imdom.Str(c, "Hi");
    } imdom.ElEnd(c, el.H1);
}
```

Diff with an ID

```ts - Lets go #diff[main]
function imMain(c: ImCache) {
    imdom.ElBegin(c, el.H1); {
        imdom.Str(c, "Hi");
    } imdom.ElEnd(c, el.H1);
}
```

Whitespace diff

```ts - Lets go #diff[main]
function imMain(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
            imdom.Str(c, "Hi");
    } imdom.ElEnd(c, el.DIV);
}
```
