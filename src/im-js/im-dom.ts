import { assert } from "./assert";
import { im, ImCache } from "./im-core";

///////////////////////////
// DOM-node management

export type ValidElement = HTMLElement | SVGElement;
export type AppendableElement = (ValidElement | Text);

// The children of this dom node get diffed and inserted as soon as you call `EndEl`
const FINALIZE_IMMEDIATELY = 0;
// The diffing and inserting will be deferred to when we do `DomRootEnd` instead. Useful for portal-like rendering.
// BTW. wouldn't deferring a region just break all finalize_immediately code anyway though? We should just remove this and
// defer everything. Some code migration will be required.
const FINALIZE_DEFERRED = 1; // TOOD: finalize_manually

export type FinalizationType
    = typeof FINALIZE_IMMEDIATELY
    | typeof FINALIZE_DEFERRED;

// NOTE: This dom appender is true immediate mode. No control-flow annotations are required for the elements to show up at the right place.
// However, you do need to store your dom appender children somewhere beforehand for stable references. 
// That is what the im.Cache helps with - but the im.Cache does need control-flow annotations to work. eh, It is what it is
export type DomAppender<E extends AppendableElement = AppendableElement> = {
    label?: string; // purely for debug

    root: E;
    keyRef: unknown; // Could be a key, or a dom element. Used to check pairs are linining up corectly.

    // Set this to true manually when you want to manage the DOM children yourself.
    // Hopefully that isn't all the time. If it is, then the framework isn't doing you too many favours.
    // Good use case: You have to manage hundreds of thousands of DOM nodes. 
    // From my experimentation, it is etiher MUCH faster to do this yourself instead of relying on the framework, or about the same,
    // depending on how the browser has implemented DOM node rendering.
    // Also will be needed for 3rd party lib integrations.
    manualDom: boolean;

    idx: number;     // Used to iterate the list

    // if null, root is a text node. else, it can be appended to.
    parent: DomAppender<ValidElement> | null;
    domRoot: DomAppender<ValidElement> | null;
    children: (DomAppender<AppendableElement>[] | null);
    selfIdx: number; // index of this node in it's own array

    isFirstishRender: boolean;

    // if true, the final pass can ignore this.
    finalizeType: FinalizationType; 

    // Dedicated finalization list instead of recursing through every element at the end.
    // This is because deferring the finalization of an element is very uncommon, so I don't
    // want to eat the performance penalty of the recursion just to finalize 2 things
    deferList: DomAppender<ValidElement>[] | undefined;
};

function newDomAppender<E extends AppendableElement>(
    root: E,
    domRoot: DomAppender<ValidElement> | null,
    children: (DomAppender<any>[] | null)
): DomAppender<E> {
    return {
        root,
        keyRef: null,
        idx: -1,

        parent: null,
        children,
        selfIdx: 0,
        manualDom: false,
        finalizeType: FINALIZE_IMMEDIATELY,

        isFirstishRender: true,

        // If null, it will get set to itself later.
        domRoot: domRoot,
        deferList: domRoot === null ? [] : undefined,
    };
}

function domAppenderDetatch(
    parent: DomAppender<ValidElement>,
    child: DomAppender<AppendableElement>
) {
    domAppenderClearParentAndShift(parent, child);
    child.root.remove();
}

function domAppenderClearParentAndShift(
    parent: DomAppender<ValidElement>,
    child: DomAppender<AppendableElement>
) {
    assert(parent.children !== null);
    assert(parent.children[child.selfIdx] === child);
    assert(parent.idx <= child.selfIdx); // Dont move a DOM node that has already been appended
    for (let i = child.selfIdx; i < parent.children.length - 1; i++) {
        parent.children[i] = parent.children[i + 1];
        parent.children[i].selfIdx = i;
    }
    parent.children.pop();
    child.parent = null;
}

function appendToDomRoot(a: DomAppender<ValidElement>, child: DomAppender<AppendableElement>) {
    if (a.children !== null) {
        a.idx++;
        const idx = a.idx;

        if (child.parent !== null && child.parent !== a) {
            const parent = child.parent;
            domAppenderDetatch(parent, child);
        }

        if (idx === a.children.length) {
            // Simply append this element
            child.parent = a;
            child.selfIdx = a.children.length;
            a.children.push(child);
            a.root.appendChild(child.root);
        } else if (idx < a.children.length) {
            const last = a.children[idx];
            assert(last.parent === a);

            if (last === child) {
                // no action required. Hopefull, this is the HOT path
            } else {
                if (child.parent === a) {
                    // If child is already here, we'll need to remove it beforehand
                    domAppenderClearParentAndShift(child.parent, child);
                }
                a.root.replaceChild(child.root, last.root);
                a.children[idx] = child;
                last.parent = null;
                child.selfIdx = idx;
                child.parent = a;
            }
        } else {
            assert(false); // unreachable
        }

        assert(child.parent === a);
        assert(child.selfIdx === a.idx);

        // turns out to be quite an expensive assertion, so I've commented it out for now
        // assert(child.root.parentNode === a.root);
    }
}

// Useful for debugging. Should be unused in prod.
function assertInvariants(appender: DomAppender<ValidElement>) {
    if (!appender.children) return;

    for (let i = 0; i <= appender.idx; i++) {
        const child = appender.children[i];

        assert(appender.children[child.selfIdx] === child);

        let count = 0;
        for (let i = 0; i <= appender.idx; i++) {
            const c2 = appender.children[i];
            if (c2 === child) count++;
        }
        assert(count <= 1);

        assert(child.parent === appender);
    }
}

