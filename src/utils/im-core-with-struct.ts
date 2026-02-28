// IM-CORE 1.075 - Alternate implementation for performance testing
// that doesn't use a single array with manual fields.
// It's about the same on chromium based browsers.
// It is definitely slower on firefox, which is a shame.

// NOTE: I'm currently working on 3 different apps with this framework,
// so even though I thought it was mostly finished, the API appears to still be changing slightly.
// Majority of the last changes have just been updates to the documentation though

import { assert } from "src/utils/assert";

// Conventions
//  - An 'immediate mode' method or 'im' method is any method that eventually _writes_ to the `ImCache`.
//    These methods should ideally be prefixed with 'im'.
//    Conversely, methods that don't touch the imCache, or that will only ever _read_ from the imCache, should NOT be prefixed with 'im'.
//    This allows developers (and in the future, static analysis tools) to know that this method can't be rendered conditionally, or
//    out of order, similar to how React hooks work. This is really the only convention I would recommend you actually follow.
//
//  - imMethods that begin a scope and have a corresponding method to end that scope should be called `im<Name>Begin` and `im<Name>End`. 
//    Some day, I plan on making an eslint rule that will make use of this convention to flag missing closing statements.
//    Though I have significantly reduced the chance of this bug happening with typeIds and such,
//    missing begin/end statements not being paired corectly can still not be caught, and it can 
//    cause some strange behaviour or even silent data corruption in some cases.
//
//    NOTE: This framework still may have methods or utils that I called them so frequently that I omitted the `Begin` from them. 
//    As discussed above, I'm in the process of renaming them to conform to `<Begin>/<End>`. There will be carve-outs for
//    imIf, imSwitch, imFor and other basic control-flow stuff. I should probably just make this 
//    static analysis tool - it would speed up the process...


/**
 * Allows us to cache state for our immediate mode callsites.
 * Initialize this on your end with `const cache: ImCache = [];`. It's just an array
 */
// export type ImCache = unknown & { readonly __ImCache: unique symbol; }; // Opaque struct. 
export type ImCache = {
    idx:                       number;
    currentEntries:            ImCacheEntries;
    currentWaitingForSet:      boolean;
    fpsCounterState:           FpsCounterState;
    rootEntries:               ImCacheEntries;
    needsRerender:             boolean;
    rerenderFn:                (c: ImCache) => void;
    rerenderFnInner:           (c: ImCache) => void;
    isRendering:               boolean;
    isEventRerender:           boolean;
    renderCount:               number;
    animateFn:                 (dt: number) => void;
    animateFnStillAnimating:   boolean;
    animationTimeLast:         number;
    animationTime:             number;
    animationDeltaTimeSeconds: number;
    itemsIterated:             number;
    itemsIteratedLastFrame:    number;
    totalDestructors:          number;
    totalMapEntries:           number;
    totalMapEntriesLastFrame:  number;
    renderFnChanges:           number;
    dt:                        number;

    stack: ImCacheEntries[];
};

export type ImCacheEntries = {
    idx:                           number;
    lastIdx:                       number;
    internalType:                  number;
    parentType:                    TypeId<unknown>;
    parentValue:                   unknown;
    completedOneRender:            boolean;
    keyedMap:                      Map<ValidKey, ListMapBlock> | undefined;
    removeLevel:                   RemovedLevel;
    isInConditionalPathway:        boolean;
    isDerived:                     boolean;
    startedConditionallyRendering: boolean;
    destructors:                   (() => void)[] | undefined;
    keyedMapRemoveLevel:           RemovedLevel;

    items: unknown[]
};

export type FpsCounterState = {
    renderCount: number;
    lastRenderCount: number;
    renderStart: number;
    renderEnd: number;
    frameMs: number;
    renderMs: number;
}

export function newFpsCounterState(): FpsCounterState {
    return {
        renderCount: 0,
        lastRenderCount: 0,
        renderStart: 0,
        renderEnd: 0,
        frameMs: 0,
        renderMs: 0,
    }
}

export function fpsMarkRenderingStart(fps: FpsCounterState) {
    const t = performance.now();;

    fps.renderMs = fps.renderEnd - fps.renderStart;
    fps.frameMs = t - fps.renderStart;
    fps.renderStart = t;
    fps.lastRenderCount = fps.renderCount;
    fps.renderCount = 0;
}

export function fpsMarkRenderingEnd(fps: FpsCounterState) {
    fps.renderEnd = performance.now();
}



export const REMOVE_LEVEL_NONE = 1;
// This is the default remove level for im-blocks, im-arrays, im-if/else conditionals, and im-switch.
// The increase in performance far oughtweighs any memory problems.
export const REMOVE_LEVEL_DETATCHED = 2;
// This is the default for im-keyed map entries. This is because we can key components on arbitrary values. 
// It is common (and intended behaviour) to use object references directly as keys.
// However, if those objects are constantly created and destroyed, this can pose a problem for REMOVE_LEVEL_DETATCHED. 
// Using REMOVE_LEVEL_DESTROYED instead allows the map to clean up and remove those keys, so 
// that the size of the map isn't constantly increasing.
export const REMOVE_LEVEL_DESTROYED = 3;

export type RemovedLevel
    = typeof REMOVE_LEVEL_NONE
    | typeof REMOVE_LEVEL_DETATCHED   
    | typeof REMOVE_LEVEL_DESTROYED;

// TypeIDs allow us to provide some basic sanity checks and protection
// against the possiblity of data corruption that can happen when im-state is accessed 
// conditionally or out of order. The idea is that rather than asking you to pass in 
// some random number, or to save a bunch of type ID integers everywhere, you can 
// just pass in a reference to a function to uniquely identify a piece of state.
// You probably have a whole bunch of them lying around somewhere.
// The function that you are creating the state from, for example. 
// The return value of the function can be used to infer the return value of
// the {@link imGetsState} call, but it can also be a completely unrelated function
// - in which case you can just use {@link imInlineTypeId}. As long as a function
// has been uniquely used within a particular entry list at a particular slot, the 
// likelyhood of out-of-order rendering errors will reduce to almost 0.
export type TypeId<T> = (...args: any[]) => T;

