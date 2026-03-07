import { BLOCK, COL, imFixed, imLayoutBegin, imLayoutEnd, imPadding, imSize, INLINE, NA, newCssBuilder, PX } from "src/utils/im-ui";
import { imVisualTestHarness, imVisualTestInstallation, newVisualTest, TEST_CENTERED, VisualTest } from "src/utils/im-ui/visual-testing-harness";
import {
    getCurrentCacheEntries,
    getEntriesParentFromEntries,
    getRootEntries,
    ImCache,
    imCacheBegin,
    imCacheEnd,
    ImCacheEntries,
    imElse,
    imFor,
    imForEachCacheEntryItem,
    imForEnd,
    imGetInline,
    imIf,
    imIfElse,
    imIfEnd,
    imImmediateModeBlockBegin,
    imKeyedBegin,
    imKeyedEnd,
    imSet,
    imSwitch,
    imSwitchEnd,
    imTry,
    imTryCatch,
    imTryEnd,
    isFirstishRender,
    onImmediateModeBlockDestroyed
} from "../utils/im-core";
import {
    DomAppender,
    EL_B,
    EL_BUTTON,
    EL_DIV,
    EL_H1,
    EL_H2,
    EL_LI,
    EL_UL,
    elHasMouseClick,
    elHasMouseOver,
    elSetClass,
    elSetStyle,
    EV_MOUSEDOWN,
    imDomRootBegin,
    imDomRootEnd,
    imElBegin,
    imElEnd,
    imGlobalEventSystemBegin,
    imGlobalEventSystemEnd,
    imOn,
    imStr,
    newDomAppender
} from "../utils/im-dom";

function imHeadingBegin(c: ImCache) {
    return imElBegin(c, EL_H1);
}
function imHeadingEnd(c: ImCache) {
    return imElEnd(c, EL_H1);
}

function imParaBegin(c: ImCache) {
    imLayoutBegin(c, BLOCK);
    if (isFirstishRender(c)) elSetStyle(c, "paddingTop", "10px");
    if (isFirstishRender(c)) elSetStyle(c, "paddingBottom", "10px");
}
function imParaEnd(c: ImCache) {
    return imLayoutEnd(c);
}

function imSubheadingBegin(c: ImCache) {
    return imElBegin(c, EL_H2);
}
function imSubheadingEnd(c: ImCache) {
    return imElEnd(c, EL_H2);
}

function imBaseContainerBegin(c: ImCache) {
    imLayoutBegin(c, BLOCK); imPadding(c, 0, PX, 10, PX, 10, PX, 10, PX);
}
function imBaseContainerEnd(c: ImCache) {
    imLayoutEnd(c);
}

function imTangent(c: ImCache, text: string) {
    const s = imGetInline(c, imTangent) ?? imSet(c, { expanded: false });

    imLayoutBegin(c, INLINE); {
        imStr(c, s.expanded ? text : "...");

        imLayoutBegin(c, INLINE); {
            if (elHasMouseClick(c)) s.expanded = !s.expanded;
            if (isFirstishRender(c)) {
                elSetStyle(c, "padding", "10px");
                elSetStyle(c, "fontWeight", "bold");
                elSetStyle(c, "cursor", "pointer");
            }

            imStr(c, s.expanded ? "<<" : ">>");
        } imLayoutEnd(c);
    } imLayoutEnd(c);
}