/**
 TODO: test case

let useDiv1 = false;
function GraphMappingsEditorView(c: im.Cache) {
    LayoutBegin(c, BLOCK); imButton(c); {
        Str(c, "toggle");
        if (elHasMousePress(c)) useDiv1 = !useDiv1;
    } LayoutEnd(c);

    LayoutBegin(c, COL); imFlex(c); {
        let div1, div2
        LayoutBegin(c, ROW); imFlex(c); {
            LayoutBegin(c, COL); imFlex(c); {
                Str(c, "Div 1");

                div1 = LayoutBeginInternal(c, COL); imFinalizeDeferred(c); imLayoutEnd(c);

                Str(c, "Div 1 end");
            } LayoutEnd(c);
            LayoutBegin(c, COL); imFlex(c); {
                Str(c, "Div 2");

                div2 = LayoutBeginInternal(c, COL); imFinalizeDeferred(c); imLayoutEnd(c);

                Str(c, "Div 2 end");
            } LayoutEnd(c);
        } LayoutEnd(c);

        const s = GetInline(c, imGraphMappingsEditorView) ?? imSet(c, {
            choices: [],
        }) as any;

        const num = 10;
        if (useDiv1) {
            // useDiv1 = false;
            for (let i = 0; i < num; i++) {
                s.choices[i] = Math.random() < 0.5;
            }
        }

        For(c); for (let i = 0; i < num; i++) {
            const randomChoice = s.choices[i] ? div1 : div2;

            DomRootExistingBegin(c, randomChoice); {
                LayoutBegin(c, COL); {
                    addDebugLabelToAppender(c, "bruv " + i);
                    Str(c, "Naww: " + i);
                } LayoutEnd(c);
            } DomRootExistingEnd(c, randomChoice);
        } ForEnd(c);
    } LayoutEnd(c);
}

*/

function finalizeDomAppender(a: DomAppender<ValidElement>) {
    // by the time we get here, the dom nodes we want have already been appended in the right order, and
    // `a.children` should be pretty much identical to what is in the DOM. 
    // We just need to remove the children we didn't render this time
    if (a.children !== null && (a.idx + 1 !== a.children.length)) {
        // Remove remaining children. do so backwards, might be faster
        for (let i = a.children.length - 1; i >= a.idx + 1; i--) {
            a.children[i].root.remove();
            a.children[i].parent = null;
        }

        a.children.length = a.idx + 1;
    }
}


/**
 * NOTE: SVG elements are actually different from normal HTML elements, and 
 * will need to be created wtih {@link imElSvgBegin}
 */
function imElBegin<K extends keyof HTMLElementTagNameMap>(
    c: ImCache,
    r: KeyRef<K>
): DomAppender<HTMLElementTagNameMap[K]> {
    // TODO: support changing the type
    // Make this entry in the current entry list, so we can delete it easily
    const appender = getCurrentAppender(c);

    let childAppender: DomAppender<HTMLElementTagNameMap[K]> | undefined = im.Get(c, newDomAppender);
    if (childAppender === undefined) {
        const element = document.createElement(r.val);
        childAppender = im.Set(c, newDomAppender(element, appender.domRoot, []));
        childAppender.keyRef = r;
    }

    beginDomAppender(c, appender, childAppender);

    return childAppender;
}

function beginDomAppender(c: ImCache, appender: DomAppender<ValidElement>, childAppender: DomAppender<ValidElement>) {
    appendToDomRoot(appender, childAppender);
    im.pushParent(c, newDomAppender, childAppender);
    childAppender.idx = -1;
}

function endDomAppender(c: ImCache, appender: DomAppender<ValidElement>) {
    im.popParent(c, newDomAppender);
    appender.isFirstishRender = false;
}

/**
 * Svg nodes are different from normal DOM nodes, so you'll need to use this function to create them instead.
 */
function imElSvgBegin<K extends keyof SVGElementTagNameMap>(
    c: ImCache,
    r: KeyRef<K>
): DomAppender<SVGElementTagNameMap[K]> {
    // Make this entry in the current entry list, so we can delete it easily
    const appender = getCurrentAppender(c);

    let childAppender: DomAppender<SVGElementTagNameMap[K]> | undefined = im.Get(c, newDomAppender);
    if (childAppender === undefined) {
        const svgElement = document.createElementNS("http://www.w3.org/2000/svg", r.val);
        // Seems unnecessary. 
        // svgElement.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
        childAppender = im.Set(c, newDomAppender(svgElement, appender.domRoot, []));
        childAppender.keyRef = r;
    }

    beginDomAppender(c, appender, childAppender);

    return childAppender;
}


function imElEnd(c: ImCache, r: KeyRef<keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap>) {
    const appender = getCurrentAppender(c);
    assert(appender.keyRef === r) // make sure we're popping the right thing

    if (appender.finalizeType === FINALIZE_IMMEDIATELY) {
        finalizeDomAppender(appender);
    } else if (appender.finalizeType === FINALIZE_DEFERRED) {
        const deferList = appender.domRoot!.deferList;
        assert(!!deferList);
        deferList.push(appender);
    }

    endDomAppender(c, appender);
}

const imElSvgEnd = imElEnd;

function imRootBegin(c: ImCache, root: ValidElement) {
    let appender = im.Get(c, newDomAppender);
    if (appender === undefined) {
        appender = im.Set(c, newDomAppender(root, null, []));
        appender.domRoot = appender;
        appender.keyRef = root;
    }

    let depth = im.GetInline(c, imRootBegin) ?? im.Set(c, im.getNumParents(c));
    if (depth !== im.getNumParents(c)) {
        throw new Error("You may have forgotten to pop an element somewhere")
    }

    im.pushParent(c, newDomAppender, appender);

    // well we kinda have to. DomRootEnd will only finalize things with finalizeType === FINALIZE_DEFERRED
    imFinalizeDeferred(c);

    appender.idx = -1;
    
    assert(!!appender.deferList);
    appender.deferList.length = 0;

    return appender;
}