/**
 * Used when the return type of the typeId function has nothing to do with the contents of the state.
 * We still need some way to check for out-of-order rendering bugs, and you probably have a function or two nearby that you can use.
 * This is an alterantive to the prior implementation, which forced you to pollute your module scopes with named integers.
 *
 * ```ts
 * let pingPong; pingPong = imGet(c, inlineTypeId(Math.sin));
 * if (!pingPong) pingPong = imSet(c, { t: 0 });
 * ```
 */
export function inlineTypeId<T = undefined>(fn: Function) {
    return fn as TypeId<T>;
}

// Can be any valid object reference. Or string, but avoid string if you can - string comparisons are slower than object comparisons
export type ValidKey = string | number | Function | object | boolean | null | unknown;

export const USE_MANUAL_RERENDERING = 1 << 0;
export const USE_REQUEST_ANIMATION_FRAME = 1 << 1;

export function newImCache(): ImCache {
    const rootEntries = newImCacheEntries(INTERNAL_TYPE_CACHE, imCacheBegin, null);

    const c: ImCache = {
        idx:                       0,
        currentWaitingForSet:      false,
        fpsCounterState:           newFpsCounterState(),
        rootEntries:               rootEntries,
        currentEntries:            rootEntries,
        needsRerender:             false,
        rerenderFn:                noOp,
        rerenderFnInner:           noOp,
        animateFn:                 noOp,
        animateFnStillAnimating:   false,
        isRendering:               false,
        isEventRerender:           false,
        renderCount:               0,
        animationTimeLast:         0,
        animationTime:             0,
        animationDeltaTimeSeconds: 0,
        itemsIterated:             0,
        itemsIteratedLastFrame:    0,
        totalMapEntriesLastFrame:  0,
        totalDestructors:          0,
        totalMapEntries:           0,
        dt:                        0,
        renderFnChanges:           0,

        stack: [],
    };
    c.rootEntries.parentValue = c;

    return c;
}

export function newImCacheEntries(
    internalType: number,
    parentType: TypeId<unknown>,
    parentValue: unknown,
): ImCacheEntries {
    return {
        idx:                           0,
        lastIdx:                       0,
        internalType:                  internalType,
        parentType:                    parentType,
        parentValue:                   parentValue,
        completedOneRender:            false,
        keyedMap:                      undefined,
        removeLevel:                   REMOVE_LEVEL_DETATCHED,
        isInConditionalPathway:        false,
        isDerived:                     false,
        startedConditionallyRendering: false,
        destructors:                   undefined,
        keyedMapRemoveLevel:           REMOVE_LEVEL_DESTROYED,

        items: [],
    };
}

export function getItemsIterated(c: ImCache): number {
    return c.itemsIterated;
}

export function getTotalMapEntries(c: ImCache): number {
    return c.totalMapEntriesLastFrame;
}

export function getTotalDestructors(c: ImCache): number {
    return c.totalDestructors;
}

export function isEventRerender(c: ImCache) {
    return c.isEventRerender;
}

export function markNeedsRererender(c: ImCache) {
    c.needsRerender = true;
}

export function getCurrentCacheEntries(c: ImCache) {
    return c.currentEntries;
}

export function getEntriesRemoveLevel(entries: ImCacheEntries) {
    return entries.removeLevel;
}

export function getEntriesIsInConditionalPathway(entries: ImCacheEntries) {
    return entries.isInConditionalPathway;
}

export function getStackLength(c: ImCache) {
    return c.stack.length;
}



/**
 * Pass in {@link USE_REQUEST_ANIMATION_FRAME} to get the intended experience - 
 * The animatin loop will make the following things significantly easier:
 *  - Animating that one thing
 *  - Writing robust javascript interaction logic that doesn't keep getting stuck in a particular bugged 
 *      state due to callbacks not being fired when you thought they would
 *  - 'reacting' to any state from anywhere. VanillaJS objects, your own data stores, api responses, you name it
 *
 * If you want to avoid the animation loop for whatever reason, pass in the {@link USE_MANUAL_RERENDERING} flag instead.
 *  - You'll need to manually call c.rerenderFn() whenever any state anywhere changes.
 *  - Methods that previously reported a deltaTime will report a constant 1/30 instead.
 * 
 * NOTE: the rerender function and the `useEventLoop` parameter are completely ignored after the first render, and this will never change.
 */
