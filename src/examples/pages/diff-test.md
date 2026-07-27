# Diff test

As it turns out, our blog post needs a minimum amount of
text in order for the width of the page to actually be what it 
needs to be !

Initial state:


```ts - imSetPosition abstraction #diff[1]
imDivBegin(); {
    imDivBegin(); {
        // OMG
    } imDivEnd();
} imDivEnd();
imDivBegin(); {
    imDivBegin(); {
        // OMG
    } imDivEnd();
} imDivEnd();
```


```ts - Moving the player around #diff[-1]
imDivBegin(); {
        // OMG
    imDivBegin(); {
    } imDivEnd();
} imDivEnd();
imDivBegin(); {
    imDivBegin(); {
        // OMG
    } imDivEnd();
} imDivEnd();
```
