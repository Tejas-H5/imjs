import { im, ImCache, ImCacheEntries, imdom, el, DomAppender, ev } from "src/utils/im-js";
import { imVisualTestInstallation, TEST_CENTERED, TEST_SCROLLABLE, VisualTestHarnessState } from "src/utils/im-js/im-ui/visual-testing-harness";
import { BLOCK, cssVars, imui, NA, PX } from "src/utils/im-js/im-ui";
import { imBaseContainerBegin, imBaseContainerEnd, imParaBegin, imParaEnd, imSubheadingBegin, imSubheadingEnd } from "./common";
import { imLink, Url } from "src/utils/im-js/im-ui/link";

export function imJsCompleteOverview(c: ImCache, harness: VisualTestHarnessState) {
    imBaseContainerBegin(c); {
        imParaBegin(c); {
            imdom.Str(c, `imJS is an immediate-mode UI framework I created after encountering various issues while using React. It didn't start off as an immediate-mode framework, but I have since found immediate-mode to be a very useful and convenient way to structure my programs. I've done a detailed writeup that elaborates more on the pain-points and the thought process to get to this solution `); 
            imLink(c, "https://github.com/Tejas-H5/imjs/blob/main/Why.md" as Url, "here"); 
            imdom.Str(c, `. `);

            imdom.Str(c, `In this overview, I'll try to get you up to speed with this framework, what it does, and how you can use it. `);
            imdom.Str(c, `NOTE: If you're not on Keyboard+Mouse, then this page won't be very nice to use right now`);
        } imParaEnd(c);

        imSubheadingBegin(c); imdom.Str(c, "How to put it into it to your project"); imSubheadingEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `imJS is actually written entirely in TypeScript. I just didn't like the name imTS very much. In order to use it, you'll need to copy the im-js folder into somewhere in your project. im-core.ts, im-dom.ts and assert.ts are really the only files you actually need, the rest are optional. `);
            imdom.Str(c, `im-core contains immediate-mode primitives that you will need for control-flow and state management. `);
            imdom.Str(c, `im-dom is the DOM adapter for im-core, and gives you utilities for building and controlling the DOM via the framework, and global event hooks to respond to common user input. It is by no means a 100% comprehensive DOM wrapper, and you may need to add to it or extend it to include other APIs that you want. `);
            imdom.Str(c, `By looking at how im-dom works, you can in theory build an adapter for any other tree structure. `);
        } imParaEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `This repo also contains an im-ui folder with all the UI components I use in my projects. It is completely optional. Just copy the ones you want into your project as you need, and make any necessary changes.`);
        } imParaEnd(c);

        imSubheadingBegin(c); imdom.Str(c, "Creating components"); imSubheadingEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `Components are just functions. Control-flow is not so straightforward though, and I'll discuss this later. Here's a simple date-time component to demonstrate:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "Simple component", harness, imSimpleComponent, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `There is actually a LOT going on here, so let's unpack it:`);
            imdom.ElBegin(c, el.UL); {
                imdom.ElBegin(c, el.LI); {
                    imdom.Str(c, `imdom.ElBegin is a method that opens an immediate-mode scope, within which more DOM nodes may be rendered. This scope must eventually be closed off with another call to imdom.ElEnd. The convention here is that any function named imXBegin can be assumed to open some kind of scope that must be closed off with a call to a corresponding imXEnd method. User methods that aren't suffixed with 'Begin' can be assumed to not create a scope.`);
                } imdom.ElEnd(c, el.LI);
                imdom.ElBegin(c, el.LI); {
                    imdom.Str(c, `For imdom.ElBegin to be performant, it must create a DOM element on the first render, and then reuse it on subsequent renders. The 'c' is the immediate-mode cache where imdom.ElBegin saves it's div. This cache is passed to every immediate mode function, as that makes it more explicit that a function reads from the immediate-mode cache somehow. The 'im' prefix is only given to methods that actually write entries into the immediate mode state, which will be important later`);
                } imdom.ElEnd(c, el.LI);
                imdom.ElBegin(c, el.LI); {
                    imdom.Str(c, `Between imdom.Begin and imdom.End, there are two calls to imdom.Str. This method creates a single Text node under the current DOM element, and updates the text whenever the object reference changes by calling by calling toString() on this object.`);
                } imdom.ElEnd(c, el.LI);
                imdom.ElBegin(c, el.LI); {
                    imdom.Str(c, `Since the entire framework runs in an animation loop, state can be read directly from anywhere without making any framework-specific adapters. This expression will always be up-to-date.`);
                } imdom.ElEnd(c, el.LI);
            } imdom.ElEnd(c, el.UL);
        } imParaEnd(c);

        imParaBegin(c); {
            imdom.Str(c, "Let's make something a tiny bit more complicated - the counter example that the other frameworks all use in their docs:");
        } imParaEnd(c);

        imVisualTestInstallation(c, "Counter", harness, imSimpleComponentCounter, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `This example is not much more complicated than the other example, but a couple more things are happening:`);
            imdom.ElBegin(c, el.UL); {
                imdom.ElBegin(c, el.LI); {
                    imdom.Str(c, `im.Get, im.GetInline, im.Set are the state-management primitives that all methods use to save immediate-mode state entries. imGet(c, typeId) requests state of type 'typeId', and either returns what we set in the previous frame, or undefined. It will panic if the typeId passed in does not line up with the typeId at the 'current' slot - this flags conditional and out-of-order rendering bugs. A typeId is simply a function (any) => T that we use for type-inference, and also a way to assume what the type of some state is. im.GetInline is like im.Get, except we can specify any typeId at all, and it will not use type-inference to link the typeId to a return type, so it is good to use _inline_ instead of in some other component. As long as the typeIds in a row are all unique, it will (mostly) prevent out-of-order rendering bugs.`);
                } imdom.ElEnd(c, el.LI);
                imdom.ElBegin(c, el.LI); {
                    imdom.Str(c, `im.Set will write to the current immediate-mode slot. It MUST be called after the first call to im.Get. All other calls to im.Get will throw if im.Set was not called for the previous call to im.Get.`);
                } imdom.ElEnd(c, el.LI);
                imdom.ElBegin(c, el.LI); {
                    imdom.Str(c, `imdom.On is an immediate-mode helper that wraps the 'addeventListener' callback. Whenever that callback fires, your entire app will be synchronously rerendered, so thatyou can call ev.preventDefault() on it if you needed to, and it will work. When the particular subtree is 'destroyed', the event listener will automatically be removed.`);
                } imdom.ElEnd(c, el.LI);
            } imdom.ElEnd(c, el.UL);
        } imParaEnd(c);

        imParaBegin(c); {
            imdom.Str(c, "You'll notice that it's quite a bit verbose. Luckily, our framework is not written in some stupid DSL, and we can just refactor it as if it were any other code. Doing it now will also help clean up the next examples. ");
            imdom.Str(c, "See? I'm very smart:  TODO: include the refactored methods as well somehow");
        } imParaEnd(c);

        imVisualTestInstallation(c, "Counter - refactored", harness, imSimpleComponentCounterRefactored, TEST_CENTERED);

        imSubheadingBegin(c); imdom.Str(c, "However, there is a problem - control flow"); imSubheadingEnd(c);

        // The framework interleaves immediate-mode entries as a series of [type][value] entries to mitigate a large number of out-of-order reading bugs that can silently corrupt state.
        imParaBegin(c); {
            imdom.Str(c, `The way immediate-mode methods save their state between renders is by writing it into the immediate-mode cache in a sequential manner. `);
            imdom.ElBegin(c, el.B); {
                imdom.Str(c, `However, this only works if the next render reads from the cache in the exact same order that the previous render wrote to it! `);
            } imdom.ElEnd(c, el.B);
            imdom.Str(c, `This sounds very restrictive. How will we ever be able to do for-loops? if-statement?  `);
            imdom.Str(c, `For example, this next component will stop working after incrementing the count changes the current conditional pathway the code is in: `);
        } imParaEnd(c);

        imVisualTestInstallation(c, "Conditional rendering - broken", harness, imConditionalRenderingExampleIfStatementBad, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `"Error: Expected to populate this cache entry with type=imdom.Str, but got newDomAppender . Either your begin/end pairs probably aren't lining up right, or you're conditionally rendering immediate-mode state". `);
            imdom.Str(c, `This is because in one render, the code on line 13 requests the state for imdom.Str. But in the next render, the code accessing that immediate-mode slot would be line 15, which requests the state for a DOM element instead. `);
            imdom.Str(c, `This framework's solution is for you to annotate if-blocks with calls to im.If, im.IfElse, im.Else and im.IfEnd:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "Conditional rendering", harness, imConditionalRenderingExampleIfStatementNotBad, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `Now, in one render, the  method calls look like 'im.If', 'im.IfEnd', and in a subsequent render, the method calls look like 'im.If', 'im.Else', 'im.IfEnd'. If im.IfElse was called, the framework can infer that the first if-branch wasn't taken, and can prepare a separate entries list for the next branch. `);
        } imParaEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `You'll need to do something similar for for-loops. In this example, the immediate-mode code in the for-loop will start eating into the state of things we rendered outside the for-loop:`);
        } imParaEnd(c);
        imVisualTestInstallation(c, "List rendering - broken", harness, imListRenderingExampleBad, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `"Error: You should be rendering the same number of things in every render cycle". If the framework doesn't emit this error, we have no way of knowing about this state-collision bug because the types of the two state are actually the same. `);
            imdom.Str(c, `The framework deals with for-loops with the im.For and im.ForEnd methods: `);
        } imParaEnd(c);

        imVisualTestInstallation(c, "List rendering", harness, imListRenderingExampleFixed, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `The list rendering doesn't need to be done with a for-loop - any kind of iteration is fine. You could have just as easily written it with .forEach or for-of, a while loop, a custom iteration function, etc. etc.`);
        } imParaEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `In order to render a list of complicated items, it can be more performant to reuse the same 'entries block' for the same item. To do this, you can key your list items with im.KeyedBegin/End. You may also want to render a different 'type' of component per item:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "List rendering - keyed", harness, imListRenderingExampleKeyed, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `It's a bit of a contrived example, since I could have just as easily wrote it without keying:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "List rendering - keyed example but not keyed", harness, imListRenderingExampleNotKeyed, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `However, it does start making a difference when the component for each item is it's own highly complex component, so it's worth knowing about. For now, you'll have to take my word for it, because I'm not about to write a thousand line component to prove it in this overview. `);
        } imParaEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `There are other times where you'll want to to dispatch to a particular component based on 'the current view', however that may be represented. You may think to reach for im.Keyed:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "im.Keyed wrong tool for the job", harness, imSwitchExampleWithKeyedDontDoItLikeThis, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `However, there is a problem. Usage code that might reuse your component in the same scope will no longer work: `);
        } imParaEnd(c);

        imVisualTestInstallation(c, "im.Keyed wrong tool for the job - usage code", harness, imSwitchExampleWithKeyedUsageCode, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `The same key cannot be rendered to twice. I am thinking about other ways to handle duplicate keys more gracefully, but this bug in particular actually a you problem, and will be present in all those alternate iterations of the framework as well. im.Keyed shares it's keys amongst all other entries under the current scope, and it is a bug to render to the same key twice. This is where im.Switch comes in:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "use im.Switch instead", harness, imSwitchExample, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `It's the same as im.Keyed, but within it's own separate immediate-mode scope. The usage code from earlier should work now:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "im.Switch usage code", harness, imSwitchExampleWithUsageCode, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `NOTE: don't use im.Switch with fallthrough. The framework has no way to to distinguish between fallthrough and two genuinely different cases. You'll be expecting two cases to map to the same component, but they will map to two identical but separate instances of the same component.`);
        } imParaEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `The final piece of control flow you'll need, is some way to handle exceptions that get thrown while your component is rendering. They can come from this framework, or from any code at all really. Without an error boundary, the current behaviour is for the animation loop to abort itself. A user may not even realise that the app has crashed till they try clicking a button. And I suppose, the button would still work since it invokes renders! But none of the animations will work. <TODO: we gotta handle this better>. For now, it's recommended that you have at least one error boundary at the root of your program. `);
            imdom.Str(c, `Error boundaries can be implemented by annotating try/catch in a similar way to how we do if-statements, for-loops, and switch statements:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "Error boundary", harness, imErrorBoundaryExampleView, TEST_CENTERED);

        imSubheadingBegin(c); imdom.Str(c, "State management - initialisation, destruction"); imSubheadingEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `There are primarily two ways to initialize state. The first, and most common way, is to call isFirstishRender(c) to check if this is effectively the first time the component is being rendered:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "isFirstishRender", harness, imisFirstishRenderExample);

        imParaBegin(c); {
            imdom.Str(c, `If your component encounters an error, and you decide to recover from that error, the component will rerender, with im.isFirstishRender still returning true, despite having already returned true once before, hence the name 'firstish' and not 'first'. Because so many components need some way of initializing some idempotent state on the first render, this eliminates the need for a LOT of immediate-mode state entries to be created.`);
        } imParaEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `However, there are other times when you want to initialize state only once, and then clean up after that state once the component is destroyed. For example, adding an event handler to a component twice can result in catastrophic bugs. Use imGet and im.Set for these situations instead of 'isFirstishRender'. `);
        } imParaEnd(c);

        imVisualTestInstallation(c, "onImmediateModeBlockDestroyed - but it doesnt get called", harness, imInitializeJustOnceExample);

        imParaBegin(c); {
            imdom.Str(c, `Hey what gives! Disabling mouse tracking didn't remove the event?! Right now, if-statements will only detatch their DOM nodes, but keep state around for performance reasons. Destructors only run when an item gets destroyed. Right now, keyed list items, as well as and anything rendered under im.Switch, will be _destroyed_ by default to avoid memory leaks. I figured this was a decent compromise. This does mean that destructors should solely be used to free up resources/clean up memory leaks, and not to reliably run application logic when a component is detatched/destroyed. For now, if you really need to rely on the destructor to run when a component detatches, you'll have to write it to use imSwitch (sorry):`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "onImmediateModeBlockDestroyed - hack workaround", harness, imInitializeJustOnceExampleWithWorkingDestructor);

        imParaBegin(c); {
            imdom.Str(c, `Do note that a lot of things we used to do with a constructor/destruct pair, like getting mouse coordinates, can actually just be done once at a global level, and the result can be reused by all the components (instead of each component individually registering global handlers). Something similar can be said for other kinds of input, async requests/tasks, and possibly other things. I've also included a global event system in im-dom that I frequently use to handle mouse/keyboard interactions in my various UIs. There is a good chance that it may be somewhat lacking for 'production-grade' tasks. For example, the touch handling is currently non-existent. Feel free to suggest additions/updates as needed. `);
        } imParaEnd(c);

        imSubheadingBegin(c); imdom.Str(c, "Reacting to changes"); imSubheadingEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `This overview would be incomplete without mentioning im.Memo. This method is used everywhere to execute code but only if some value was different than it was in the previous frame. If you can replace imMemo with an event, you probably should. However, it is extremely convenient to use, so maybe you shouldn't. It is entirely up to you. `);
            imdom.Str(c, `A common pattern in the ThreeJS codebase for example, is to increment a version number to indicate that a piece of state has changed, so that other systems can respond to this. im.Memo works well with this pattern.`);
        } imParaEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `It can be used in a lot of ways, here are some examples of the most common ways it is used:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "im.Memo 90% of usecases", harness, imMemoExamples, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `Some things to notice:`);
        } imParaEnd(c);

        imdom.ElBegin(c, el.UL); {
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `im.Set can be called again later, to overwrite/reset the state. By default, the state is persisted unless destroyed, but here we've decided to reset it out whenever we re-attatch the component as well. Be careful that you aren't adding any destructuors in that initialisation block though - the previous destructor may not have ran`);
            } imdom.ElEnd(c, el.LI);
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `The Regular logical-or || operator will short-circuit, but the bitwise-or | operator will not. Coincidentally, im.Memo returns a number, and not a boolean. If you want to query the same number of slots as you read the previous frame, you need to chain imMemo using | instead of ||.`);
            } imdom.ElEnd(c, el.LI);
        } imdom.ElEnd(c, el.UL);

        imParaBegin(c); {
            imdom.Str(c, `Something to note - it also returns non-zero if the particular scope it was called in has re-entered the 'conditional rendering pathway'. The reason for this is not obvious at all, so I'll elaborate a bit. Let's say we make a component that should do something when it recieves custom UI focus:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "im.Memo - conditional pathway example", harness, imMemoConditionalPathwayExample, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `The view code uses im.Memo to run some code, and then log something when it's become focused. However, if we decide we want a sightly different UI - maybe we only want one view appearing at a time - the naive implementation if im.Memo which only returns true when it's input changes will no-longer work:`);
        } imParaEnd(c);

        imVisualTestInstallation(c, "im.Memo - conditional pathway example - updated", harness, imMemoConditionalPathwayExampleUpdatedReqs, TEST_CENTERED);

        imParaBegin(c); {
            imdom.Str(c, `As far as each view was concerned, the focus state has never changed. `);
            imdom.Str(c, `I think it is very important that this continues to work regardless. And in this framework, it will by default (and can be opted out of, as I've done in the previous examples): `);
        } imParaEnd(c);

        imVisualTestInstallation(c, "im.Memo - conditional pathway example - updated (working)", harness, imMemoConditionalPathwayExampleUpdatedReqsWorking, TEST_CENTERED);

        imSubheadingBegin(c); imdom.Str(c, "Well done!"); imSubheadingEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `I'm surprised you made it this far, congrats! You now know the framework well enough to read and understand the rest of the code, and make basically anything! Take a look at im-ui for more ideas of how to structure your code, if needed. Time to start building!`);
        } imParaEnd(c);

        imSubheadingBegin(c); imdom.Str(c, "Future scope"); imSubheadingEnd(c);

        imdom.ElBegin(c, el.UL); {
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `The global event system currently doesn't work well for mobile/touch interactions, need to fix that`);
            } imdom.ElEnd(c, el.LI);
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `The global event system currently doesn't work well for mobile/touch interactions, need to fix that`);
            } imdom.ElEnd(c, el.LI);
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `In the future, I plan on making a static analysis tool (probably just an eslint rule) that matches imXBegin and imXEnd and lets you know at compile time if these opening/closing pairs are matching or not. It turns out to be hard to solve this without making the code overly verbose, and this framework has a LOT of assertions in place specifically to catch bugs relating to this.`);
            } imdom.ElEnd(c, el.LI);
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `It currently doesn't have SSR, and though there is no technical limitation that makes it impossible - I simply don't care to implement it at the moment. But I am not against including it later.`);
            } imdom.ElEnd(c, el.LI);
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `Suspense boundaries not implemented yet. I do think they are possible to implement in userland, I just havent gotten around to it. Basically - I need to rerender the code through an 'event' pass that the adpaters know to skip, and then if it surfaced any new promies, I can do a second rerender that re-hides the suspense boundary. `);
            } imdom.ElEnd(c, el.LI);
        } imdom.ElEnd(c, el.UL);

        imSubheadingBegin(c); imdom.Str(c, "Out of scope"); imSubheadingEnd(c);

        imParaBegin(c); {
            imdom.Str(c, `There are some things that I have specifically planned never work on:`);
        } imParaEnd(c);

        imdom.ElBegin(c, el.UL); {
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `There will never be an imJS dev-tools. Most things can just be done using the existing browser devtools, and this is especially the case with this framework.`);
            } imdom.ElEnd(c, el.LI);
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `HMR (Hot-module-reloading support) - the implementation details of the framework make adding it too complicated and not really super worth it. I did not build this framework with HMR in mind at all - I would rather have a small app that can be rebuild instantly than an app that takes ages to rebuild, but supports HMR, but the HMR still takes a few seconds, and every now and then it causes bugs, etc. etc. It is too difficult to evolve my apps alongside it. Just persist the current state of your program to localStorage/indexedDB as needed. The dev-server I use can also reload my program so quickly that there is no real benefit to having HMR. I've had set up a custom esbuild context, but with a custom server that has an extra long KeepAlive setting on the connection (surprisingly effective).`);
            } imdom.ElEnd(c, el.LI);
            imdom.ElBegin(c, el.LI); {
                imdom.Str(c, `I also plan to never introduce a mechanism by which you can manually render just a subset of the UI tree, or keep some subset of your website 'static', with dynamic islands. The complexity is not worth it - just animate the entire page.`);
            } imdom.ElEnd(c, el.LI);
        } imdom.ElEnd(c, el.UL);

        // End of the line
        imui.Begin(c, BLOCK); imui.Size(c, 0, NA, 600, PX); imui.End(c);

        imVisualTestInstallation(c, "Dev tools? Aint no way?!", harness, imJsDevToolsFinalRelease, TEST_SCROLLABLE);
    } imBaseContainerEnd(c);
}