export function imCacheBegin(
    c: ImCache,
    renderFn: (c: ImCache) => void,
    flags: typeof USE_REQUEST_ANIMATION_FRAME | typeof USE_MANUAL_RERENDERING = USE_REQUEST_ANIMATION_FRAME
) {
    if (c.rerenderFnInner !== renderFn) {
        c.rerenderFnInner = renderFn;

        // In a production app, this should remain 1.
        // In a dev environment with HMR enabled, it should be incrementing each
        // time HMR causes the render function to reload.
        const id = c.renderFnChanges + 1;
        c.renderFnChanges = id;

        c.rerenderFn = (c: ImCache) => {
            // I've found a significant speedup by writing code like
            // if (x === false) or if (x === true) instaed of if (!x) or if (x).
            // You won't need to do this in 99.9999% of your code, but it
            // would be nice if all 'library'-like code that underpins most of the stuff did it.
            if (c.isRendering === true) {
                // we can't rerender right here, so we'll queue a rerender at the end of the component
                c.needsRerender = true;
            } else {
                c.isEventRerender = true;
                try {
                    renderFn(c);
                } catch (e) {
                    console.error(e);
                }
                c.isEventRerender = false;
            }
        };


        if ((flags & USE_MANUAL_RERENDERING) !== 0) {
            c.animateFn   = noOp;
        } else if ((flags & USE_REQUEST_ANIMATION_FRAME) !== 0) {
            const animateFn = (t: number) => {
                if (c.animateFnStillAnimating === false) {
                    return;
                }

                if (c.isRendering === true) {
                    // This will make debugging a lot easier. Otherwise the animation will play while
                    // we're breakpointed. Firefox moment. xD
                    return;
                }

                if (c.rerenderFnInner !== renderFn) {
                    return;
                }

                c.animationTime = t;

                renderFn(c);

                // Needs to go stale, so that c.rerenderFnInner !== renderFn can work.
                requestAnimationFrame(animateFn);
            }
            c.animateFnStillAnimating = true;
            c.animateFn = animateFn;
            requestAnimationFrame(animateFn);
        } else {
            throw new Error("Invalid flags");
        }
    }

    const fpsState = getFpsCounterState(c);
    if (c.isEventRerender === false) {
        fpsMarkRenderingStart(fpsState);
    }
    fpsState.renderCount += 1;

    c.needsRerender = false;
    c.isRendering   = true; 
    c.idx           = -1;
    c.itemsIteratedLastFrame = c.itemsIterated;
    c.itemsIterated = 0;
    c.totalMapEntriesLastFrame = c.totalMapEntries;
    c.totalMapEntries = 0;
    c.currentWaitingForSet = false;
    c.renderCount++;

    if ((flags & USE_REQUEST_ANIMATION_FRAME) !== 0) {
        c.animationDeltaTimeSeconds = (c.animationTime - c.animationTimeLast) / 1000;
        c.animationTimeLast = c.animationTime;
    } else {
        c.animationDeltaTimeSeconds = 1 / 30;
    }

    imCacheEntriesBegin(c, c.rootEntries, imCacheBegin, c, INTERNAL_TYPE_CACHE);

    return c;
}

// TODO: possibly redundant, remove if we can
export function getFpsCounterState(c: ImCache): FpsCounterState {
    assert(c.fpsCounterState != null);
    return c.fpsCounterState;
}

// Enqueues a cache rerender. 
// Usually to process an event without waiting for the next animation frame
export function rerenderImCache(c: ImCache) {
    c.rerenderFn(c);
}

function noOp() {}

export function imCacheEnd(c: ImCache) {
    imCacheEntriesEnd(c);

    const startIdx = -1;
    if (c.idx > startIdx) {
        console.error("You've forgotten to pop some things: ", c.stack.slice(0, c.idx + 1));
        throw new Error("You've forgotten to pop some things");
    } else if (c.idx < startIdx) {
        throw new Error("You've popped too many thigns off the stack!!!!");
    }

    c.isRendering = false;

    const needsRerender = c.needsRerender;
    if (needsRerender === true) {
        // Other things need to rerender the cache long after we've done a render. Mainly, DOM UI events - 
        // once we get the event, we trigger a full rerender, and pull the event out of state and use it's result in the process.
        rerenderImCache(c);

        // Some things may occur while we're rendering the framework that require is to immediately rerender
        // our components to not have a stale UI. Those events will set this flag to true, so that
        // We can eventually reach here, and do a full rerender.
        c.needsRerender = false;
    }

    if (c.isEventRerender === false) {
        fpsMarkRenderingEnd(c.fpsCounterState);
    }
}

const INTERNAL_TYPE_NORMAL_BLOCK = 1;
const INTERNAL_TYPE_CONDITIONAL_BLOCK = 2;
const INTERNAL_TYPE_ARRAY_BLOCK = 3;
const INTERNAL_TYPE_KEYED_BLOCK = 4;
const INTERNAL_TYPE_TRY_BLOCK = 5;
const INTERNAL_TYPE_CACHE = 6;
const INTERNAL_TYPE_SWITCH_BLOCK = 7;

// Some common errors will get their own dedicated throw Error insead of a simple assert + comment
function internalTypeToString(internalType: number): string {
    switch (internalType) {
        case INTERNAL_TYPE_NORMAL_BLOCK:      return "INTERNAL_TYPE_NORMAL_BLOCK";
        case INTERNAL_TYPE_CONDITIONAL_BLOCK: return "INTERNAL_TYPE_CONDITIONAL_BLOCK";
        case INTERNAL_TYPE_ARRAY_BLOCK:       return "INTERNAL_TYPE_ARRAY_BLOCK";
        case INTERNAL_TYPE_KEYED_BLOCK:       return "INTERNAL_TYPE_KEYED_BLOCK";
        case INTERNAL_TYPE_TRY_BLOCK:         return "INTERNAL_TYPE_TRY_BLOCK";
        case INTERNAL_TYPE_CACHE:             return "INTERNAL_TYPE_CACHE";
        case INTERNAL_TYPE_SWITCH_BLOCK:      return "INTERNAL_TYPE_SWITCH_BLOCK";
    }

    return "Custom user type: " + internalType
}

export function imCacheEntriesBegin<T>(
    c: ImCache,
    entries: ImCacheEntries,
    parentTypeId: TypeId<T>,
    parent: T,
    internalType: number,
) {
    __imPush(c, entries);

    assert(entries.parentType === parentTypeId);
    assert(entries.internalType === internalType);

    // NOTE: your API doesn't need to support changing the parent value every frame.
    // In fact, most of the APIs I have made so far don't.
    // This line of code only exists for the few times when you do want this.
    entries.parentValue = parent;
    entries.idx = -2;
    if (entries.items.length === 0) {
        entries.lastIdx = -2;
    }

    const map = entries.keyedMap;
    if (map !== undefined) {
        // TODO: maintain a list of things we rendered last frame.
        // This map may become massive depending on how caching has been configured.
        for (const v of map.values()) {
            v.rendered = false;
        }
    }
}