const tests: VisualTest[] = [
    newVisualTest(
        "Overview",
        function imJsACompleteOverview(c: ImCache) {
            imBaseContainerBegin(c); {
                imHeadingBegin(c); imStr(c, "imJS - A complete overview"); imHeadingEnd(c);

                imParaBegin(c); {
                    imStr(c, `imJS is an immediate-mode UI framework I created after encountering various issues while using React. It didn't start off as an immediate-mode framework, but I have since found immediate-mode to be a very useful and convenient way to structure my programs. I've done a detailed writeup that elaborates more on the pain-points and the thought process to get to this solution <TODO: here>. In this overview, I'll try to get you up to speed with this framework, what it does, and how you can use it.`);
                } imParaEnd(c);

                imSubheadingBegin(c); imStr(c, "How to put it into it to your project"); imSubheadingEnd(c);

                imParaBegin(c); {
                    imStr(c, `imJS is actually written entirely in TypeScript. In order to use it, you'll need to copy the im-core.ts, im-dom.ts and assert.ts files to some vendor or util directory in your project, where you can import the functions and types that they export. `);
                    imStr(c, `im-core contains immediate-mode primitives that you will need for control-flow and state management. `);
                    imStr(c, `im-dom is the DOM adapter for im-core, and gives you utilities for building and controlling the DOM via the framework, and global event hooks to respond to common user input. It is by no means a 100% comprehensive DOM wrapper, and you may need to add to it or extend it to include other APIs that you want.`);
                    imStr(c, `By looking at how im-dom works, you can in theory build an adapter for any other tree structure.`);
                } imParaEnd(c);

                imParaBegin(c); {
                    imStr(c, `This repo also contains an im-ui folder with all the UI components I use in my projects. It is completely optional. Just copy the ones you want into your project as you need, and make any necessary changes.`);
                } imParaEnd(c);

                imSubheadingBegin(c); imStr(c, "Creating components"); imSubheadingEnd(c);

                imParaBegin(c); {
                    imStr(c, `Components are just functions (however, there is a problem, and I'll cover this later). Here's a simple date-time component to demonstrate:`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imSimpleComponent, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `There is actually a LOT going on here, so let's unpack it:`);
                    imElBegin(c, EL_UL); {
                        imElBegin(c, EL_LI); {
                            imStr(c, `imElBegin is a method from im-dom that opens an immediate-mode scope, within which more DOM nodes may be rendered. This scope must eventually be closed off with another call to imElEnd(c, EL_DIV). The convention here is that any function named imXBegin can be assumed to open some kind of scope that must be closed off with a call to a corresponding imXEnd method. User methods that aren't postfixed with 'Begin' can be assumed to not create a scope.`);
                        } imElEnd(c, EL_LI);
                        imElBegin(c, EL_LI); {
                            imStr(c, `For imElBegin to be performant, it must create a DOM element on the first render, and then reuse it on subsequent renders. The 'c' is the immediate-mode cache where imElBegin saves it's div. This cache is passed to every immediate mode function, as that makes it more explicit that a function reads from the immediate-mode cache somehow. The 'im' prefix is only given to methods that actually write entries into the immediate mode state, which will be important later`);
                        } imElEnd(c, EL_LI);
                        imElBegin(c, EL_LI); {
                            imStr(c, `Between imBegin and imEnd, there are two calls to imStr. This method is an im-dom method that creates a single Text node under the current DOM element, and updates the text whenever the object reference changes by calling by calling toString() on this object.`);
                        } imElEnd(c, EL_LI);
                        imElBegin(c, EL_LI); {
                            imStr(c, `Since the entire framework runs in an animation loop, state can be read directly from anywhere without making any framework-specific adapters. This expression will always be up-to-date.`);
                        } imElEnd(c, EL_LI);
                    } imElEnd(c, EL_UL);
                } imParaEnd(c);

                imParaBegin(c); {
                    imStr(c, "Let's make something a tiny bit more complicated - the counter example that the other frameworks all use in their docs:");
                } imParaEnd(c);

                imVisualTestInstallation(c, imSimpleComponentCounter, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `This example is not much more complicated than the other example, but a couple more things are happening:`);
                    imElBegin(c, EL_UL); {
                        imElBegin(c, EL_LI); {
                            imStr(c, `imGet, imGetInline, imSet are the state-management primitives that all methods use to save immediate-mode state entries. imGet(c, typeId) requests state of type 'typeId', and either returns what we set in the previous frame, or undefined. It will panic if the typeId passed in does not line up with the typeId at the 'current' slot - this flags conditional and out-of-order rendering bugs. A typeId is simply a function (any) => T that we use for type-inference, and also a way to assume what the type of some state is. imGetInline is like imGet, except we can specify any typeId at all, and it will not use type-inference to link the typeId to a return type, so it is good to use _inline_ instead of in some other component. As long as the typeIds in a row are all unique, it will (mostly) prevent out-of-order rendering bugs.`);
                        } imElEnd(c, EL_LI);
                        imElBegin(c, EL_LI); {
                            imStr(c, `imSet will write to the current immediate-mode slot. It MUST be called after the first call to imGet. All other calls to imGet will throw if imSet was not called for the previous call to imGet.`);
                        } imElEnd(c, EL_LI);
                        imElBegin(c, EL_LI); {
                            imStr(c, `imOn is an immediate-mode helper that wraps the 'addeventListener' callback. Whenever that callback fires, your entire app will be synchronously rerendered, so thatyou can call ev.preventDefault() on it if you needed to, and it will work. When the particular subtree is 'destroyed', the event listener will automatically be removed.`);
                        } imElEnd(c, EL_LI);
                    } imElEnd(c, EL_UL);
                } imParaEnd(c);

                imParaBegin(c); {
                    imStr(c, "You'll notice that it's quite a bit verbose. Luckily, our framework is not written in some stupid DSL, and we can just refactor it as if it were any other code. Doing it now will also help clean up the next examples. ");
                    imStr(c, "See? I'm very smart:  TODO: include the refactored methods as well somehow");
                } imParaEnd(c);

                imVisualTestInstallation(c, imSimpleComponentCounterRefactored);

                imSubheadingBegin(c); imStr(c, "However, there is a problem - control flow"); imSubheadingEnd(c);

                // The framework interleaves immediate-mode entries as a series of [type][value] entries to mitigate a large number of out-of-order reading bugs that can silently corrupt state.
                imParaBegin(c); {
                    imStr(c, `The way immediate-mode methods save their state between renders is by writing it into the immediate-mode cache in a sequential manner. `);
                    imElBegin(c, EL_B); {
                        imStr(c, `However, this only works if the next render reads from the cache in the exact same order that the previous render wrote to it! `);
                    } imElEnd(c, EL_B);
                    imStr(c, `This sounds very restrictive. How will we ever be able to do for-loops? if-statement?  `);
                    imStr(c, `For example, this next component will stop working after incrementing the count changes the current conditional pathway the code is in: `);
                } imParaEnd(c);

                imVisualTestInstallation(c, imConditionalRenderingExampleIfStatementBad, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `"Error: Expected to populate this cache entry with type=imStr, but got newDomAppender . Either your begin/end pairs probably aren't lining up right, or you're conditionally rendering immediate-mode state". `);
                    imStr(c, `This is because in one render, the code on line 13 requests the state for imStr. But in the next render, the code accessing that immediate-mode slot would be line 15, which requests the state for a DOM element instead. `);
                    imStr(c, `This framework's solution is for you to annotate if-blocks with calls to imIf, imIfElse, imElse and imIfEnd:`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imConditionalRenderingExampleIfStatementNotBad, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `Now, in one render, the  method calls look like 'imIf', 'imIfEnd', and in a subsequent render, the method calls look like 'imIf', 'imElse', 'imIfEnd'. If imIfElse was called, the framework can infer that the first if-branch wasn't taken, and can prepare a separate entries list for the next branch. `);
                } imParaEnd(c);

                imParaBegin(c); {
                    imStr(c, `You'll need to do something similar for for-loops. In this example, the immediate-mode code in the for-loop will start eating into the state of things we rendered outside the for-loop:`);
                } imParaEnd(c);
                imVisualTestInstallation(c, imListRenderingExampleBad, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `"Error: You should be rendering the same number of things in every render cycle". If the framework doesn't emit this error, we have no way of knowing about this state-collision bug because the types of the two state are actually the same. `);
                    imStr(c, `The framework deals with for-loops with the imFor and imForEnd methods: `);
                } imParaEnd(c);

                imVisualTestInstallation(c, imListRenderingExampleFixed, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `The list rendering doesn't need to be done with a for-loop - any kind of iteration is fine. You could have just as easily written it with .forEach or for-of, a while loop, a custom iteration function, etc. etc.`);
                } imParaEnd(c);

                imParaBegin(c); {
                    imStr(c, `In order to render a list of complicated items, it can be more performant to reuse the same 'entries block' for the same item. To do this, you can key your list items with imKeyedBegin/End. You may also want to render a different 'type' of component per item:`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imListRenderingExampleKeyed, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `It's a bit of a contrived example, since I could have just as easily wrote it without keying:`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imListRenderingExampleNotKeyed, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `However, it does start making a difference when the component for each item is it's own highly complex component, so it's worth knowing about. For now, you'll have to take my word for it, because I'm not about to write a thousand line component to prove it in this overview. `);
                } imParaEnd(c);

                imParaBegin(c); {
                    imStr(c, `There are other times where you'll want to to dispatch to a particular component based on 'the current view', however that may be represented. You may think to reach for imKeyed:`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imSwitchExampleWithKeyedDontDoItLikeThis, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `However, there is a problem. Usage code that might reuse your component in the same scope will no longer work: `);
                } imParaEnd(c);

                imVisualTestInstallation(c, imSwitchExampleWithKeyedUsageCode, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `The same key cannot be rendered to twice. I am thinking about other ways to handle duplicate keys more gracefully, but this bug in particular actually a you problem, and will be present in all those alternate iterations of the framework as well. imKeyed shares it's keys amongst all other entries under the current scope, and it is a bug to render to the same key twice. This is where imSwitch comes in:`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imSwitchExample, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `It's the same as imKeyed, but within it's own separate immediate-mode scope. The usage code from earlier should work now:`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imSwitchExampleWithUsageCode, undefined, TEST_CENTERED);

                imParaBegin(c); {
                    imStr(c, `The final piece of control flow you'll need, is some way to handle exceptions that get thrown while your component is rendering. They can come from this framework, or from any code at all really. Without an error boundary, the current behaviour is for the animation loop to abort itself. A user may not even realise that the app has crashed till they try clicking a button. And I suppose, the button would still work since it invokes renders! But none of the animations will work. <TODO: we gotta handle this better>. For now, it's recommended that you have at least one error boundary at the root of your program. `);
                    imStr(c, `Error boundaries can be implemented by annotating try/catch in a similar way to how we do if-statements, for-loops, and switch statements:`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imErrorBoundaryExampleView, undefined, TEST_CENTERED);

                imSubheadingBegin(c); imStr(c, "State management - initialization, re-initialization, destruction"); imSubheadingEnd(c);

                imParaBegin(c); {
                    imStr(c, `There are primarily two ways to initialize state. The first, and most common way, is to call isFirstishRender(c) to check if this is effectively the first time the component is being rendered:`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imisFirstishRenderExample);

                imParaBegin(c); {
                    imStr(c, `If your component encounters an error, and you decide to recover from that error, the component will rerender, with isFirstishRender still returning true, despite having already returned true once before, hence the name 'firstish' and not 'first'. Because so many components need some way of initializing some idempotent state on the first render, this eliminates the need for a LOT of immediate-mode state entries to be created.`);
                } imParaEnd(c);

                imParaBegin(c); {
                    imStr(c, `However, there are other times when you want to initialize state only once, and then clean up after that state once the component is destroyed. For example, adding an event handler to a component twice can result in catastrophic bugs. Use imGet and imSet for these situations instead of 'isFirstishRender'. `);
                } imParaEnd(c);

                imVisualTestInstallation(c, imInitializeJustOnceExample);

                imParaBegin(c); {
                    imStr(c, `Hey what gives! Disabling mouse tracking didn't remove the event?! Right now, if-statements will only detatch their DOM nodes, but keep state around for performance reasons. Destructors only run when an item gets destroyed. Right now, keyed list items, as well as and anything rendered under imSwitch, will be _destroyed_ by default to avoid memory leaks. I figured this was a decent compromise. For now, if you actually need the destructor to run when a component detatches, you'll have to write it to use imSwitch (sorry):`);
                } imParaEnd(c);

                imVisualTestInstallation(c, imInitializeJustOnceExampleWithWorkingDestructor);

                imParaBegin(c); {
                    imStr(c, `Do note that a lot of things we used to do with a constructor/destruct pair, like getting mouse coordinates, can actually just be done once at a global level, and the result can be reused by all the components (instead of each component individually registering global handlers). Something similar can be said for other kinds of input, async requests/tasks, and possibly other things. I've also included a global event system in im-dom that I frequently use to handle mouse/keyboard interactions in my various UIs. There is a good chance that it may be somewhat lacking for 'production-grade' tasks. Feel free to suggest additions/updates as needed. `);
                } imParaEnd(c);

                imSubheadingBegin(c); imStr(c, "Congrats!"); imSubheadingEnd(c);

                imParaBegin(c); {
                    imStr(c, `You now know the framework well enough to read and understand the rest of the code, and make basically anything! Take a look at im-ui for more ideas of how to structure your code, if needed. Time to start building!`);
                } imParaEnd(c);

                imSubheadingBegin(c); imStr(c, "Future scope"); imSubheadingEnd(c);

                imElBegin(c, EL_UL); {
                    imElBegin(c, EL_LI); {
                        imStr(c, `In the future, I plan on making a static analysis tool (probably just an eslint rule) that matches imXBegin and imXEnd and lets you know at compile time if these opening/closing pairs are matching or not. It turns out to be hard to solve this without making the code overly verbose, and this framework has a LOT of assertions in place specifically to catch bugs relating to this.`);
                    } imElEnd(c, EL_LI);
                    imElBegin(c, EL_LI); {
                        imStr(c, `It currently doesn't have SSR, and though there is no technical limitation that makes it impossible - I simply don't care to implement it at the moment. But I am not against including it later.`);
                    } imElEnd(c, EL_LI);
                    imElBegin(c, EL_LI); {
                        imStr(c, `Suspense boundaries not implemented yet. I do think they are possible to implement in userland, I just havent gotten around to it. Basically - I need to rerender the code through an 'event' pass that the adpaters know to skip, and then if it surfaced any new promies, I can do a second rerender that re-hides the suspense boundary. `);
                    } imElEnd(c, EL_LI);
                } imElEnd(c, EL_UL);

                imSubheadingBegin(c); imStr(c, "Out of scope"); imSubheadingEnd(c);

                imParaBegin(c); {
                    imStr(c, `There are some things that I have specifically planned never work on:`);
                } imParaEnd(c);

                imElBegin(c, EL_UL); {
                    imElBegin(c, EL_LI); {
                        imStr(c, `There will never be an imJS dev-tools. Most things can just be done using the existing browser devtools, and this is especially the case with this framework.`);
                    } imElEnd(c, EL_LI);
                    imElBegin(c, EL_LI); {
                        imStr(c, `HMR (Hot-module-reloading support) - the implementation details of the framework make adding it too complicated and not really super worth it. I did not build this framework with HMR in mind at all - I would rather have a small app that can be rebuild instantly than an app that takes ages to rebuild, but supports HMR, but the HMR still takes a few seconds, and every now and then it causes bugs, etc. etc. It is too difficult to evolve my apps alongside it. Just persist the current state of your program to localStorage/indexedDB as needed. The dev-server I use can also reload my program so quickly that there is no real benefit to having HMR (NOTE that it is a custom esbuild context with next to no dependencies - the framework is written in such a way that you can do a LOT yourself without having to reach for an npm package). If I do ever add it, it will be a very limited version that will wipe all UI state, but allow you to persist global state.`);
                    } imElEnd(c, EL_LI);
                    imElBegin(c, EL_LI); {
                        imStr(c, `I also plan to never introduce a mechanism by which you can manually render just a subset of the UI tree, or keep some subset of your website 'static', with dynamic islands. The complexity is not worth it - just animate the entire page.`);
                    } imElEnd(c, EL_LI);
                } imElEnd(c, EL_UL);

                // End of the line
                imLayoutBegin(c, BLOCK); imSize(c, 0, NA, 500, PX); imLayoutEnd(c);
            } imBaseContainerEnd(c);
        }
    ),
];