function imRootEnd(c: ImCache, root: ValidElement) {
    const appender = getCurrentAppender(c);
    assert(appender.keyRef === root);

    // By finalizing at the very end, we get two things:
    // - Opportunity to make a 'global key' - a component that can be instantiated anywhere but reuses the same cache entries. 
    //      a context menu is a good example of a usecase. Every component wants to instantiate it as if it were it's own, but really, 
    //      only one can be open at a time - there is an opportunity to save resources here and reuse the same context menu every time.
    // - Allows existing dom appenders to be re-pushed onto the stack, and appended to. 
    //      Useful for creating 'layers' that exist in another part of the DOM tree that other components might want to render to.
    //      For example, if I am making a node editor with SVG paths as edges, it is best to just have a single SVG layer to render everything into
    //      but then organising the components becomes a bit annoying.

    // deferred finalization.
    const deferList = appender.domRoot!.deferList;
    assert(!!deferList);
    for (let i = 0; i < deferList.length; i++) {
        const item = deferList[i];
        finalizeDomAppender(item);
    }

    // Finally, finalize the root
    finalizeDomAppender(appender);

    endDomAppender(c, appender);
}

/**
 * If you will only ever have a single root (majority of usecases), this is the one to use.
 * If you need multiple roots for some reason, then you want a call to {@link imRootBegin}/{@link imRootEnd}
 * per-root, and just a single call to {@link imGlobalEventSystemPoll}/{@link imGlobalEventSystemEnd}
 */
function imDomBegin(c: ImCache, singleRoot: HTMLElement) {
    imGlobalEventSystemPoll(c);
    imRootBegin(c, singleRoot);
}

function imDomEnd(c: ImCache, singleRoot: HTMLElement) {
    imRootEnd(c, singleRoot);
}

function addDebugLabelToAppender(c: ImCache, str: string | undefined) {
    const appender = getCurrentAppender(c);
    appender.label = str;
}

// Use this whenever you expect to render to a particular dom node from a place in the code that
// would otherwise not have access to this dom node.
function imRootExistingBegin(c: ImCache, existing: DomAppender<any>) {
    // If you want to re-push this DOM node to the immediate mode stack, use imdom.FinalizeDeferred(c).
    // I.e ElBegin(c, EL_BLAH); imFinalizeDeferred(c); {
    // This allows the 'diff' to happen at the _end_ of the render pass instead of immediately after we close the element.
    // This isn't the default, because it breaks some code that expects the node to have been inserted - 
    // calls to textInput.focus() for example, won't work till the next frame, for example.
    assert(existing.finalizeType === FINALIZE_DEFERRED);

    im.pushParent(c, newDomAppender, existing);
}

function imRootExistingEnd(c: ImCache, existing: DomAppender<any>) {
    const appender = getCurrentAppender(c);
    assert(appender === existing);
    endDomAppender(c, appender);
}

/** @deprecated TODO: remove this method in favour of explicitly finalizing */
function imFinalizeDeferred(c: ImCache) {
    getCurrentAppender(c).finalizeType = FINALIZE_DEFERRED;
}


export interface Stringifyable {
    // Allows you to memoize the text on the object reference, and not the literal string itself, as needed.
    // Also, most objects in JavaScript already implement this.
    toString(): string;
}

/**
 * This method manages a HTML Text node. So of course, I named it
 * `Str`. 
 */
function imStr(c: ImCache, value: Stringifyable): Text {
    const appender = getCurrentAppender(c);

    let textNodeLeafAppender; textNodeLeafAppender = im.GetInline(c, imStr);
    if (textNodeLeafAppender === undefined) textNodeLeafAppender = im.Set(c, newDomAppender(
        document.createTextNode(""),
        appender,
        null
    ));

    // The user can't select this text node if we're constantly setting it, so it's behind a cache
    let lastValue = im.GetInline(c, document.createTextNode);
    if (im.isSetRequired(c) === true || lastValue !== value) {
        im.Set(c, value);
        textNodeLeafAppender.root.nodeValue = (value != null && value.toString) ? value.toString() : "<couldn't stringify>";
    }

    appendToDomRoot(appender, textNodeLeafAppender);

    return textNodeLeafAppender.root;
}

// TODO: not scaleable for the same reason State isn't scaleable. we gotta think of something better that lets us have more dependencies/arguments to the formatter
function imStrFmt<T>(c: ImCache, value: T, formatter: (val: T) => string): Text {
    const appender = getCurrentAppender(c);

    let textNodeLeafAppender; textNodeLeafAppender = im.GetInline(c, imStr);
    if (textNodeLeafAppender === undefined) textNodeLeafAppender = im.Set(c, newDomAppender(
        document.createTextNode(""),
        appender.domRoot,
        null
    ));

    const formatterChanged = im.Memo(c, formatter);

    // The user can't select this text node if we're constantly setting it, so it's behind a cache
    let lastValue = im.GetInline(c, document.createTextNode);
    if (lastValue !== value || formatterChanged !== 0) {
        im.Set(c, value);
        textNodeLeafAppender.root.nodeValue = formatter(value);
    }

    appendToDomRoot(appender, textNodeLeafAppender);

    return textNodeLeafAppender.root;
}

function setStyle<K extends (keyof ValidElement["style"])>(
    c: ImCache,
    key: K,
    value: string,
    root = getCurrentElement(c),
) {
    // @ts-expect-error its fine tho
    root.style[key] = value;
}

function setStyleRed(c: ImCache) {
    setStyle(c, "backgroundColor", "red");
}