function __imPush(c: ImCache, entries: ImCacheEntries) {
    c.idx += 1;
    if (c.idx === c.stack.length) {
        c.stack.push(entries);
    } else {
        c.stack[c.idx] = entries;
    }

    c.currentEntries = entries;
}

export function imCacheEntriesEnd(c: ImCache) {
    __imPop(c);
}

function __imPop(c: ImCache): ImCacheEntries {
    const entries = c.currentEntries;
    const idx = --c.idx;
    c.currentEntries = c.stack[idx];
    assert(idx >= -1);
    return entries;
}


/**
 * Allows you to get/set state inline without using lambdas, when used with {@link imSet}:
 * ```ts
 * const s = imGet(c, fn) ?? imSet(c, { blah });
 * ```
 *
 * {@link typeId} is a function reference that we use to check that susbequent state access is for the 
 * correct state. This is required, because state is indexed by the position where `imGet` is called,
 * and conditional rendering/etc can easily break this order. I've not looked at React sourcecode, but
 * I imagine it is very similar to the rule of hooks that they have.
 *
 * The type of the value is assumed to have the return type of the `typeId` function that was specified.
 * It does not necessarily need to actually be constructed by that function. 
 * See {@link imGetInline} - it does not make this assumption, and allows you to use typeIds
 * purely as an ID.
 *
 * You might need to refresh the state more often:
 *
 * ```ts
 * const depChanged = imMemo(c, dep);
 *
 * let s = imGet(c, fn);
 * if (!s || depChanged) {
 *      s = imSet(c, someConstructorFn(dep));
 * };
 * ```
 *
 * All calls to `imGet` must be followed by `imSet` the very first time, to populate the initial state.
 * An assertion will throw if this is not the case.
 * NOTE: This function is a fundamental primitive that most of the other methods in this framework are built with.
 */
export function imGet<T>(
    c: ImCache,
    typeId: TypeId<T>,
    initialValue: T | undefined = undefined
): T | undefined {
    const entries = c.currentEntries;
    c.itemsIterated++;

    // Make sure you called imSet for the previous state before calling imGet again.
    assert(c.currentWaitingForSet === false);

    // [type, value][type,value],[typ....
    // ^----------->^
    entries.idx += 2;

    const idx = entries.idx;
    if (idx === 0) {
        // Rendering 0 items is the signal to remove an immediate-mode block from the conditional pathway.
        // This means we can't know that an immediate mode block has re-entered the conditional pathway untill 
        // we start rendering to it again for the first item, which is what this if-block is handling

        if (entries.isInConditionalPathway === false) {
            entries.isInConditionalPathway        = true;
            entries.startedConditionallyRendering = true;
            entries.removeLevel                   = REMOVE_LEVEL_NONE;
        } else {
            // NOTE: if an error occured in the previous render, then
            // subsequent things that depended on `startedConditionallyRendering` being true won't run.
            // I think this is better than re-running all the things that ran successfully over and over again.
            entries.startedConditionallyRendering = false;
        }
    }

    const items = entries.items;
    if (idx < items.length) {
        if (items[idx] !== typeId) {
            const errorMessage = "Expected to populate this cache entry with a different type. Your begin/end pairs probably aren't lining up right";
            console.error(errorMessage, items[idx], typeId);
            throw new Error(errorMessage);
        }
    } else if (idx === items.length) {
        items.push(typeId);
        items.push(initialValue);
        c.currentWaitingForSet = true;
    } else {
        throw new Error("Shouldn't reach here");
    }

    return items[idx + 1] as T | undefined;
}

/**
 * When you have code like this:
 * ```ts
 * if (!imGet(c) || valueChanged) imSet(c, value);
 * ```
 * When value could be undefined, it will trigger every frame. You can use imSetRequired instead.
 * This code will check "allocated or nah" instead of "is the value we have undefined?", which is more correct.
 * ```ts
 * if (imSetRequired(c) || valueChanged) imSet(c, value);
 * ```
 */
export function imSetRequired(c: ImCache): boolean {
    return c.currentWaitingForSet;
}

/**
 * Allows you to get/set state inline. Unlike {@link imGet},
 * the type returned by {@link typeIdInline} is not necessarily
 * the type being stored.
 *
 * ```ts
 * const = imGetInline(c, fn) ?? imSet(c, { blah });
 * ```
 */
export function imGetInline(
    c: ImCache,
    typeIdInline: TypeId<unknown>,
): undefined {
    // NOTE: undefined return type is a lie! Will also return whatever you set with imSet.
    // But we want typescript to infer the value of `x = imGet(c) ?? imSet(c, val)` to always be the type of val.
    return imGet(c, inlineTypeId(typeIdInline));
}


/**
 * A shorthand for a pattern that is very common.
 * NOTE: if your state gains dependencies, you can just use imGet and imSet directly, as intended.
 */
export function imState<T>(c: ImCache, fn: () => T): T {
    let val = imGet(c, fn);
    if (val === undefined) val = imSet(c, fn());
    return val;
}

// NOTE: currently unused, consider removing
export function getEntryAt<T>(entries: ImCacheEntries, idx: number, typeId: TypeId<T>): T {
    const type = entries.items[idx];
    if (type !== typeId) {
        throw new Error("Didn't find <typeId::" + typeId.name + "> at " + idx);
    }

    const val = entries.items[idx + 1];
    return val as T;
}

export function getEntriesParent<T>(c: ImCache, typeId: TypeId<T>): T {
    // If this assertion fails, then you may have forgotten to pop some things you've pushed onto the stack
    const entries = c.currentEntries;
    assert(entries.parentType === typeId);
    return entries.parentValue as T;
}

export function getEntriesParentFromEntries<T>(entries: ImCacheEntries, typeId: TypeId<T>): T | undefined {
    if (entries.parentType === typeId) {
        return entries.parentValue as T;
    }
    return undefined;
}


