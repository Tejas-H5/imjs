# Why does this exist

In this day and age, where AI agents can spit out whatever React component you want in a couple of seconds,
why bother with yet another UI framework? It seems a bit pointless, but it isn't.

While I don't like React that much, it is the best UI framework I've tried so far.
Functional components in particular, look aesthetically pleasing, and are intuitive and easy to understand, build and compose.
I simply won't bother trying or using any UI frameworks that don't have something like them. 

However, this framework was created largely because of these shortcomings of React. Let me elaborate on that a bit:

1. React discourages packaging related fields into singular objects. This is because it relies heavily on memoization of large numbers of props to get things done. Objects will change as frequently as the things inside of them, so passing around whole objects, while simpler, is detrimental to memoization. This also causes code and refactors to become far more complicated and tedious than they need to be, since I need to manually pass around individual props instead of singular objects.
2. React encourages the frequent shallow-copying of data. This makes it incredibly difficult for any app to remain performant. If there was some kind of escape-hatch where we could write performant allocation-free code and manually trigger rerenders, it may have been worth it, but it. All the state-management libraries also encourage something similar, or convert simple mutations into shallow copies with Proxy magic. It is simply more performant, easier to test, and easier to reason about code that just acts on plain objects. Immutability has it's place, but it shouldn't be literally every piece of state in the program.
3. Hooks in react cannot be rendered conditionally. Hooks need to take in an `enabled` prop so that devs can turn them on and off. They need to be wrapped in components so that they can be called multiple times, or their inner workings updated. I imagine it is partially a techincal limitation of React's immediate mode renderer that is similar to the one in this framework, except I have added mechanisms to allow for conditional 'hook' rendering (I just don't call them hooks here).
4. Code cannot be written inside of JSX, close to where it is actually needed. This leads to massive monolith components overtime - massive components that should really have been split into smaller components long ago, but the code kept evolving and now it is too late to do the refactor, because everything depends on everything else. Had it been easy to move and keep state close to where it's actually needed, not only would this refactor be easier - it would also not really be needed. Because state is being declared as close to where it is actually being used, the 'component' boundaries are clearly demarcated, and components only need to be refactored if the programmer wants to, or if they need to actually reuse them.

I have set out to make a framework that:
- Has function components, and is composable in the same way function calls are
- Allows writing zero or low allocation code, as needed
- Can rerender its components at the same refresh rate as the monitor
- Can allow 'hooks' aka state that persists between renders, to be stored as close to where it is being used as possible

# Philosophy

1. Locality of a system's components make reasining about the sytem far easier

I believe that things like the styling, layout information, functionality, and state that a particular UI element needs should live as close to that element as it possibly can in the codebase. 
This means that, among other things, rather than something like this:
```ts
function App() {
    const [todoItems, setTodoItems] = useState([]);
    return todoItems.map(item => <TodoItem key={item.id} item={item} />;
}

function TodoItem(props) {
    // various hooks, interal state, etc
    ...
}
```
I believe it is better to not have a wall between the List and the list item:

```ts
function App() {
    const [todoItems, setTodoItems] = useState([]);

    return (
        <Map data={todoItems} component={(item, i) => (
                // various hooks, interal state, etc
                ...
            )}
        />
    );
}
```


2. Renders should be cheap

All of my projects run at the same refresh rate as the monitor, even though I constantly need to rerender thousands of DOM nodes every frame. The secret: in most of my apps, the is _not_ randomly shuffling itself spontaneously at all times like in benchmarks. This means that memoization is an extremely effective way to perform very few style/class/DOM mutations.
The other secret: Keep memory allocations to an absolute minimum. If I have some massive map or array in my state, I will probably keep it around for almost the entire duration of a component's lifetime on the screen, rather than throwing it away between rerenders. I restrict slop-code to be behind infrequent user-events or other well-defined times in the program. While, there is really nothing stopping you from continuing to use a state-management library with this framework, you simply don't need to if you opt to rerender your component every frame with `requestAnimationFrame` (the intended experience).
With strings, allocation is kinda unavoidable. I have not had many issues with strings causing GC pressure though, yet. 
Do note that I've only ever used this framework in Firefox and Chrome, which have heavily optimized and JITed runtimes. I've got no clue how it's going to do in something like hermes, for example (yet).

3. Callbacks should be avoided in favour of data and methods where possible.

Some issues with callbacks:
- it is very unclear whether they do or do not allocate memory. This is not ideal if you want to rerender at 60fps, though it could also be fine like strings
- in many cases, well-defined primitives that can be composed will offer simpler, more straightforward and more flexible options to a consumer than a black-box system with various hooks, though callbacks still have their place and will need to be used from time to time, possibly as the "just get something that works" entry-layer of your API
- they create arbitrary boundaries in your program. For example:
```ts
function App(root: ImRoot) {
    div(r, r => {
        const innerDiv = div(r, r => {
        });
    });

    // here
}
```
I can no longer access innerDiv `here`, even if I wanted to. It is also fairly cumbersome to type the above.
Something like this is far simpler:

```ts
function App() {
    divBegin(); {
        const innerDiv = divBegin(); {
        } divEnd();
    } divEnd();

    // here
}
```

I still can't access innerDiv `here`, but I could just remove the blocks if needed.


4. Functions may be used as provenance for types

```ts
function newNumber(): number {
    return 0;
}
```

Seems like a pretty pointless function, right? Wrong.
Typescript will imbue this value with a type, and we can use this type to validate that a particular value is actually
of the type that we say it is. It looks something like this:

```ts
type Box<T> = { value: T; typeId: () => T: }

function createBox<T>(typeId: () => T) {
    return { value: typeId(), typeId };
}

function getValueOfTypeOrUndefined<T>(box: Box<unknown>, typeId: () => T): { val: T } | undefined {
    if (box.typeId === typeId) {
        return { val: box.value as T };
    }
    return undefined;
}
```

This technique is used heavily to assert that the type of a value is what we think it is,
and significantly reduce the likelyhood of out-of-order immediate-mode state rendering bugs that would otherwise corrupt data.

An alternative to functions, is to literally use TypeIds:
```ts
type TypeId<T> = string & { __type: T | void };
function newTypeId<T>(key: string): TypeId<T> {
    return key as TypeId<T>;
}
```

The problem, is that you'll be writing a whole bunch of code everywhere to create the TypeIds, whereas
you probably already have one or two functions lying around somewhere already imbued with the type you need!

```ts
const numberBox = createBox(newNumber);
```

5. Being explicit about dependencies is better, most of the time

The following matrix is what I use to decide wheter something should be passed as a parameter to a method, or if it is better-off
as a `globalStateStack` entry (this is our equivelant of React.Context):

```
A := I need this state everywhere, and I make sure to passs it as a method param everywhere anyway
B := I infrequently need this value, but the requirement can arise naturally literally anywhere in a UI component, and I have to spend a bunch of time adding an extra function argument everywhere when it does
C := This state is related to my app's domain model
D := This state is not related to my app's domain model
```

- if A:
    - if C: Pass this as a parameter. A common example of this is `ctx: AppContext` - an object with all state of the entire app packaged into one. Makes it obvious that the component is an application-level utility
    - if D: Pass this as a parameter. A common example is the `c: ImCache` variable you'll see everywhere in the examples here. Makes it obvious that a method reads from the immediate-mode cache, and doesn't make sense to call outside of an immediate mode context
- if B:
    - if C: Pass this as a parameter. A common example of this is `s: WidgetState` - an object that encapsulates all state for a particular widget or subsystem within the program. It may start off as local state, but get moved onto AppContext if that state is needed elsewhere for some reason. Makes it obvious that the component is related to a particular widget/system, and doesn't make sense to use outside of that.
    - if D: Maybe use a global state-stack, only if you really want to (I would advice against it). A common example is `getGlobalEventSystem` that you'll see everywhere in the im-dom examples.
    Any UI component, at any time, for any reason, may require keyboard input or mouse input. It is a pain to pass this around. The disadvantage is that it isn't obvious that method relies on the global state stack. It may actually have been better for me to just put the event system as a value in the app context. But I think the tradeoff is fine in these cases. Similarly, any component may need to asyncronously fetch something, or render SVGs, render context menus, play audio, so on and so forth. They may or may not be candidates for a global state stack

6. Immediate mode syncronous (top down, not async) rendering allows for extremely predictable control flow, and coordination between components.

In general, none of the UI will make use of early-returns. They have a time and place (I use them pretty much everywhere actually) but just not within one of these immediate-mode UI components.


# Drawbacks

There are however, some issues with this framework. 
I don't mind them too much, but you might:

1. The code is somewhat verbose. Here's a react component:

```ts
function Counter() {
    const [count, setCount] = useState(0);
    return (
        <div>
            <div>The count is {count}. <div>
            <button onClick={() => setCount(count + 1)}>Increment</button>
        </div>
    );
}
```

Here's the corresponding component in my framework:

```ts

function newCounterState() {
    return { count: 0 };
}

function imCounter(c: ImCache) {
    const s = imState(c, newCounterState);

    imDivBegin(c); {
        imDivBegin(c); imStr("The count is "); imStr(c, count); imDivEnd(c);
        imButtonBegin(c); {
            const click = imOn(c, EV_ON_CLICK);
            if (click) {
                s.count += 1;
            }

            imStr(c, "Increment");
        } imButtonEnd(c);
    } imDivEnd(c);
}

```

You'll notice that there is no JSX - it is purely function calls, and it is quite a lot more to type.

2. It can sometimes be hard to track down a missing `imFnEnd()` call. 

3. Doesn't work too well with HMR for now. I have completely disregarded it, as I almost never use it.
- Although - this may be an implementation detail? Not sure.

4. Entire app will be rerenderd on events, so that you can do `e.preventDefault()` or similar on them. 
- Could experiment with flags like `imOn(c, EV_ON_CLICK, PREVENT_DEFAULT)` that allow the framework to automatically 
do this kind of thing and buffer the events.