function setTextContent(c: ImCache, val: string) {
    let el = getCurrentElement(c);
    el.textContent = val;
}

function setStyleProperty(
    c: ImCache,
    key: string,
    value: string,
    root = getCurrentElement(c),
) {
    if (!value) {
        root.style.removeProperty(key);
    } else {
        root.style.setProperty(key, value);
    }
}


function setClass(
    c: ImCache,
    className: string,
    enabled: boolean | number = true,
    el = getCurrentElement(c)
): boolean {
    if (enabled !== false && enabled !== 0) {
        el.classList.add(className);
    } else {
        el.classList.remove(className);
    }

    return !!enabled;
}

function setAttr(
    c: ImCache,
    attr: string,
    val: string | null,
    root = getCurrentElement(c),
) {
    if (val !== null) {
        root.setAttribute(attr, val);
    } else {
        root.removeAttribute(attr);
    }
}

function getCurrentAppender(c: ImCache): DomAppender<ValidElement> {
    return im.getParent(c, newDomAppender);
}

function getCurrentElement(c: ImCache) {
    return getCurrentAppender(c).root;
}

// NOTE: you should only use this if you don't already have some form of global event handling set up,
// or in cases where you can't use global event handling.
function imOn<K extends keyof HTMLElementEventMap>(
    c: ImCache,
    type: KeyRef<K>,
): HTMLElementEventMap[K] | null {
    let state; state = im.GetInline(c, imOn);
    if (state === undefined) {
        const val: {
            el: ValidElement;
            eventType: KeyRef<keyof HTMLElementEventMap> | null;
            eventValue: Event | null;
            eventListener: (e: HTMLElementEventMap[K]) => void;
        } = {
            el: getCurrentElement(c),
            eventType: null,
            eventValue: null,
            eventListener: (e: HTMLElementEventMap[K]) => {
                // NOTE: Some of you coming from a non-web background may be puzzled as to why
                // we are re-rendering the entire app for EVERY event. This is because we always want
                // the ability to call e.preventDefault() while the event is occuring for any event.
                // Buffering the events means that we will miss the opportunity to prevent the default event.

                val.eventValue = e;
                im.rerenderCache(c);
            },
        };
        state = im.Set(c, val);
    }

    let result: HTMLElementEventMap[K] | null = null;

    if (state.eventValue !== null) {
        result = state.eventValue as HTMLElementEventMap[K];
        state.eventValue = null;
    }

    if (state.eventType !== type) {
        const el = getCurrentElement(c);
        if (state.eventType !== null) {
            el.removeEventListener(state.eventType.val, state.eventListener as EventListener);
        }

        state.eventType = type;
        el.addEventListener(state.eventType.val, state.eventListener as EventListener);
    }

    return result;
}

///////////////////////////
// Global event system

function getMouse(): MouseState {
    // You need to initialize a global event system before you go getting it
    assert(globalEventSystem !== undefined);
    return globalEventSystem.mouse;
}

function getKeyboard(): KeyboardState {
    // You need to initialize a global event system before you go getting it
    assert(globalEventSystem !== undefined);
    return globalEventSystem.keyboard;
}

function getBlur(): boolean {
    // You need to initialize a global event system before you go getting it
    assert(globalEventSystem !== undefined);
    return globalEventSystem.blur;
}

function hasMousePress(c: ImCache, el = getCurrentElement(c)): boolean {
    const mouse = getMouse();
    return elIsInSetThisFrame(el, mouse.mouseDownElements)
}

function hasMouseUp(c: ImCache, el = getCurrentElement(c)): boolean {
    const mouse = getMouse();
    return elIsInSetThisFrame(el, mouse.mouseUpElements)
}

function hasMouseClick(c: ImCache, el = getCurrentElement(c)): boolean {
    const mouse = getMouse();
    return elIsInSetThisFrame(el, mouse.mouseClickElements)
}

function hasMouseOver(c: ImCache, el = getCurrentElement(c)): boolean {
    const mouse = getMouse();
    return mouse.mouseOverElements.has(el);
}

function elIsInSetThisFrame(el: ValidElement, set: Set<ValidElement>) {
    const result = set.has(el);
    set.delete(el);
    return result;
}

export type SizeState = {
    width: number;
    height: number;
}

export type KeyboardState = {
    // We need to use this approach instead of a buffered approach like `keysPressed: string[]`, so that a user
    // may call `preventDefault` on the html event as needed.
    // NOTE: another idea is to do `keys.keyDown = null` to prevent other handlers in this framework
    // from knowing about this event.
    keyDown: KeyboardEvent | null;
    keyUp: KeyboardEvent | null;

    keys: KeysState;
};


export type MouseState = {
    lastX: number;
    lastY: number;

    ev: MouseEvent | null;

    leftMouseButton: boolean;
    middleMouseButton: boolean;
    rightMouseButton: boolean;

    dX: number;
    dY: number;
    X: number;
    Y: number;

    /**
     * NOTE: if you want to use this, you'll have to prevent scroll event propagation.
     * See {@link imPreventScrollEventPropagation}
     */
    scrollWheel: number;

    mouseDownElements: Set<ValidElement>;
    mouseUpElements: Set<ValidElement>;
    mouseClickElements: Set<ValidElement>;
    mouseOverElements: Set<ValidElement>;
    lastMouseOverElement: ValidElement | null;
};

export type GlobalEventSystem = {
    rerender: () => void;
    keyboard: KeyboardState;
    mouse: MouseState;
    blur:  boolean;
    dontClear: boolean;
    globalEventHandlers: {
        mousedown:  (e: MouseEvent) => void;
        mousemove:  (e: MouseEvent) => void;
        mouseenter: (e: MouseEvent) => void;
        mouseup:    (e: MouseEvent) => void;
        mouseclick: (e: MouseEvent) => void;
        wheel:      (e: WheelEvent) => void;
        keydown:    (e: KeyboardEvent) => void;
        keyup:      (e: KeyboardEvent) => void;
        blur:       () => void;
    };
}