export function imSet<T>(c: ImCache, val: T): T {
    const entries = c.currentEntries;
    const idx = entries.idx;
    entries.items[idx + 1] = val;
    c.currentWaitingForSet = false;
    return val;
}

export type ListMapBlock = { rendered: boolean; entries: ImCacheEntries; };

/**
 * Creates an entry in the _Parent's_ keyed elements map.
 */
function __imBlockKeyedBegin(c: ImCache, key: ValidKey, removeLevel: RemovedLevel) {
    const entries    = c.currentEntries;
    const parentType = entries.parentType;
    const parent     = entries.parentValue;

    entries.keyedMapRemoveLevel = removeLevel;

    let map = entries.keyedMap as (Map<ValidKey, ListMapBlock> | undefined);
    if (map === undefined) {
        map = new Map<ValidKey, ListMapBlock>();
        entries.keyedMap = map;
    }

    let block = map.get(key);
    if (block === undefined) {
        // Similar to a derived block, but it's owned by this map rather than the list of entries.
        block = {
            rendered: false,
            entries: newImCacheEntries(INTERNAL_TYPE_KEYED_BLOCK, parentType, parent),
        };
        map.set(key, block);
    }

    /**
     * You're rendering this list element twice. You may have duplicate keys in your dataset.
     * If that is not the case, a more common cause is that you are mutating collections while iterating them.
     * All sorts of bugs and performance issues tend to arise when I 'gracefully' handle this case, so I've just thrown an exception instead.
     *
     * If you're doing this in an infrequent event, here's a quick fix:
     * {
     *      let deferredAction: () => {} | undefined;
     *      imCacheListItem(s);
     *      for (item of list) {
     *          if (event) deferredAction = () => literally same mutation
     *      }
     *      imCacheListItemEnd(s);
     *      if (deferredAction) deferredAction();
     * }
     */
    assert(block.rendered === false);

    block.rendered = true;

    imCacheEntriesBegin(c, block.entries, parentType, parent, INTERNAL_TYPE_KEYED_BLOCK);
}

/**
 * Allows you to reuse the same component for the same key.
 * This key is local to the current entry list, which means that multiple `imKeyedBegin` calls all reuse the same entry list
 * pushed by `imFor` in this example:
 *
 * ```ts
 * imFor(c); for (const val of list) {
 *      if (!val) continue;
 *      imKeyedBegin(c, val); { ... } imKeyedEnd(c);
 * } imForEnd(c);
 * ```
 */
export function imKeyedBegin(c: ImCache, key: ValidKey) {
    __imBlockKeyedBegin(c, key, REMOVE_LEVEL_DESTROYED);
}

export function imKeyedEnd(c: ImCache) {
    __imBlockDerivedEnd(c, INTERNAL_TYPE_KEYED_BLOCK);
}

// You probably don't need a destructor unless you're being forced to add/remove callbacks or 'clean up' something
export function cacheEntriesAddDestructor(c: ImCache, destructor: () => void) {
    const entries = c.currentEntries;
    let destructors = entries.destructors;
    if (destructors === undefined) {
        destructors = [];
        entries.destructors = destructors;
    }

    destructors.push(destructor);
    c.totalDestructors++;
}

function imCacheEntriesOnRemove(entries: ImCacheEntries) {
    if (entries.isInConditionalPathway === true) {
        recursivelyEnumerateEntries(entries, imCacheEntriesRemoveEnumerator);
    }
}

export function recursivelyEnumerateEntries(entries: ImCacheEntries, fn: (entries: ImCacheEntries) => boolean) {
    const shouldEnumerate = fn(entries);
    if (shouldEnumerate) {
        for (let i = 0; i < entries.items.length; i += 2) {
            const t = entries.items[i];
            const v = entries.items[i + 1];
            if (t === imBlockBegin) {
                recursivelyEnumerateEntries(v as ImCacheEntries, fn);
            }
        }


        let map = entries.keyedMap as (Map<ValidKey, ListMapBlock> | undefined);
        if (map !== undefined) {
            for (const block of map.values()) {
                recursivelyEnumerateEntries(block.entries, fn);
            }
        }
    }
}

function imCacheEntriesRemoveEnumerator(entries: ImCacheEntries): boolean {
    // don't re-traverse these items.
    if (entries.isInConditionalPathway === true) {
        entries.isInConditionalPathway = false;
        return true;
    }

    return false;
}

function imCacheEntriesOnDestroy(c: ImCache, entries: ImCacheEntries) {
    // don't re-traverse these items.
    if (entries.removeLevel < REMOVE_LEVEL_DESTROYED) {
        entries.removeLevel = REMOVE_LEVEL_DESTROYED;
        entries.isInConditionalPathway = false;

        for (let i = 0; i < entries.items.length; i += 2) {
            const t = entries.items[i];
            const v = entries.items[i + 1];
            if (t === imBlockBegin) {
                imCacheEntriesOnDestroy(c, v as ImCacheEntries);
            }
        }

        const destructors = entries.destructors;
        if (destructors !== undefined) {
            for (const d of destructors) {
                try {
                    d();
                    c.totalDestructors--;
                } catch (e) {
                    console.error("A destructor threw an error: ", e);
                }
            }
            entries.destructors = undefined;
        }
    }
}

// This is the typeId for a list of cache entries.
export function imBlockBegin<T>(
    c: ImCache,
    parentTypeId: TypeId<T>,
    parent: T,
    internalType: number = INTERNAL_TYPE_NORMAL_BLOCK
): ImCacheEntries {
    let entries; entries = imGet(c, imBlockBegin);
    if (entries === undefined) {
        entries = imSet(c, newImCacheEntries(internalType, parentTypeId, parent));
    }

    imCacheEntriesBegin(c, entries, parentTypeId, parent, internalType);

    return entries;
}

export function __GetEntries(c: ImCache): ImCacheEntries {
    const entries = c.currentEntries;
    return entries;
}