function imSimpleComponent(c: ImCache) {
    imdom.ElBegin(c, el.DIV); {
        imdom.Str(c, "Today's date is ");
        imdom.Str(c, new Date());
    } imdom.ElEnd(c, el.DIV);
}

function imSimpleComponentCounter(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });

    imdom.ElBegin(c, el.DIV); {
        imdom.Str(c, "The count is ");
        imdom.Str(c, s.count);
    } imdom.ElEnd(c, el.DIV);

    imdom.ElBegin(c, el.DIV); {
        imdom.ElBegin(c, el.BUTTON); {
            const mouseDown = imdom.On(c, ev.MOUSEDOWN);
            if (mouseDown) {
                s.count++;
            }
            imdom.Str(c, "Increment the count");
        } imdom.ElEnd(c, el.BUTTON);
    } imdom.ElEnd(c, el.DIV);
}


function imDivBegin(c: ImCache) {
    return imdom.ElBegin(c, el.DIV);
}
function imDivEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
function imExampleButtonIsClicked(c: ImCache, text: string): MouseEvent | null {
    let result: MouseEvent | null = null;
    imdom.ElBegin(c, el.BUTTON); {
        result = imdom.On(c, ev.MOUSEDOWN);
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);
    return result;
}

function imSimpleComponentCounterRefactored(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });

    imDivBegin(c); {
        imdom.Str(c, "The count is ");
        imdom.Str(c, s.count);
    } imDivEnd(c);

    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);
}

function imConditionalRenderingExampleIfStatementBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);

    imDivBegin(c); {
        if (s.count < 3) {
            imdom.Str(c, "It's time to pump up those numbers, rookie.");
        } else {
            imdom.ElBegin(c, el.B); {
                imdom.Str(c, "Gee, that's a high count! ");
            } imdom.ElEnd(c, el.B);
        } 
    } imDivEnd(c);

    imDivBegin(c); {
        imdom.Str(c, s.count);
    } imDivEnd(c);
}

function imConditionalRenderingExampleIfStatementNotBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
    } imDivEnd(c);

    imDivBegin(c); {
        if (im.If(c) && s.count < 3) {
            imdom.Str(c, "It's time to pump up those numbers, rookie.");
        } else {
            im.Else(c);
            imdom.ElBegin(c, el.B); {
                imdom.Str(c, "Gee, that's a high count! ");
            } imdom.ElEnd(c, el.B);
        } im.IfEnd(c);
    } imDivEnd(c);

    imDivBegin(c); {
        imdom.Str(c, s.count);
    } imDivEnd(c);
}


function imListRenderingExampleBad(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }

        for (let i = 0 ; i < s.count; i++) {
            imdom.Str(c, i);
            if (i < s.count - 1) {
                imdom.Str(c, ", ");
            }
        }

        imdom.Str(c, "The count is ");
        imdom.Str(c, s.count);
    } imDivEnd(c);
}