function findParents(el: ValidElement, elements: Set<ValidElement>) {
    elements.clear();
    let current: ValidElement | null = el;
    while (current !== null) {
        elements.add(current);
        current = current.parentElement;
    }
}

function newImGlobalEventSystem(c: ImCache): GlobalEventSystem {
    const keyboard: KeyboardState = {
        keyDown: null,
        keyUp: null,
        keys: newKeysState(),
    };

    const mouse: MouseState = {
        ev: null,

        leftMouseButton: false,
        middleMouseButton: false,
        rightMouseButton: false,

        dX: 0,
        dY: 0,
        // By making the initial position offscreen, the mouse 
        // doesn't hover any UI element on page-load
        X: -1,
        Y: -1,
        lastX: -1,
        lastY: -1,

        scrollWheel: 0,

        mouseDownElements: new Set<ValidElement>(),
        mouseUpElements: new Set<ValidElement>(),
        mouseClickElements: new Set<ValidElement>(),
        mouseOverElements: new Set<ValidElement>(),
        lastMouseOverElement: null,
    };

    function handleMouseMove(e: MouseEvent) {
        mouse.ev = e;
        mouse.lastX = mouse.X;
        mouse.lastY = mouse.Y;
        mouse.X = e.clientX;
        mouse.Y = e.clientY;
        if (mouse.lastX >= 0 && mouse.lastY >= 0) {
            mouse.dX += mouse.X - mouse.lastX;
            mouse.dY += mouse.Y - mouse.lastY;
        }

        if (mouse.lastMouseOverElement !== e.target) {
            mouse.lastMouseOverElement = e.target as ValidElement;
            findParents(e.target as ValidElement, mouse.mouseOverElements);
            return true;
        }

        return false
    };

    function updateMouseButtons(e: MouseEvent) {
        mouse.leftMouseButton = Boolean(e.buttons & (1 << 0));
        mouse.rightMouseButton = Boolean(e.buttons & (2 << 0));
        mouse.middleMouseButton = Boolean(e.buttons & (3 << 0));
    }

    const eventSystem: GlobalEventSystem = {
        rerender: () => {
            eventSystem.dontClear = true;
            im.rerenderCache(c)
        },
        keyboard,
        mouse,
        blur: false,
        dontClear: false,
        // stored, so we can dispose them later if needed.
        globalEventHandlers: {
            mousedown: (e: MouseEvent) => {
                updateMouseButtons(e);

                findParents(e.target as ValidElement, mouse.mouseDownElements);
                try {
                    mouse.ev = e;
                    eventSystem.rerender();
                } finally {
                    mouse.mouseDownElements.clear();
                    mouse.ev = null;
                }
            },
            mouseclick: (e) => {
                findParents(e.target as ValidElement, mouse.mouseClickElements);
                try {
                    mouse.ev = e;
                    eventSystem.rerender();
                } finally {
                    mouse.mouseClickElements.clear();
                    mouse.ev = null;
                }
            },
            mousemove: (e) => {
                updateMouseButtons(e);

                if (handleMouseMove(e) === true) {
                    eventSystem.rerender();
                    mouse.ev = null;
                }
            },
            mouseenter: (e) => {
                if (handleMouseMove(e) === true) {
                    eventSystem.rerender();
                    mouse.ev = null;
                }
            },
            mouseup: (e: MouseEvent) => {
                updateMouseButtons(e);

                findParents(e.target as ValidElement, mouse.mouseUpElements);
                try {
                    mouse.ev = e;
                    eventSystem.rerender();
                } finally {
                    mouse.mouseUpElements.clear();
                    mouse.ev = null;
                }
            },
            wheel: (e: WheelEvent) => {
                mouse.scrollWheel += e.deltaX + e.deltaY + e.deltaZ;
                e.preventDefault();
                if (!handleMouseMove(e) === true) {
                    // rerender anwyway
                    eventSystem.rerender();
                }
            },
            keydown: (e: KeyboardEvent) => {
                keyboard.keyDown = e;
                updateKeysState(keyboard.keys, e, null, false);
                eventSystem.rerender();
            },
            keyup: (e: KeyboardEvent) => {
                keyboard.keyUp = e;
                updateKeysState(keyboard.keys, null, e, false);
                eventSystem.rerender();
            },
            blur: () => {
                resetImMouseState(mouse);
                resetImKeyboardState(keyboard);
                eventSystem.blur = true;
                updateKeysState(keyboard.keys, null, null, true);
                eventSystem.rerender();
            }
        },
    };

    return eventSystem;
}

function resetImKeyboardState(keyboard: KeyboardState) {
    keyboard.keyDown = null
    keyboard.keyUp = null

    const keys = keyboard.keys;
    updateKeysState(keys, null, null, true);
}

/**
 * See the decision matrix above {@link globalStateStackPush}
 */
let globalEventSystem: GlobalEventSystem | undefined;