///////////////////////////
// Example code

function imSimpleComponent(c: ImCache) {
    imElBegin(c, EL_DIV); {
        imStr(c, "Today's date is ");
        imStr(c, new Date());
    } imElEnd(c, EL_DIV);
}

function imSimpleComponentCounter(c: ImCache) {
    const s = imGetInline(c, imGetInline) ?? imSet(c, { count: 0 });

    imElBegin(c, EL_DIV); {
        imStr(c, "The count is ");
        imStr(c, s.count);
    } imElEnd(c, EL_DIV);

    imElBegin(c, EL_DIV); {
        imElBegin(c, EL_BUTTON); {
            const ev = imOn(c, EV_MOUSEDOWN);
            if (ev) {
                s.count++;
            }
            imStr(c, "Increment the count");
        } imElEnd(c, EL_BUTTON);
    } imElEnd(c, EL_DIV);
}


function imDivBegin(c: ImCache) {
    imElBegin(c, EL_DIV);
}
function imDivEnd(c: ImCache) {
    imElEnd(c, EL_DIV);
}
function imExampleButtonIsClicked(c: ImCache, text: string): MouseEvent | null {
    let result: MouseEvent | null = null;
    imElBegin(c, EL_BUTTON); {
        result = imOn(c, EV_MOUSEDOWN);
        imStr(c, text);
    } imElEnd(c, EL_BUTTON);
    return result;
}