function imListRenderingExampleFixed(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { count: 0 });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Increment the count")) {
            s.count++;
        }
        im.For(c); for (let i = 0 ; i < s.count; i++) {
            imdom.Str(c, i);
            if (i < s.count - 1) {
                imdom.Str(c, ", ");
            }
        } im.ForEnd(c);
        imdom.Str(c, "The count is ");
        imdom.Str(c, s.count);
    } imDivEnd(c);
}

function imListRenderingExampleKeyed(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { 
        items: [1, 2, 3, 4, 5].map(id => ({ id, isBold: id % 2 === 0 })),
    });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Shuffle items")) {
            s.items.sort(() => Math.random() - 0.5);
        }
        im.For(c); for (const item of s.items) {
            im.KeyedBegin(c, item); {
                if (item.isBold) {
                    imDivBegin(c); {
                        imdom.ElBegin(c, el.B); {
                            imdom.Str(c, item.id);
                        } imdom.ElEnd(c, el.B);
                    } imDivEnd(c);
                } else {
                    imDivBegin(c); {
                        imdom.Str(c, item.id);
                    } imDivEnd(c);
                }
            } im.KeyedEnd(c);
        } im.ForEnd(c);
    } imDivEnd(c);
}

function imListRenderingExampleNotKeyed(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, { 
        items: [1, 2, 3, 4, 5].map(id => ({ id, isBold: id % 2 === 0 })),
    });
    imDivBegin(c); {
        if (imExampleButtonIsClicked(c, "Shuffle items")) {
            s.items.sort(() => Math.random() - 0.5);
        }
        im.For(c); for (const item of s.items) {
            if (im.If(c) && item.isBold) {
                imDivBegin(c); {
                    imdom.ElBegin(c, el.B); {
                        imdom.Str(c, item.id);
                    } imdom.ElEnd(c, el.B);
                } imDivEnd(c);
            } else {
                im.Else(c);
                imDivBegin(c); {
                    imdom.Str(c, item.id);
                } imDivEnd(c);
            } im.IfEnd(c);
        } im.ForEnd(c);
    } imDivEnd(c);
}

