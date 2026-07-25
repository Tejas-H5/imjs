# Diff test

As it turns out, our blog post needs a minimum amount of
text in order for the width of the page to actually be what it 
needs to be !

Initial state:

```ts - imDivBegin/imDivEnd 
A
B
C
```

```ts - imDivBegin/imDivEnd #diff[-1] #id[omg]
A
B
C
```


```ts - Moving the player around #diff[omg]
D
E
F
```

```ts - Moving the player around #diff[omg]
D
E
F
```