function imSimpleComponentCounterRefactored(c: ImCache) {
    const s = imGetInline(c, imGetInline) ?? imSet(c, { count: 0 });

    imDivBegin(c); {
        imStr(c, "The count is ");
        imStr(c, s.count);
    } imDivEnd(c);

    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);
}

const cnHighlight = newCssBuilder().cn("highlight", [` { outline: 10px solid #FF00FF }`]);

let lastDomNode: DomAppender | undefined;
let nextDomNode: DomAppender | undefined;

function imCacheIntrospector(c: ImCache, entries = getRootEntries(c), introspectorRoot: any = null) {
    const isRoot = !introspectorRoot;
    if (!introspectorRoot) introspectorRoot = getCurrentCacheEntries(c);
    if (entries === introspectorRoot) return; // Dont recurse into dev tools

    if (isRoot) {
        lastDomNode = nextDomNode;
        nextDomNode = undefined;
    }

    imElBegin(c, EL_DIV); {
        if (isFirstishRender(c)) elSetStyle(c, "paddingLeft", "20px");

        imFor(c); imForEachCacheEntryItem(entries, (t, childEntries) => {
            if (t !== imImmediateModeBlockBegin) return;

            const value = getEntriesParentFromEntries(childEntries as ImCacheEntries, newDomAppender);
            if (!value) return;

            imElBegin(c, EL_DIV); {
                const root = imElBegin(c, EL_DIV); {
                    imStr(c, value.root);
                } imElEnd(c, EL_DIV);

                if (
                    elHasMouseOver(c) 
                    // || elHasMouseOver(c, (value as DomAppender<HTMLElement>).root)
                ) {
                    nextDomNode = value;
                }

                imCacheIntrospector(c, childEntries as ImCacheEntries, introspectorRoot);

                elSetClass(c, cnHighlight, lastDomNode === value, root.root);
                elSetClass(c, cnHighlight, lastDomNode === value, (value as DomAppender<HTMLElement>).root);
            } imElEnd(c, EL_DIV);
        }); imForEnd(c);
    } imElEnd(c, EL_DIV);
}