function imSwitchExampleWithKeyedDontDoItLikeThis(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ??
        im.Set(c, { view: "a" });

    im.KeyedBegin(c, s.view); switch (s.view) {
        case "a": {
            imDivBegin(c); {
                imdom.Str(c, "View A");
            } imDivEnd(c);
        } break;
        case "b": {
            imDivBegin(c); {
                imdom.ElBegin(c, el.B); {
                    imdom.Str(c, "View B");
                } imdom.ElEnd(c, el.B);
            } imDivEnd(c);
        } break;
    } im.KeyedEnd(c);
}

function imSwitchExampleWithKeyedUsageCode(c: ImCache) {
    imSwitchExampleWithKeyedDontDoItLikeThis(c);
    imSwitchExampleWithKeyedDontDoItLikeThis(c);
}

function imSwitchExample(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ??
        im.Set(c, { view: "a" });

    im.Switch(c, s.view); switch (s.view) {
        case "a": {
            imDivBegin(c); {
                imdom.Str(c, "View A");
            } imDivEnd(c);
        } break;
        case "b": {
            imDivBegin(c); {
                imdom.ElBegin(c, el.B); {
                    imdom.Str(c, "View B");
                } imdom.ElEnd(c, el.B);
            } imDivEnd(c);
        } break;
    } im.SwitchEnd(c);
}