export function imBlockEnd(c: ImCache, internalType: number = INTERNAL_TYPE_NORMAL_BLOCK) {
    const entries = c.currentEntries;

    if (entries.internalType !== internalType) {
        const message = `Opening and closing blocks may not be lining up right. You may have missed or inserted some blocks by accident. `
            + "expected " + internalTypeToString(entries.internalType) + ", got " + internalTypeToString(internalType);
        throw new Error(message)
    }

    let map = entries.keyedMap as (Map<ValidKey, ListMapBlock> | undefined);
    if (map !== undefined) {
        c.totalMapEntries += map.size;

        const removeLevel = entries.keyedMapRemoveLevel;
        if (removeLevel === REMOVE_LEVEL_DETATCHED) {
            for (const v of map.values()) {
                if (v.rendered === false) {
                    imCacheEntriesOnRemove(v.entries);
                }
            }
        } else if (removeLevel === REMOVE_LEVEL_DESTROYED) {
            // This is now the default for keyed elements. You will avoid memory leaks if they
            // get destroyed instead of detatched. 
            for (const [k, v] of map) {
                if (v.rendered === false) {
                    imCacheEntriesOnDestroy(c, v.entries);
                    map.delete(k);
                }
            }
        } else {
            throw new Error("Unknown remove level");
        }
    }

    entries.completedOneRender = true;

    const idx     = entries.idx;
    const lastIdx = entries.lastIdx;
    if (idx !== lastIdx) {
        if (lastIdx === -2) {
            // This was the first render. All g
            entries.lastIdx = idx;
        } else if (idx !== -2) {
            // This was not the first render...
            throw new Error("You should be rendering the same number of things in every render cycle");
        }
    }

    imCacheEntriesEnd(c);
}

export function __imBlockDerivedBegin(c: ImCache, internalType: number): ImCacheEntries {
    const entries = c.currentEntries;
    const parentType = entries.parentType;
    const parent = entries.parentValue;

    return imBlockBegin(c, parentType, parent, internalType);
}

// Not quite the first render - 
// if the function errors out before the entries finish one render, 
// this method will rerender. Use this when you want to do something maybe once or twice or several times but hopefully just once,
// as it doesn't require an additional im-state entry. 
// For example, if you have an API like this:
// ```ts
// imDiv(c); imRow(c); imCode(c); imJustifyCenter(c); imBg(c, cssVars.bg); {
// } imDivEnd(c);
// ```
// Each of those methods that 'augment' the call to `imDiv` may have their own initialization logic.
export function isFirstishRender(c: ImCache): boolean {
    const entries = c.currentEntries;
    return entries.completedOneRender === false;
}

export function __imBlockDerivedEnd(c: ImCache, internalType: number) {
    // The DOM appender will automatically update and diff the children if they've changed.
    // However we can't just do
    // ```
    // if (blah) {
    //      new component here
    // }
    // ```
    //
    // Because this would de-sync the immediate mode call-sites from their positions in the cache entries.
    // But simply putting them in another entry list:
    //
    // imConditionalBlock();
    // if (blah) {
    // }
    // imConditionalBlockEnd();
    //
    // Will automatically isolate the next immediate mode call-sites with zero further effort required,
    // because all the entries will go into a single array which always takes up just 1 slot in the entries list.
    // It's a bit confusing why there isn't more logic here though, I guess.
    //
    // NOTE: I've now moved this functionality into core. Your immediate mode tree builder will need
    // to resolve diffs in basically the same way.

    imBlockEnd(c, internalType);
}

/**
 * Usage:
 * ```ts
 *
 * // Annotating the control flow is needed - otherwise it won't work
 *
 * if (imIf(c) && <condition>) {
 *      // <condition> will by adequately type-narrowed by typescript
 * } else if (imElseIf(c) && <condition2>){
 *      // <condition>'s negative will not by adequately type-narrowed here though, sadly.
 *      // I might raise an issue on their github soon.
 * } else {
 *      imElse(c);
 *      // <condition>'s negative will not by adequately type-narrowed here though, sadly, same as above.
 * } imIfEnd(c);
 *
 * ```
 *
 * It effectively converts a variable number of im-entries into a single if-entry,
 * that has a fixed number of entries within it, so it still abides by 
 * the immediate mode restrictions.
 * This thing works by detecting if 0 things were rendered, and 
 * then detatching the things we rendered last time if that was the case. 
 * Even though code like below will work, you should never write it:
 * ```ts
 * // technically correct but dont do it like this:
 * imIf(c); if (<condition>) {
 * } else {
 *      imElse(c);
 * }imIfEnd(c);
 * ```
 * Because it suggests that you can extend it like the following, which would
 * no longer be correct:
 * ```ts
 * imIf(c); if (<condition>) {
 * } else if (<condition2>) {
 *      // NOO this will throw or corrupt data :((
 *      imElseIf(c);
 * } else {
 *      imElse(c);
 * } imIfEnd(c);
 * ```
 *
 * The framework assumes that every conditional annotation will get called in order,
 * till one of the conditions passes, after which the next annotation is `imIfEnd`. 
 * But now, it is no longer guaranteed that imElseIf will always be called if <condition> was false.
 * This means the framework has no way of telling the difference between the else-if block
 * and the else block (else blocks and else-if blocks are handled the same internally).
 */
export function imIf(c: ImCache): true {
    __imBlockArrayBegin(c);
    __imBlockConditionalBegin(c);
    return true;
}

export function imIfElse(c: ImCache): true {
    __imBlockConditionalEnd(c);
    __imBlockConditionalBegin(c);
    return true;
}

export function imIfEnd(c: ImCache) {
    __imBlockConditionalEnd(c);
    __imBlockArrayEnd(c);
}

// All roads lead to rome (TM) design pattern. not sure if good idea or shit idea
export const imEndIf = imIfEnd;
export const imElse = imIfElse;
export const imEndSwitch = imSwitchEnd;
export const imEndFor = imForEnd;
export const imCatch = imTryCatch;