function imConditionalRenderingExampleIfStatementBad(c: ImCache) {
    const s = imGetInline(c, imGetInline) ?? imSet(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);

    imDivBegin(c); {
        if (s.count < 3) {
            imStr(c, "It's time to pump up those numbers, rookie.");
        } else {
            imElBegin(c, EL_B); {
                imStr(c, "Gee, that's a high count! ");
            } imElEnd(c, EL_B);
        } 
    } imDivEnd(c);

    imDivBegin(c); {
        imStr(c, s.count);
    } imDivEnd(c);
}

function imConditionalRenderingExampleIfStatementNotBad(c: ImCache) {
    const s = imGetInline(c, imGetInline) ?? imSet(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);

    imDivBegin(c); {
        if (imIf(c) && s.count < 3) {
            imStr(c, "It's time to pump up those numbers, rookie.");
        } else {
            imElse(c);
            imElBegin(c, EL_B); {
                imStr(c, "Gee, that's a high count! ");
            } imElEnd(c, EL_B);
        } imIfEnd(c);
    } imDivEnd(c);

    imDivBegin(c); {
        imStr(c, s.count);
    } imDivEnd(c);
}


function imListRenderingExampleBad(c: ImCache) {
    const s = imGetInline(c, imGetInline) ?? imSet(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }

        for (let i = 0 ; i < s.count; i++) {
            imStr(c, i);
            if (i < s.count - 1) {
                imStr(c, ", ");
            }
        }

        imStr(c, "The count is ");
        imStr(c, s.count);
    } imDivEnd(c);
}