function imSwitchExampleWithUsageCode(c: ImCache) {
    imSwitchExample(c);
    imSwitchExample(c);
}

function imisFirstishRenderExample(c: ImCache) {
    imDivBegin(c); {
        if (im.isFirstishRender(c)) {
            imdom.setStyle(c, "display", "flex");
            imdom.setStyle(c, "gap", "10px");
        }

        im.For(c); for (let i = 0; i < 5; i++) {
            imDivBegin(c); imdom.Str(c, i); imDivEnd(c);
        } im.ForEnd(c);
    } imDivEnd(c);
}


function imInitializeJustOnceExample(c: ImCache) {
    const s = im.GetInline(c, imInitializeJustOnceExample) ?? im.Set(c, {
        initializationCount: 0,
        enabled: false,
        x: 0,
        y: 0,
    });

    if (imExampleButtonIsClicked(c, "Toggle mouse tracking")) {
        s.enabled = !s.enabled;
    }

    if (im.If(c) && s.enabled) {
        let mouse; mouse = im.GetInline(c, im.GetInline);
        if (!mouse) {
            s.initializationCount++;
            const ev = (e: MouseEvent) => {
                s.x = e.pageX;
                s.y = e.pageY;
            };
            document.addEventListener("mousemove", ev);
            im.onImmediateModeBlockDestroyed(c, () => {
                document.removeEventListener("mousemove", ev)
                s.initializationCount--;
            });
            mouse = im.Set(c, true);
        }

    } im.IfEnd(c);

    imDivBegin(c); {
        imdom.Str(c, "Enabled: "); imdom.Str(c, s.enabled);
        imdom.Str(c, " Mouse.pageX: "); imdom.Str(c, s.x);
        imdom.Str(c, " Mouse.pageY: "); imdom.Str(c, s.y);
        imdom.Str(c, " Initialization count: "); imdom.Str(c, s.initializationCount);
    } imDivEnd(c);
}

function imInitializeJustOnceExampleWithWorkingDestructor(c: ImCache) {
    const s = im.GetInline(c, imInitializeJustOnceExample) ?? im.Set(c, {
        initializationCount: 0,
        enabled: false,
        x: 0,
        y: 0,
    });

    if (imExampleButtonIsClicked(c, "Toggle mouse tracking")) {
        s.enabled = !s.enabled;
    }

    // im.Switch will actually be destroyed
    im.Switch(c, s.enabled, false); if (s.enabled) {
        let mouse; mouse = im.GetInline(c, im.GetInline);
        if (!mouse) {
            s.initializationCount++;
            const ev = (e: MouseEvent) => {
                s.x = e.pageX;
                s.y = e.pageY;
            };
            document.addEventListener("mousemove", ev);
            im.onImmediateModeBlockDestroyed(c, () => {
                document.removeEventListener("mousemove", ev)
                s.initializationCount--;
            });
            mouse = im.Set(c, true);
        }
    } im.SwitchEnd(c);

    imDivBegin(c); {
        imdom.Str(c, "Enabled: "); imdom.Str(c, s.enabled);
        imdom.Str(c, " Mouse.pageX: "); imdom.Str(c, s.x);
        imdom.Str(c, " Mouse.pageY: "); imdom.Str(c, s.y);
        imdom.Str(c, " Initialization count: "); imdom.Str(c, s.initializationCount);
    } imDivEnd(c);
}

function imErrorBoundaryExampleView(c: ImCache) {
    const s = im.GetInline(c, im.GetInline) ?? im.Set(c, {
        orbitalNukes: 3,
    });

    imDivBegin(c); {
        imdom.Str(c, "Orbital nukes remaining: ");
        imdom.Str(c, s.orbitalNukes);
    } imDivEnd(c);

    const tryState = im.Try(c); try {
        const { err, recover } = tryState;

        if (im.If(c) && err) {
            imDivBegin(c); {
                imdom.Str(c, "An error occured: ");
                imdom.Str(c, err);
            } imDivEnd(c);
            imDivBegin(c); {
                if (imExampleButtonIsClicked(c, "Dismiss error")) {
                    recover();
                }
            } imDivEnd(c);
        } else if (im.Else(c)) { 
            if (imExampleButtonIsClicked(c, "Click here to launch orbital nuke!")) {
                if (s.orbitalNukes <= 0) throw new Error("All orbital nukes have already been used");
                s.orbitalNukes--;
            }
        } im.IfEnd(c);
    } catch (err) {
        im.Catch(c, tryState, err);
    } im.TryEnd(c, tryState);
}