// TODO: is there any point in separating this from DomRoot ?
function imGlobalEventSystemPoll(c: ImCache): GlobalEventSystem {
    let eventSystem = im.Get(c, newImGlobalEventSystem);
    if (eventSystem === undefined) {
        // Can't make two of these
        assert(globalEventSystem === undefined);

        const newEventSystem = newImGlobalEventSystem(c);
        addDocumentAndWindowEventListeners(newEventSystem);
        im.onImmediateModeBlockDestroyed(c, () => removeDocumentAndWindowEventListeners(newEventSystem));
        eventSystem = im.Set(c, newEventSystem);

        globalEventSystem = newEventSystem;
    }

    if (eventSystem.dontClear === false) {
        updateMouseState(eventSystem.mouse);
        updateKeysState(eventSystem.keyboard.keys, null, null, false);

        eventSystem.keyboard.keyDown = null
        eventSystem.keyboard.keyUp = null
        eventSystem.blur = false;
    } else {
        // Ensure that we only ever let 1 event through - 
        // make sure that if the component threw before reaching 
        // imGlobalEventSystemPoll, the next render of the component
        // will still clear out the event 
        eventSystem.dontClear = true;
    }

    return eventSystem;
}

function imTrackSize(c: ImCache, rerender = false) {
    let state; state = im.GetInline(c, imTrackSize);
    if (state === undefined) {
        const root = getCurrentElement(c);

        const self = {
            size: { width: 0, height: 0, },
            resized: false,
            shouldRerender: false,
            observer: new ResizeObserver((entries) => {
                for (const entry of entries) {
                    // NOTE: resize-observer cannot track the top, right, left, bottom of a rect. Sad.
                    self.size.width = entry.contentRect.width;
                    self.size.height = entry.contentRect.height;
                    self.resized = true;
                    break;
                }

                if (self.resized === true) {
                    if (self.shouldRerender) im.rerenderCache(c);
                    self.resized = false;
                }
            })
        };

        self.observer.observe(root);
        im.onImmediateModeBlockDestroyed(c, () => {
            self.observer.disconnect()
        });

        state = im.Set(c, self);
    }

    state.shouldRerender = rerender;

    return state;
}

function imTrackVisibility(c: ImCache, threshold: number) {
    let state; state = im.GetInline(c, imTrackVisibility);
    if (state === undefined) {
        const root = getCurrentElement(c);

        const self = {
            isVisible: false,
            initialThreshold: threshold,
            // TODO: add properties as we discover they are actually useful

            observer: new IntersectionObserver((entries) => {
                let isIntersecting = false;

                self.isVisible = false;
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        isIntersecting = true;
                    }
                }

                if (self.isVisible !== isIntersecting) {
                    self.isVisible = isIntersecting;
                    im.rerenderCache(c);
                }
            }, {
                threshold: threshold,
            })
        };

        self.observer.observe(root);
        im.onImmediateModeBlockDestroyed(c, () => {
            self.observer.disconnect()
        });

        state = im.Set(c, self);
    }


    if (state.initialThreshold !== threshold) {
        throw new Error("Can't change the threhsold after the fact");
    }

    return state;
}

function newPreventScrollEventPropagationState() {
    return {
        isBlocking: true,
        scrollY: 0,
    };
}

function imPreventScrollEventPropagation(c: ImCache, isBlocking = true): number {
    const wheel = imOn(c, ev.WHEEL);
    if (wheel && isBlocking) {
        wheel.preventDefault();
    }

    let result = 0;

    const mouse = getMouse();
    if (isBlocking === true && hasMouseOver(c) && mouse.scrollWheel !== 0) {
        result += mouse.scrollWheel;
        mouse.scrollWheel = 0;
    } 

    return result;
}

function updateMouseState(mouse: MouseState) {
    mouse.dX = 0;
    mouse.dY = 0;
    mouse.lastX = mouse.X;
    mouse.lastY = mouse.Y;

    mouse.scrollWheel = 0;
}

function resetImMouseState(mouse: MouseState) {
    mouse.dX = 0;
    mouse.dY = 0;
    mouse.lastX = mouse.X;
    mouse.lastY = mouse.Y;

    mouse.scrollWheel = 0;

    mouse.leftMouseButton = false;
    mouse.middleMouseButton = false;
    mouse.rightMouseButton = false;
}

function addDocumentAndWindowEventListeners(eventSystem: GlobalEventSystem) {
    document.addEventListener("mousedown", eventSystem.globalEventHandlers.mousedown);
    document.addEventListener("mousemove", eventSystem.globalEventHandlers.mousemove);
    document.addEventListener("mouseenter", eventSystem.globalEventHandlers.mouseenter);
    document.addEventListener("mouseup", eventSystem.globalEventHandlers.mouseup);
    document.addEventListener("click", eventSystem.globalEventHandlers.mouseclick);
    document.addEventListener("wheel", eventSystem.globalEventHandlers.wheel);
    document.addEventListener("keydown", eventSystem.globalEventHandlers.keydown);
    document.addEventListener("keyup", eventSystem.globalEventHandlers.keyup);
    window.addEventListener("blur", eventSystem.globalEventHandlers.blur);
}

function removeDocumentAndWindowEventListeners(eventSystem: GlobalEventSystem) {
    document.removeEventListener("mousedown", eventSystem.globalEventHandlers.mousedown);
    document.removeEventListener("mousemove", eventSystem.globalEventHandlers.mousemove);
    document.removeEventListener("mouseenter", eventSystem.globalEventHandlers.mouseenter);
    document.removeEventListener("mouseup", eventSystem.globalEventHandlers.mouseup);
    document.removeEventListener("click", eventSystem.globalEventHandlers.mouseclick);
    document.removeEventListener("wheel", eventSystem.globalEventHandlers.wheel);
    document.removeEventListener("keydown", eventSystem.globalEventHandlers.keydown);
    document.removeEventListener("keyup", eventSystem.globalEventHandlers.keyup);
    window.removeEventListener("blur", eventSystem.globalEventHandlers.blur);
}

///////////////////////////
// Various KeyRef entries