/**
 * Example usage:
 * ```ts
 * imSwitch(c, key) switch (key) {
 *      case a: { ... } break;
 *      case b: { ... } break;
 *      case c: { ... } break;
 * } imSwitchEnd(c);
 * ```
 * ERROR: Don't use fallthrough, use if-else + imIf/imIfElse/imIfEnd instead. 
 * Fallthrough doesn't work as you would expect - for example:
 * ```ts
 *  imSwitch(c,key); switch(key) {
 *          case "A": { imComponent1(c); } // fallthrough (nooo)
 *          case "B": { imComponent2(c); }
 *  } imSwitchEnd(c);
 * ```
 * When the key is `b`, an instance of imComponent2 is rendered. However,
 * when the key is `a`, two completely separate instances of `imComponent1` and `imComponent2` are rendered.
 *      You would expect the `imComponent2` from both switch cases to be the same instance, but they are duplicates 
 *      with none of the same state.
 * 
 */
export function imSwitch(c: ImCache, key: ValidKey, cached: boolean = false) {
    __imBlockDerivedBegin(c, INTERNAL_TYPE_SWITCH_BLOCK);
    // I expect the keys to a switch statement to be constants that are known at 'compile time', 
    // so we don't need to worry about the usual memory leaks we would get with normal keyed blocks.
    // NOTE: However, switches can have massive components behind them.
    // This decision may be reverted in the future if we find it was a mistake.
    __imBlockKeyedBegin(c, key, cached ? REMOVE_LEVEL_DETATCHED : REMOVE_LEVEL_DESTROYED);
}

export function imSwitchEnd(c: ImCache) {
    __imBlockDerivedEnd(c, INTERNAL_TYPE_KEYED_BLOCK);
    __imBlockDerivedEnd(c, INTERNAL_TYPE_SWITCH_BLOCK);
}

function __imBlockArrayBegin(c: ImCache) {
    __imBlockDerivedBegin(c, INTERNAL_TYPE_ARRAY_BLOCK);
}

function __imBlockConditionalBegin(c: ImCache) {
    __imBlockDerivedBegin(c, INTERNAL_TYPE_CONDITIONAL_BLOCK);
}

function __imBlockConditionalEnd(c: ImCache) {
    const entries = c.currentEntries;
    if (entries.idx === -2) {
        // The index wasn't moved, so nothing was rendered.
        // This tells the conditional block to remove everything rendered under it last. 
        imCacheEntriesOnRemove(entries);
    }

    __imBlockDerivedEnd(c, INTERNAL_TYPE_CONDITIONAL_BLOCK);
}

export function imFor(c: ImCache) {
    __imBlockArrayBegin(c);
}

export function imForEnd(c: ImCache) {
    __imBlockArrayEnd(c);
}

function __imBlockArrayEnd(c: ImCache) {
    const entries = c.currentEntries

    const idx = entries.idx;
    const lastIdx = entries.lastIdx;
    if (idx < lastIdx) {
        // These entries have left the conditional rendering pathway
        for (let i = idx + 2; i <= lastIdx; i += 2) {
            const t = entries.items[i];
            const v = entries.items[i + 1];
            if (t === imBlockBegin) {
                imCacheEntriesOnRemove(v as ImCacheEntries);
            }
        }
    }

    // we allow growing or shrinking this kind of block in particular
    entries.lastIdx = idx;

    __imBlockDerivedEnd(c, INTERNAL_TYPE_ARRAY_BLOCK);
}

// This is the initial value, so that anything, even `undefined`, can trigger imMemo
const IM_MEMO_FIRST_EVER = {};

export const MEMO_NOT_CHANGED = 0;
/** returned by {@link imMemo} if the value changed */
export const MEMO_CHANGED = 1;
/** 
 * returned by {@link imMemo} if this is simply the first render. 
 * Most of the time the distinction is not important, but sometimes,
 * you want to happen on a change but NOT the initial renderer.
 */
export const MEMO_FIRST_RENDER = 2;
/** 
 * returned by {@link imMemo} if this is is caused by the component
 * re-entering the conditional rendering codepath.
 */
export const MEMO_FIRST_RENDER_CONDITIONAL = 3;

export type ImMemoResult
    = typeof MEMO_NOT_CHANGED
    | typeof MEMO_FIRST_RENDER
    | typeof MEMO_CHANGED
    | typeof MEMO_FIRST_RENDER_CONDITIONAL;

/**
 * Returns non-zero when either:
 *  1. val was different from the last value, 
 *  2. the component wasn't in the conditional rendering pathway before,
 *    but it is now
 *
 * 1 makes sense, but 2 only arises is because we want code like this to work
 * in any concievable context:
 *
 * ```ts
 * function uiComponent(focused: boolean) {
 *      if (imMemo(c, focused)) {
 *          // recompute state
 *      }
 * }
 * ```
 *
 * With 1. alone, it won't work if the component leaves the conditional rendering pathway, 
 * and then re-enters it:
 *
 * ```ts
 * imSwitch(c); switch(currentComponent) {
 *      case "component 1": uiComponent(true); break;
 *      case "component 2": somethingElse(true); break;
 *  } imSwitchEnd(c);
 * ```
 *
 * But with 2. as well, it should always work as expected.
 *
 * NOTE: NaN !== NaN. So your memo will fire every frame. 
 * I'm still diliberating on should my code be 'correct' and always handle this for every imMemo, 
 * even when it doesn't really need to, or if you sohuld just handle it as needed. 
 * For now, you can handle it.
 *
 * NOTE: you can use the bitwise-or operator if you just want to check if multiple values have changed
 * without extracing value1Changed, value2Changed, etc. variables since this is not short-circuiting like the || operator.
 * 
 * ```ts
 * if (imMemo(c, value1) | imMemo(c, value2) | imMemo(c, value3) | imMemo(c, value4)) {
 *      // Something
 * }
 * ```
 */