function imMemoExamples(c: ImCache) {
    const becameVisible = im.Memo(c, true);

    let s; s = im.GetInline(c, im.GetInline);
    if (!s || becameVisible) {
        s = im.Set(c, {
            secondsElapsed: 0,
            color: imui.newColor(0, 0, 0, 1),
            count: 0,
        });
    }

    const thisSecond = Math.floor(new Date().getTime() / 1000);
    if (im.Memo(c, thisSecond)) {
        s.secondsElapsed += 1;
    }

    if (im.Memo(c, thisSecond) | im.Memo(c, s.count)) {
        s.color = imui.newColorFromHsv(Math.random(), 0.5, 0.5);
    }

    imDivBegin(c); {
        if (im.Memo(c, s.color)) imdom.setStyle(c, "color", s.color.toString());

        imDivBegin(c); {
            imdom.Str(c, "Seconds elapsed: ");
            imdom.Str(c, s.secondsElapsed);
        } imDivEnd(c);

        imDivBegin(c); {
            imdom.Str(c, "Count: ");
            imdom.Str(c, s.count);
        } imDivEnd(c);

        imDivBegin(c); {
            if (imExampleButtonIsClicked(c, "Increment count")) {
                s.count++;
            }
        } imDivEnd(c);
    } imDivEnd(c);
}

type MemoConditionalPathwayExampleAppState = {
    currentView: number;
    logs: string[];
};

function imMemoConditionalPathwayExample(c: ImCache) {
    const appState = im.GetInline(c, im.GetInline) ??
        im.Set<MemoConditionalPathwayExampleAppState>(c, { currentView: 0, logs: [] });

    imDivBegin(c); {
        if (im.isFirstishRender(c)) imdom.setStyle(c, "flex", "1");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "width", "100%");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "gap", "10px");

        imMemoConditionalPathwayExampleView(c, appState, 0);
        imMemoConditionalPathwayExampleView(c, appState, 1);
        imMemoConditionalPathwayExampleView(c, appState, 2);
    } imDivEnd(c);
    im.For(c); for (const log of appState.logs) {
        imDivBegin(c); {
            imdom.Str(c, log);
        } imDivEnd(c);
    } im.ForEnd(c);
}

function imMemoConditionalPathwayExampleView(
    c: ImCache,
    appState: MemoConditionalPathwayExampleAppState,
    viewId: number,
) {
    const hasFocus = appState.currentView === viewId;

    if ((im.Memo(c, hasFocus) === im.MEMO_CHANGED) && hasFocus) {
        appState.logs.push("Now focused: " + viewId);
        if (appState.logs.length > 3) appState.logs.shift();
    }

    imDivBegin(c); {
        if (im.isFirstishRender(c)) {
            imdom.setStyle(c, "flex", "1");
            // o7 sir. Div has been centered. sir o7
            imdom.setStyle(c, "display", "flex");
            imdom.setStyle(c, "alignItems", "center");
            imdom.setStyle(c, "justifyContent", "center");
        }

        if ((im.Memo(c, hasFocus)) === im.MEMO_CHANGED) imdom.setStyle(c, "border", hasFocus ? "1px solid black" : "");

        if (imdom.hasMouseOver(c)) {
            appState.currentView = viewId;
        }

        imdom.Str(c, "View ");
        imdom.Str(c, viewId);
    } imDivEnd(c);
}

function imMemoConditionalPathwayExampleUpdatedReqs(c: ImCache) {
    const appState = im.GetInline(c, im.GetInline) ??
        im.Set<MemoConditionalPathwayExampleAppState>(c, { currentView: 0, logs: [] });

    imDivBegin(c); {
        if (im.isFirstishRender(c)) imdom.setStyle(c, "flex", "1");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "width", "100%");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "gap", "10px");

        im.Switch(c, appState.currentView); switch(appState.currentView) {
            case 0: imMemoConditionalPathwayExampleView(c, appState, 0); break;
            case 1: imMemoConditionalPathwayExampleView(c, appState, 1); break;
            case 2: imMemoConditionalPathwayExampleView(c, appState, 2); break;
        } im.SwitchEnd(c);

    } imDivEnd(c);
    imDivBegin(c); {
        if (im.isFirstishRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "gap", "10px");
        if (imExampleButtonIsClicked(c, "View 0")) appState.currentView = 0;
        if (imExampleButtonIsClicked(c, "View 1")) appState.currentView = 1;
        if (imExampleButtonIsClicked(c, "View 2")) appState.currentView = 2;
    } imDivEnd(c);
    im.For(c); for (const log of appState.logs) {
        imDivBegin(c); {
            imdom.Str(c, log);
        } imDivEnd(c);
    } im.ForEnd(c);
}