function imListRenderingExampleFixed(c: ImCache) {
    const s = imGetInline(c, imGetInline) ?? imSet(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
        imFor(c); for (let i = 0 ; i < s.count; i++) {
            imStr(c, i);
            if (i < s.count - 1) {
                imStr(c, ", ");
            }
        } imForEnd(c);
        imStr(c, "The count is ");
        imStr(c, s.count);
    } imDivEnd(c);
}

function imListRenderingExampleKeyed(c: ImCache) {
    const s = imGetInline(c, imGetInline) ?? imSet(c, { 
        items: [1, 2, 3, 4, 5].map(id => ({ id, isBold: id % 2 === 0 })),
    });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Shuffle items")) {
            s.items.sort(() => Math.random() - 0.5);
        }
        imFor(c); for (const item of s.items) {
            imKeyedBegin(c, item); {
                if (item.isBold) {
                    imDivBegin(c); {
                        imElBegin(c, EL_B); {
                            imStr(c, item.id);
                        } imElEnd(c, EL_B);
                    } imDivEnd(c);
                } else {
                    imDivBegin(c); {
                        imStr(c, item.id);
                    } imDivEnd(c);
                }
            } imKeyedEnd(c);
        } imForEnd(c);
    } imDivEnd(c);
}

function imListRenderingExampleNotKeyed(c: ImCache) {
    const s = imGetInline(c, imGetInline) ?? imSet(c, { 
        items: [1, 2, 3, 4, 5].map(id => ({ id, isBold: id % 2 === 0 })),
    });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Shuffle items")) {
            s.items.sort(() => Math.random() - 0.5);
        }
        imFor(c); for (const item of s.items) {
            if (imIf(c) && item.isBold) {
                imDivBegin(c); {
                    imElBegin(c, EL_B); {
                        imStr(c, item.id);
                    } imElEnd(c, EL_B);
                } imDivEnd(c);
            } else {
                imElse(c);
                imDivBegin(c); {
                    imStr(c, item.id);
                } imDivEnd(c);
            } imIfEnd(c);
        } imForEnd(c);
    } imDivEnd(c);
}