// Functions that need string keys, like {@link imdom.ElBegin} or {@link imdom.On}, 
// can now memoize on an object reference instead of a string. This improves performance.
// You shouldn't be creating these every frame - just reusing these constants below. 
// The framework then reads `keyRef.val` to get the actual string.
// It may not matter a lot for event listeners, but it would matter a lot for
// DOM elements, of which there can be thousands on any page.
// But if you put one kind of enum key behind a KeyRef, I as the API user will expect
// the same for every other thing as well.
export type KeyRef<K> = { val: K };

///////////////////////////
// Keyboard input tracking

function filterInPlace<T>(arr: T[], predicate: (v: T, i: number) => boolean) {
    let i2 = 0;
    for (let i = 0; i < arr.length; i++) {
        if (predicate(arr[i], i)) arr[i2++] = arr[i];
    }
    arr.length = i2;
}

// TODO: use keycode if supported

type PressedSymbols<T extends string> = {
    pressed: T[];
    held: T[];
    repeated: T[];
    released: T[];
};

export type KeysState = {
    keys: PressedSymbols<NormalizedKey>;
    letters: PressedSymbols<string>;
};

function newKeysState(): KeysState {
    return {
        keys: {
            pressed: [],
            held: [],
            released: [],
            repeated: [],
        },
        letters: {
            pressed: [],
            held: [],
            released: [],
            repeated: [],
        }
    };
}

const KEY_EVENT_NOTHING = 0;
const KEY_EVENT_PRESSED = 1;
const KEY_EVENT_RELEASED = 2;
const KEY_EVENT_REPEATED = 3;
const KEY_EVENT_BLUR = 4;


// https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values
// There are a LOT of them. So I won't bother holding state for every possible key like usual
// TODO: try using keyCode if available, then fall back on key
export type NormalizedKey = string & { __Key: void };

export function getNormalizedKey(key: string): NormalizedKey {
    if (key.length === 1) {
        key = key.toUpperCase();

        switch (key) {
            case "!": key = "1"; break;
            case "@": key = "2"; break;
            case "#": key = "3"; break;
            case "$": key = "4"; break;
            case "%": key = "5"; break;
            case "^": key = "6"; break;
            case "&": key = "7"; break;
            case "*": key = "8"; break;
            case "(": key = "9"; break;
            case ")": key = "0"; break;
            case "_": key = "-"; break;
            case "+": key = "+"; break;
            case "{": key = "["; break;
            case "}": key = "]"; break;
            case "|": key = "\\"; break;
            case ":": key = ";"; break;
            case "\"": key = "'"; break;
            case "<": key = ","; break;
            case ">": key = "."; break;
            case "?": key = "/"; break;
            case "~": key = "`"; break;
        }
    }

    return key as NormalizedKey;
}

function updatePressedSymbols<T extends string>(
    s: PressedSymbols<T>,
    ev: number,
    key: T,
) {
    for (let i = 0; i < s.pressed.length; i++) {
        s.held.push(s.pressed[i]);
    }
    s.pressed.length = 0;
    s.repeated.length = 0;
    s.released.length = 0;

    switch (ev) {
        case KEY_EVENT_PRESSED: {
            // NOTE: the main issue with this input mechanism, is that 
            // Shift + Click on some browsers will open a context menu that can't be detected. (or at least, I don't know how to detect it).
            // This can result in KEY_EVENT_RELEASED never being sent. 
            // The compromise made here is that we only ever have one of any key in these arrays.
            // The keys _may_ get stuck down, but if the user does the natural thing, press this key again,
            // it will get released, and all is good.

            if (s.pressed.indexOf(key) === -1) {
                s.pressed.push(key);
            }
        } break;
        case KEY_EVENT_REPEATED: {
            if (s.repeated.indexOf(key) === -1) {
                s.repeated.push(key);
            }
        } break;
        case KEY_EVENT_RELEASED: {
            filterInPlace(s.held, heldKey => heldKey !== key);
            if (s.released.indexOf(key) !== -1) {
                s.released.push(key);
            }
        } break;
        case KEY_EVENT_BLUR: {
            s.pressed.length = 0;
            s.released.length = 0;
            s.repeated.length = 0;
            s.held.length = 0;
        } break;
        case KEY_EVENT_NOTHING: {
        } break;
    }
}

function updateKeysStateInternal(
    keysState: KeysState,
    ev: number,
    key: string,
) {
    updatePressedSymbols(keysState.keys, ev, getNormalizedKey(key));
    updatePressedSymbols(keysState.letters, ev, key);
}

function updateKeysState(
    keysState: KeysState,
    keyDown: KeyboardEvent | null,
    keyUp: KeyboardEvent | null,
    blur: boolean,
) {
    let key = "";
    let ev = KEY_EVENT_NOTHING
    if (keyDown !== null) {
        key = keyDown.key;
        if (keyDown.repeat === true) {
            ev = KEY_EVENT_REPEATED;
        } else {
            ev = KEY_EVENT_PRESSED;
        }
    } else if (keyUp !== null) {
        key = keyUp.key;
        ev = KEY_EVENT_RELEASED;
    } else if (blur === true) {
        ev = KEY_EVENT_BLUR;
        key = "";
    } else {
        ev = KEY_EVENT_NOTHING;
        key = "";
    }

    updateKeysStateInternal(keysState, ev, key);

    if (key === "Control" || key === "Meta") {
        updateKeysStateInternal(keysState, ev, "Modifier");
    }
}

function isKeyPressed(keysState: KeyboardState, key: NormalizedKey): boolean {
    const keys = keysState.keys.keys;
    for (let i = 0; i < keys.pressed.length; i++) {
        if (keys.pressed[i] === key) return true;
    }
    return false;
}

function isKeyRepeated(keysState: KeyboardState, key: NormalizedKey): boolean {
    const keys = keysState.keys.keys;
    for (let i = 0; i < keys.repeated.length; i++) {
        if (keys.repeated[i] === key) return true;
    }
    return false;
}