function imMemoConditionalPathwayExampleUpdatedReqsWorking(c: ImCache) {
    const appState = im.GetInline(c, im.GetInline) ??
        im.Set<MemoConditionalPathwayExampleAppState>(c, { currentView: 0, logs: [] });

    imDivBegin(c); {
        if (im.isFirstishRender(c)) imdom.setStyle(c, "flex", "1");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "width", "100%");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "gap", "10px");

        im.Switch(c, appState.currentView); switch(appState.currentView) {
            case 0: imMemoConditionalPathwayExampleViewWorking(c, appState, 0); break;
            case 1: imMemoConditionalPathwayExampleViewWorking(c, appState, 1); break;
            case 2: imMemoConditionalPathwayExampleViewWorking(c, appState, 2); break;
        } im.SwitchEnd(c);

    } imDivEnd(c);
    imDivBegin(c); {
        if (im.isFirstishRender(c)) imdom.setStyle(c, "display", "flex");
        if (im.isFirstishRender(c)) imdom.setStyle(c, "gap", "10px");
        if (imExampleButtonIsClicked(c, "View 0")) appState.currentView = 0;
        if (imExampleButtonIsClicked(c, "View 1")) appState.currentView = 1;
        if (imExampleButtonIsClicked(c, "View 2")) appState.currentView = 2;
    } imDivEnd(c);
    im.For(c); for (const log of appState.logs) {
        imDivBegin(c); {
            imdom.Str(c, log);
        } imDivEnd(c);
    } im.ForEnd(c);
}

function imMemoConditionalPathwayExampleViewWorking(
    c: ImCache,
    appState: MemoConditionalPathwayExampleAppState,
    viewId: number,
) {
    const hasFocus = appState.currentView === viewId;

    if (im.Memo(c, hasFocus) && hasFocus) {
        appState.logs.push("Now focused: " + viewId);
        if (appState.logs.length > 3) appState.logs.shift();
    }

    imDivBegin(c); {
        if (im.isFirstishRender(c)) {
            imdom.setStyle(c, "flex", "1");
            // o7 sir. Div has been centered. sir o7
            imdom.setStyle(c, "display", "flex");
            imdom.setStyle(c, "alignItems", "center");
            imdom.setStyle(c, "justifyContent", "center");
        }

        if (im.Memo(c, hasFocus)) imdom.setStyle(c, "border", hasFocus ? "1px solid black" : "");

        if (imdom.hasMouseOver(c)) {
            appState.currentView = viewId;
        }

        imdom.Str(c, "View ");
        imdom.Str(c, viewId);
    } imDivEnd(c);
}

// TODO: Put somewhere
const cnHighlight = imui.newCssBuilder().cn("highlight", [` { outline: 10px solid #FF00FF }`]);
let lastDomNode: DomAppender<HTMLElement> | undefined;
let nextDomNode: DomAppender<HTMLElement> | undefined;

function imJsDevToolsFinalRelease(c: ImCache, entries = im.getRootEntries(c), introspectorRoot: any = null) {
    const isRoot = !introspectorRoot;
    if (!introspectorRoot) introspectorRoot = im.getCurrentCacheEntries(c);
    if (entries === introspectorRoot) return; // Dont recurse into dev tools

    let visible = true;

    if (isRoot) {
        if (lastDomNode !== nextDomNode) {
            if (lastDomNode) imdom.setClass(c, cnHighlight, false, lastDomNode.root);
            if (nextDomNode) imdom.setClass(c, cnHighlight, true, nextDomNode.root);

            lastDomNode = nextDomNode;
        }

        const visibility = imdom.TrackVisibility(c, 0);
        visible = visibility.isVisible;
        nextDomNode = undefined;
    }

    if (im.If(c) && !visible) {
        imdom.Str(c, "Nah");
    } else {
        im.Else(c);

        if (isRoot) {
            imDivBegin(c); {
                if (im.isFirstishRender(c)) imdom.setStyle(c, "position", "fixed");
                if (im.isFirstishRender(c)) imdom.setStyle(c, "bottom", "10px");
                if (im.isFirstishRender(c)) imdom.setStyle(c, "left", "10px");
                if (im.isFirstishRender(c)) imdom.setStyle(c, "backgroundColor", cssVars.bg);

                imdom.Str(c, "Devtool enabled. 😭😭🥀");

                imdom.Str(c, lastDomNode?.root ?? "[Object object]");
            } imDivEnd(c);
        }

        imDivBegin(c); {
            if (im.isFirstishRender(c)) imdom.setStyle(c, "flex", "1");
            if (im.isFirstishRender(c)) imdom.setStyle(c, "paddingLeft", "20px");

            im.For(c); im.ForEachCacheEntryItem(entries, (t, childEntries) => {
                if (t !== im.ImmediateModeBlockBegin) return;
                const value = im.getEntriesParentFromEntries(childEntries as ImCacheEntries, imdom.newDomAppender);
                if (!value) return;

                imdom.ElBegin(c, el.DIV); {
                    const root = imDivBegin(c); {
                        imdom.Str(c, value.root);
                    } imDivEnd(c);

                    const hasMouseOverActualElement = imdom.hasMouseOver(c, (value as DomAppender<HTMLElement>).root);

                    if (imdom.hasMouseOver(c) || hasMouseOverActualElement) {
                        nextDomNode = value;
                    }

                    imJsDevToolsFinalRelease(c, childEntries as ImCacheEntries, introspectorRoot);

                    imdom.setClass(c, cnHighlight, lastDomNode === value, root.root);
                } imdom.ElEnd(c, el.DIV);
            }); im.ForEnd(c);
        } imDivEnd(c);
    } im.IfEnd(c);

}