function imSwitchExampleWithKeyedDontDoItLikeThis(c: ImCache) {
    const s = imGetInline(c, imGetInline) ??
        imSet(c, { view: "a" });

    imKeyedBegin(c, s.view); switch (s.view) {
        case "a": {
            imDivBegin(c); {
                imStr(c, "View A");
            } imDivEnd(c);
        } break;
        case "b": {
            imDivBegin(c); {
                imElBegin(c, EL_B); {
                    imStr(c, "View B");
                } imElEnd(c, EL_B);
            } imDivEnd(c);
        } break;
    } imKeyedEnd(c);
}

function imSwitchExampleWithKeyedUsageCode(c: ImCache) {
    imSwitchExampleWithKeyedDontDoItLikeThis(c);
    imSwitchExampleWithKeyedDontDoItLikeThis(c);
}

function imSwitchExample(c: ImCache) {
    const s = imGetInline(c, imGetInline) ??
        imSet(c, { view: "a" });

    imSwitch(c, s.view); switch (s.view) {
        case "a": {
            imDivBegin(c); {
                imStr(c, "View A");
            } imDivEnd(c);
        } break;
        case "b": {
            imDivBegin(c); {
                imElBegin(c, EL_B); {
                    imStr(c, "View B");
                } imElEnd(c, EL_B);
            } imDivEnd(c);
        } break;
    } imSwitchEnd(c);
}

function imSwitchExampleWithUsageCode(c: ImCache) {
    imSwitchExample(c);
    imSwitchExample(c);
}

function imisFirstishRenderExample(c: ImCache) {
    imDivBegin(c); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "display", "flex");
            elSetStyle(c, "gap", "10px");
            elSetStyle(c, "gap", "10px");
            elSetStyle(c, "gap", "10px");
        }

        imFor(c); for (let i = 0; i < 5; i++) {
            imDivBegin(c); imStr(c, i); imDivEnd(c);
        } imForEnd(c);
    } imDivEnd(c);
}