function isKeyPressedOrRepeated(keysState: KeyboardState, key: NormalizedKey): boolean {
    if (isKeyPressed(keysState, key)) return true;
    if (isKeyRepeated(keysState, key)) return true;
    return false;
}

function isKeyReleased(keysState: KeyboardState, key: NormalizedKey): boolean {
    const keys = keysState.keys.keys;
    for (let i = 0; i < keys.released.length; i++) {
        if (keys.released[i] === key) return true;
    }
    return false;
}

function isKeyHeld(keysState: KeyboardState, key: NormalizedKey): boolean {
    const keys = keysState.keys.keys;
    for (let i = 0; i < keys.held.length; i++) {
        if (keys.held[i] === key) return true;
    }
    return false;
}


function isLetterPressed(keysState: KeyboardState, letter: string): boolean {
    const letters = keysState.keys.letters;
    for (let i = 0; i < letters.pressed.length; i++) {
        if (letters.pressed[i] === letter) return true;
    }
    return false;
}

function isLetterRepeated(keysState: KeyboardState, letter: string): boolean {
    const letters = keysState.keys.letters;
    for (let i = 0; i < letters.repeated.length; i++) {
        if (letters.repeated[i] === letter) return true;
    }
    return false;
}

function isLetterPressedOrRepeated(keysState: KeyboardState, letter: string): boolean {
    if (isLetterPressed(keysState, letter)) return true;
    if (isLetterRepeated(keysState, letter)) return true;
    return false;
}

function isLetterReleased(keysState: KeyboardState, letter: string): boolean {
    const letters = keysState.keys.letters;
    for (let i = 0; i < letters.released.length; i++) {
        if (letters.released[i] === letter) return true;
    }
    return false;
}

function isLetterHeld(keysState: KeyboardState, letter: string): boolean {
    const letters = keysState.keys.letters;
    for (let i = 0; i < letters.held.length; i++) {
        if (letters.held[i] === letter) return true;
    }
    return false;
}

export const imdom = {
    /** Internal methods */
    newDomAppender,  // This is the typeId of a Dom Appender.
    getAppender: getCurrentAppender,  // Gets the current DOM appender. Very useful for utils
    getElement: getCurrentElement,    // Short for getAppender().root

    /**
     * Typicaly just used at the very root of the program:
     *
     * const globalim.Cache: im.Cache = [];
     * main(globalim.Cache);
     *
     * function imMain(c: im.Cache) {
     *      im.CacheBegin(c, imMain); {
     *          const ev = imdom.Begin(c, document.body); {
     *              // Your code here
     *          } imdom.End(c, document.body, ev);
     *      } im.CacheEnd(c);
     * }
     *
     * const globalImCache: ImCache = []; // yes it's just an array
     * imMain(globalImCache);
     */
    Begin: imDomBegin, End:   imDomEnd,
    RootBegin: imRootBegin, RootEnd: imRootEnd,

    /** DOM-node creation */

    ElBegin:    imElBegin,    ElEnd: imElEnd,          // DOM nodes
    ElSvgBegin: imElSvgBegin, ElSvgEnd: imElSvgEnd,    // SVG Dom nodes (technically different :nerd-emoji:)
    Str:    imStr,       // Text node
    StrFmt: imStrFmt,    // Text node, custom formatter for arbitrary object. Try to make formatter a constant! Otherwise, expect terrible performance
    Text:   imStr,
    TextFmt: imStrFmt,

    /** 
     * These methods allow re-pushing a node we created somewhere else in the DOM to the immediate-mode stack.
     * You can now append more things under that node from here. Useful in certain specific situations. 
     * Not useful without FinalizeDeferred. Although maybe there should be the option to explicitly finalize the node yourself, instead of having
     * deferred finalization at all...
     **/
    RootExistingBegin: imRootExistingBegin,
    RootExistingEnd:   imRootExistingEnd,
    FinalizeDeferred:  imFinalizeDeferred,
    FINALIZE_IMMEDIATELY,
    FINALIZE_DEFERRED,

    /** Setting properties on DOM node */
    setStyle,
    setStyleRed, // useful for debugging
    setStyleProperty,
    setClass,
    setAttr,
    // Can be more performant that imdom.Str, since we don't need to do if (prevStr !== str) { updateStr } every frame.
    // Don't call this on an element that has non-text children! You'll delete them.
    setTextUnsafe: setTextContent, 

    /** Utility hooks */
    On:                            imOn, // Wrapper for .addEventListener. No, there is no corresponding Off - it doesn't make sense here
    TrackSize:                     imTrackSize,          // Wrapper for ResizeObserver. Not comprehensive
    TrackVisibility:               imTrackVisibility,    // Wrapper for IntersectionObserver. Not comprehensive
    PreventScrollEventPropagation: imPreventScrollEventPropagation, // Allows you to block the default scrolling action, and use the scroll delta for yourself. Probably didn't need to write this method actually

    /** Global event system */

    /* Already called by {@link imdom.Begin}, so you don't need to use it yourself */
    imGlobalEventSystemPoll: imGlobalEventSystemPoll, 

    getMouse,
    getKeyboard,
    getBlur,
    hasMousePress,
    hasMouseUp,
    hasMouseClick,
    hasMouseOver,
    isKeyPressed, isKeyRepeated, isKeyPressedOrRepeated, isKeyReleased, isKeyHeld,
    isLetterPressed, isLetterRepeated, isLetterPressedOrRepeated, isLetterReleased, isLetterHeld,

    /** Global event system - internal methods */
    newImGlobalEventSystem,
    newKeysState,
    getNormalizedKey,
} as const;