export function imMemo(c: ImCache, val: unknown): ImMemoResult {
    /**
     * NOTE: I had previously implemented imMemo() and imMemoEnd():
     *
     * ```ts
     * if (imMemoBegin().val(x).objectVals(obj)) {
     *      <Memoized component>
     * } imMemoEnd();
     * ```
     * It can be done, but I've found that it's a terrible idea in practice.
     * I had initially thought {@link imMemo} was bad too, but it has turned out to be very useful.
     * turned out to be very useful, more so even, than imMemo2(c, ...manyArgs)
     */

    let result: ImMemoResult = MEMO_NOT_CHANGED;

    const entries = c.currentEntries;

    let lastVal = imGet(c, inlineTypeId(imMemo), IM_MEMO_FIRST_EVER);
    if (lastVal !== val) {
        imSet(c, val);
        if (lastVal === IM_MEMO_FIRST_EVER) {
            result = MEMO_FIRST_RENDER;
        } else {
            result = MEMO_CHANGED;
        }
    } else if (entries.startedConditionallyRendering === true) {
        result = MEMO_FIRST_RENDER_CONDITIONAL;
    }

    return result;
}

export type TryState = {
    entries: ImCacheEntries;
    err: any | null;
    recover: () => void;
    unwoundThisFrame: boolean;
    // TODO: consider Map<Error, count: number>
};

/**
 * ```ts
 * const tryState = imTry(c); try {
 *      // render your component here
 * } catch(err) {
 *      imTryCatch(c, tryState, err);
 *      // don't render anything here! Only do the other things
 * } imTryEnd(c, tryState); 
 * ```
 */
export function imTry(c: ImCache): TryState {
    const entries = __imBlockDerivedBegin(c, INTERNAL_TYPE_TRY_BLOCK);

    let tryState = imGet(c, imTry);
    if (tryState === undefined) {
        const val: TryState = {
            err: null,
            recover: () => {
                val.err = null;
                c.needsRerender = true;
            },
            entries,
            unwoundThisFrame: false,
        };
        tryState = imSet(c, val);
    }

    tryState.unwoundThisFrame = false;

    return tryState;
}

export function imTryCatch(c: ImCache, tryState: TryState, err: any) {
    tryState.unwoundThisFrame = true;

    if (tryState.err != null) {
        throw new Error("Your error boundary pathway also has an error in it, so we can't recover!");
    }

    c.needsRerender = true;
    tryState.err = err;
    const idx = c.stack.lastIndexOf(tryState.entries);
    if (idx === -1) {
        throw new Error("Couldn't find the entries in the stack to unwind to!");
    }

    c.idx = idx - 1;
    c.currentEntries = c.stack[idx - 1];
}

export function imTryEnd(c: ImCache, tryState: TryState) {
    if (tryState.unwoundThisFrame === true) {
        // nothing to end.
        assert(c.stack[c.idx + 1] === tryState.entries);
    } else {
        const entries = c.currentEntries;
        assert(entries === tryState.entries);
        __imBlockDerivedEnd(c, INTERNAL_TYPE_TRY_BLOCK);
    }
}

export function getDeltaTimeSeconds(c: ImCache): number {
    return c.animationDeltaTimeSeconds;
}

// Events can trigger rerenders in the same frame.
export function getRenderCount(c: ImCache) {
    return c.renderCount;
}

/**
 * Sometimes, you'll need a global state stack, so that you have access to some state.
 * ```ts
 *
 * globalStateStackPush(gssThing, thing); {
 *      ...
 *      // can be arbitrarily deep inside the component
 *      const thing = globalStateStackGet(gssThing);
 *
 *      ...
 * } globalStateStackPop(gssThing);
 * ```ts
 *
 * 99% of the time, this pattern is a mistake that obfuscates and overcomplicates the code, 
 * and you should just pass `thing` as an additional function parameter.
 * And for things you pass around *a lot* like c: ImCache, you will incur a significant performance
 * hit by using this approach (as of 08/2025) (on top of the perf hit of using this framework).
 *
 * Here is a decision matrix you can use to decide whether to use this pattern or not:
 *
 *                                      | I need this state everywhere,    | I infrequently need this value, but the requirement can arise 
 *                                      | and I make sure to pass it as    | naturally somewhere deep node of the component, and I have
 *                                      | a method param everywhere anyway | to spend a bunch of time adding an extra function argument 
 *                                      |                                  | everywhere when it does.
 * ----------------------------------------------------------------------------------------------------------------------------
 *  This state is related to my app's   | Don't use a global state stack   | Don't use a global state stack 
 *  domain model                        | ctx: AppGlobalState is here      | s: BlahViewState is here
 * ----------------------------------------------------------------------------------------------------------------------------
 *  This state is not related to my     | Don't use a global state stack   | Consider using a global state stack
 *  app's domain model                  | c: ImCache is here               | getGlobalEventSystem() is here
 * ----------------------------------------------------------------------------------------------------------------------------
 *
 */
export function globalStateStackPush<T>(gss: T[], item: T) {
    // I've put a limit on the context depth to 100. But really, anything > 1 is already a niche usecase, and anything > 2 may never happen in practice ... 
    if (gss.length > 100) {
        throw new Error("Looks like you're forgetting to pop items from your global state array. tsk tsk tsk. ");
    }

    gss.push(item);
}

export function globalStateStackGet<T>(gss: T[]): T {
    // No context item was pushed
    assert(gss.length > 0);

    return gss[gss.length - 1];
}

export function globalStateStackPop<T>(gss: T[], item: T): T {
    const currentItem = globalStateStackGet(gss);

    // Item may have changed mid-render, which definitely shouldn't ever happen, and is indicative of some other issue.
    assert(currentItem === item);

    gss.pop();

    return currentItem;
}