function imInitializeJustOnceExample(c: ImCache) {
    const s = imGetInline(c, imInitializeJustOnceExample) ?? imSet(c, {
        initializationCount: 0,
        enabled: false,
        x: 0,
        y: 0,
    });

    if (imExampleButtonIsClicked(c, "Toggle mouse tracking")) {
        s.enabled = !s.enabled;
    }

    if (imIf(c) && s.enabled) {
        let mouse; mouse = imGetInline(c, imGetInline);
        if (!mouse) {
            s.initializationCount++;
            const ev = (e: MouseEvent) => {
                s.x = e.pageX;
                s.y = e.pageY;
            };
            document.addEventListener("mousemove", ev);
            onImmediateModeBlockDestroyed(c, () => {
                document.removeEventListener("mousemove", ev)
                s.initializationCount--;
            });
            mouse = imSet(c, true);
        }

    } imIfEnd(c);

    imDivBegin(c); {
        imStr(c, "Enabled: "); imStr(c, s.enabled);
        imStr(c, " Mouse.pageX: "); imStr(c, s.x);
        imStr(c, " Mouse.pageY: "); imStr(c, s.y);
        imStr(c, " Initialization count: "); imStr(c, s.initializationCount);
    } imDivEnd(c);
}

function imInitializeJustOnceExampleWithWorkingDestructor(c: ImCache) {
    const s = imGetInline(c, imInitializeJustOnceExample) ?? imSet(c, {
        initializationCount: 0,
        enabled: false,
        x: 0,
        y: 0,
    });

    if (imExampleButtonIsClicked(c, "Toggle mouse tracking")) {
        s.enabled = !s.enabled;
    }

    // imSwitch will actually be destroyed
    imSwitch(c, s.enabled, false); if (s.enabled) {
        let mouse; mouse = imGetInline(c, imGetInline);
        if (!mouse) {
            s.initializationCount++;
            const ev = (e: MouseEvent) => {
                s.x = e.pageX;
                s.y = e.pageY;
            };
            document.addEventListener("mousemove", ev);
            onImmediateModeBlockDestroyed(c, () => {
                document.removeEventListener("mousemove", ev)
                s.initializationCount--;
            });
            mouse = imSet(c, true);
        }
    } imSwitchEnd(c);

    imDivBegin(c); {
        imStr(c, "Enabled: "); imStr(c, s.enabled);
        imStr(c, " Mouse.pageX: "); imStr(c, s.x);
        imStr(c, " Mouse.pageY: "); imStr(c, s.y);
        imStr(c, " Initialization count: "); imStr(c, s.initializationCount);
    } imDivEnd(c);
}

function imErrorBoundaryExampleView(c: ImCache) {
    const s = imGetInline(c, imGetInline) ?? imSet(c, {
        orbitalNukes: 3,
    });

    imDivBegin(c); {
        imStr(c, "Orbital nukes remaining: ");
        imStr(c, s.orbitalNukes);
    } imDivEnd(c);

    const tryState = imTry(c); try {
        const { err, recover } = tryState;

        if (imIf(c) && err) {
            imDivBegin(c); {
                imStr(c, "An error occured: ");
                imStr(c, err);
            } imDivEnd(c);
            imDivBegin(c); {
                if (imExampleButtonIsClicked(c, "Dismiss error")) {
                    recover();
                }
            } imDivEnd(c);
        } else if (imIfElse(c)) { 
            if (imExampleButtonIsClicked(c, "Click here to launch orbital nuke!")) {
                if (s.orbitalNukes <= 0) throw new Error("All orbital nukes have already been used");
                s.orbitalNukes--;
            }
        } imIfEnd(c);
    } catch (err) {
        imTryCatch(c, tryState, err);
    } imTryEnd(c, tryState);
}

export function imExampleMain(c: ImCache) {
    imCacheBegin(c, imExampleMain); {
        imDomRootBegin(c, document.body); {
            const ev = imGlobalEventSystemBegin(c); {
                imLayoutBegin(c, COL); imFixed(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                    imVisualTestHarness(c, tests);
                } imLayoutEnd(c);
            } imGlobalEventSystemEnd(c, ev);
        } imDomRootEnd(c, document.body);
    } imCacheEnd(c);
}
