// core-ui V.0.1.2

import { ImCache, imGet, imMemo, imSet, inlineTypeId, isFirstishRender } from 'src/utils/im-core';
import { EL_DIV, elSetClass, elSetStyle, imElBegin, imElEnd } from 'src/utils/im-dom';

///////////////////////////
// Initialization

/**
 * Run this once _after_ all styles have been registered.
 */
export function initImUi() {
    initCssbStyles();
}

///////////////////////////
// Common layout patterns

const cssb = newCssBuilder();

// It occurs to me that I can actually just make my own fully custom layout system that significantly minimizes
// number of DOM nodes required to get things done.

export type SizeUnitInstance = number & { __sizeUnit: void; };

export const PX = 10001 as SizeUnitInstance;
export const EM = 20001 as SizeUnitInstance;
export const PERCENT = 30001 as SizeUnitInstance;
export const REM = 40001 as SizeUnitInstance;
export const CH = 50001 as SizeUnitInstance;
export const NA = 60001 as SizeUnitInstance; // Not applicable. Nahh. 

export type SizeUnits = typeof PX |
    typeof EM |
    typeof PERCENT |
    typeof REM |
    typeof CH |
    typeof NA;

function getUnits(num: SizeUnits) {
    switch(num) {
        case PX:      return "px";
        case EM:      return "em";
        case PERCENT: return "%";
        case REM:     return "rem";
        case CH:      return "ch";
        default:      return "px";
    }
}

function getSize(num: number, units: SizeUnits) {
    return units === NA ? "" : num + getUnits(units);
}

export function imSize(
    c: ImCache,
    width: number, wType: SizeUnits,
    height: number, hType: SizeUnits, 
) {
    // TODO: Cross browser testing. Seems a bit sus here

    if (imMemo(c, width) | imMemo(c, wType)) {
        const sizeCss = getSize(width, wType);
        elSetStyle(c, "width",    sizeCss); 
        elSetStyle(c, "minWidth", sizeCss);
        elSetStyle(c, "maxWidth", sizeCss);
    }

    if (imMemo(c, height) | imMemo(c, hType)) {
        const sizeCss = getSize(height, hType);
        elSetStyle(c, "height",    sizeCss); 
        elSetStyle(c, "minHeight", sizeCss);
        elSetStyle(c, "maxHeight", sizeCss);
    }
}

export function imOpacity(c: ImCache, val: number) {
    if (imMemo(c, val)) elSetStyle(c, "opacity", "" + val);
}

export function imRelative(c: ImCache) {
    if (isFirstishRender(c)) elSetStyle(c, "position", "relative");
}

export function imBg(c: ImCache, colour: string) {
    if (imMemo(c, colour)) elSetStyle(c, "backgroundColor", colour);
}

export function imFg(c: ImCache, colour: string) {
    if (imMemo(c, colour)) elSetStyle(c, "color", colour);
}

export function imFontSize(c: ImCache, size: number, units: SizeUnits) {
    if (imMemo(c, size) | imMemo(c, units)) elSetStyle(c, "fontSize", getSize(size, units));
}

export type DisplayTypeInstance = number & { __displayType: void; };

/**
 * Whitespace " " can permeate 'through' display: block DOM nodes, so it's useful for text.
 * ```ts
 * imLayout(c, BLOCK); { 
 *      imLayout(c, INLINE); {
 *          if (isFirstishRender(c)) elSetStyle(c, "fontWeight", "bold");
 *          imStr(c, "Hello, "); // imLayout(c, ROW) would ignore this whitespace.
 *      } imLayoutEnd(c);
 *      imStr(c, "World"); 
 *  } imLayoutEnd(c);
 */
export const BLOCK = 1 as DisplayTypeInstance;
export const INLINE_BLOCK = 2 as DisplayTypeInstance;
export const INLINE = 3 as DisplayTypeInstance;
export const ROW = 4 as DisplayTypeInstance;
export const ROW_REVERSE = 5 as DisplayTypeInstance;
export const COL = 6 as DisplayTypeInstance;
export const COL_REVERSE = 7 as DisplayTypeInstance;
export const TABLE = 8 as DisplayTypeInstance;
export const TABLE_ROW = 9 as DisplayTypeInstance;
export const TABLE_CELL = 10 as DisplayTypeInstance;
export const INLINE_ROW = 11 as DisplayTypeInstance;
export const INLINE_COL = 12 as DisplayTypeInstance;

export type DisplayType 
    = typeof BLOCK 
    | typeof INLINE_BLOCK 
    | typeof ROW 
    | typeof ROW_REVERSE 
    | typeof COL 
    | typeof COL_REVERSE 
    | typeof TABLE 
    | typeof TABLE_ROW  
    | typeof TABLE_CELL
    | typeof INLINE_ROW
    | typeof INLINE_COL;

/**
 * A dummy element with flex: 1. Super useful for flexbox.
 */
export function imFlex1(c: ImCache) {
    imLayoutBegin(c, BLOCK); {
        if (isFirstishRender(c)) elSetStyle(c, "flex", "1");
    } imLayoutEnd(c);
}


const cnInlineBlock = cssb.cn("inlineBlock", [` { display: inline-block; }`]);
const cnInline      = cssb.cn("inline",      [` { display: inline; }`]);
const cnRow         = cssb.cn("row",         [` { display: flex; flex-direction: row; }`]);
const cnInlineRow   = cssb.cn("row",         [` { display: inline-flex; flex-direction: row; }`]);
const cnRowReverse  = cssb.cn("row-reverse", [` { display: flex; flex-direction: row-reverse; }`]);
const cnCol         = cssb.cn("col",         [` { display: flex; flex-direction: column; }`]);
const cnInlineCol   = cssb.cn("col",         [` { display: inline-flex; flex-direction: column; }`]);
const cnColReverse  = cssb.cn("col-reverse", [` { display: flex; flex-direction: column-reverse; }`]);

export function imLayoutBeginInternal(c: ImCache, type: DisplayType) {
    const root = imElBegin(c, EL_DIV);

    const last = imGet(c, inlineTypeId(imLayoutBegin), -1);
    if (last !== type) {
        imSet(c, type);

        switch(last) {
            case BLOCK:        /* Do nothing - this is the default style */ break;
            case INLINE_BLOCK: elSetClass(c, cnInlineBlock, false);        break;
            case INLINE:       elSetClass(c, cnInline, false);             break;
            case ROW:          elSetClass(c, cnRow, false);                break;
            case ROW_REVERSE:  elSetClass(c, cnRowReverse, false);         break;
            case COL:          elSetClass(c, cnCol, false);                break;
            case COL_REVERSE:  elSetClass(c, cnColReverse, false);         break;
            case INLINE_ROW:   elSetClass(c, cnInlineRow, false);          break;
            case INLINE_COL:   elSetClass(c, cnInlineCol, false);          break;
        }

        switch(type) {
            case BLOCK:        /* Do nothing - this is the default style */ break;
            case INLINE_BLOCK: elSetClass(c, cnInlineBlock, true);         break;
            case INLINE:       elSetClass(c, cnInline, true);              break;
            case ROW:          elSetClass(c, cnRow, true);                 break;
            case ROW_REVERSE:  elSetClass(c, cnRowReverse, true);          break;
            case COL:          elSetClass(c, cnCol, true);                 break;
            case COL_REVERSE:  elSetClass(c, cnColReverse, true);          break;
            case INLINE_ROW:   elSetClass(c, cnInlineRow, true);           break;
            case INLINE_COL:   elSetClass(c, cnInlineCol, true);           break;
        }
    }

    return root;
}

export function imLayoutBegin(c: ImCache, type: DisplayType) {
    return imLayoutBeginInternal(c, type).root;
}

export function imLayoutEnd(c: ImCache) {
    imElEnd(c, EL_DIV);
}

export function imPre(c: ImCache) {
    if (isFirstishRender(c)) elSetStyle(c, "whiteSpace", "pre");
}

export function imPreWrap(c: ImCache) {
    if (isFirstishRender(c)) elSetStyle(c, "whiteSpace", "pre-wrap");
}

export function imNoWrap(c: ImCache) {
    if (isFirstishRender(c)) elSetStyle(c, "whiteSpace", "nowrap");
}


export function imFlex(c: ImCache, ratio = 1) {
    if (imMemo(c, ratio)) {
        elSetStyle(c, "flex", "" + ratio);
        // required to make flex work the way I had thought it already worked
        elSetStyle(c, "minWidth", "0");
        elSetStyle(c, "minHeight", "0");
    }
}

export function imGap(c: ImCache, val = 0, units: SizeUnits) {
    const valChanged = imMemo(c, val);
    const unitsChanged = imMemo(c, units);
    if (valChanged || unitsChanged) {
        elSetStyle(c, "gap", getSize(val, units));
    }
}

// Add more as needed
export const NONE = 0;
export const CENTER = 1;
export const LEFT = 2;
export const RIGHT = 3;
export const START = 2;
export const END = 3;
export const STRETCH = 4;

function getAlignment(alignment: number) {
    switch(alignment) {
        case NONE:    return "";
        case CENTER:  return "center";
        case LEFT:    return "left";
        case RIGHT:   return "right";
        case START:   return "start";
        case END:     return "end";
        case STRETCH: return "stretch";
    }
    return "";
}

export function imAlign(c: ImCache, alignment = CENTER) {
    if (imMemo(c, alignment)) {
        elSetStyle(c, "alignItems", getAlignment(alignment));
    }
}

export function imJustify(c: ImCache, alignment = CENTER) {
    if (imMemo(c, alignment)) {
        elSetStyle(c, "justifyContent", getAlignment(alignment));
    }
}

export function imScrollOverflow(c: ImCache, vScroll = true, hScroll = false) {
    if (imMemo(c, vScroll)) elSetStyle(c, "overflowY", vScroll ? "auto" : "");
    if (imMemo(c, hScroll)) elSetStyle(c, "overflowX", hScroll ? "auto" : "");
}

export function imFixed(
    c: ImCache,
    top: number, topType: SizeUnits,
    right: number, rightType: SizeUnits,
    bottom: number, bottomType: SizeUnits,
    left: number, leftType: SizeUnits,
) {
    if (isFirstishRender(c)) elSetStyle(c, "position", "fixed");
    if (imMemo(c, top) | imMemo(c, topType))       elSetStyle(c, "top",    getSize(top, topType)); 
    if (imMemo(c, right) | imMemo(c, rightType))   elSetStyle(c, "right",  getSize(right, rightType)); 
    if (imMemo(c, bottom) | imMemo(c, bottomType)) elSetStyle(c, "bottom", getSize(bottom, bottomType)); 
    if (imMemo(c, left) | imMemo(c, leftType))     elSetStyle(c, "left",   getSize(left, leftType)); 
}

export function imPadding(
    c: ImCache,
    top: number,    topType: SizeUnits,
    right: number,  rightType: SizeUnits, 
    bottom: number, bottomType: SizeUnits, 
    left: number,   leftType: SizeUnits,
) {
    if (imMemo(c, top) | imMemo(c, topType))       elSetStyle(c, "paddingTop",    getSize(top, topType)); 
    if (imMemo(c, right) | imMemo(c, rightType))   elSetStyle(c, "paddingRight",  getSize(right, rightType)); 
    if (imMemo(c, bottom) | imMemo(c, bottomType)) elSetStyle(c, "paddingBottom", getSize(bottom, bottomType)); 
    if (imMemo(c, left) | imMemo(c, leftType))     elSetStyle(c, "paddingLeft",   getSize(left, leftType)); 
}

/**
 * 'Trouble' acronymn. Top Right Bottom Left. This is what we have resorted to.
 * Silly order. But it's the css standard convention.
 * I would have preferred (left, top), (right, bottom). You know, (x=0, y=0) -> (x=width, y=height) in HTML coordinates. xD
 */
export function imAbsolute(
    c: ImCache,
    top: number, topType: SizeUnits,
    right: number, rightType: SizeUnits, 
    bottom: number, bottomType: SizeUnits, 
    left: number, leftType: SizeUnits,
) {
    if (isFirstishRender(c)) elSetStyle(c, "position", "absolute");
    if (imMemo(c, top) | imMemo(c, topType))       elSetStyle(c, "top",    getSize(top, topType)); 
    if (imMemo(c, right) | imMemo(c, rightType))   elSetStyle(c, "right",  getSize(right, rightType)); 
    if (imMemo(c, bottom) | imMemo(c, bottomType)) elSetStyle(c, "bottom", getSize(bottom, bottomType)); 
    if (imMemo(c, left) | imMemo(c, leftType))     elSetStyle(c, "left",   getSize(left, leftType)); 
}

export function imAbsoluteXY(c: ImCache, x: number, xType: SizeUnits, y: number, yType: SizeUnits) {
    if (isFirstishRender(c)) elSetStyle(c, "position", "absolute");
    if (imMemo(c, x) | imMemo(c, xType)) elSetStyle(c, "left", getSize(x, xType)); 
    if (imMemo(c, y) | imMemo(c, yType)) elSetStyle(c, "top",  getSize(y, yType)); 
}

export function imOverflowContainer(c: ImCache, noScroll: boolean = false) {
    const root = imLayoutBegin(c, BLOCK);

    if (imMemo(c, noScroll)) {
        if (noScroll) {
            elSetStyle(c, "overflow", "hidden");
        } else {
            elSetStyle(c, "overflow", "");
            elSetStyle(c, "overflowY", "auto");
        }
    }

    return root;
}

export function imOverflowContainerEnd(c: ImCache) {
    imLayoutEnd(c);
}

export function imAspectRatio(c: ImCache, w: number, h: number) {
    if (isFirstishRender(c)) {
        elSetStyle(c, "width", "auto");
        elSetStyle(c, "height", "auto");
    }

    const ar = w / h;
    if (imMemo(c, ar)) {
        elSetStyle(c, "aspectRatio", w + " / " + h);
    }
}

export function imZIndex(c: ImCache, z: number) {
    if (imMemo(c, z)) {
        elSetStyle(c, "zIndex", "" + z);
    }
}

///////////////////////////
// Colours

export type CssColor = {
    r: number; g: number; b: number; a: number;
    toCssString(aOverride?: number): string;
    toString(): string;
}

export function newColor(r: number, g: number, b: number, a: number): CssColor {
    return {
        r, g, b, a,
        toCssString(aOverride?: number) {
            const { r, g, b, a } = this;
            return `rgba(${Math.floor(r * 255)}, ${Math.floor(g * 255)}, ${Math.floor(b * 255)}, ${aOverride ?? a})`;
        },
        toString() {
            return this.toCssString();
        },
    };
}

// This one won't throw exceptions.
export function newColorFromHexOrUndefined(hex: string): CssColor | undefined {
    if (hex.startsWith("#")) {
        hex = hex.substring(1);
    }

    if (hex.length === 3 || hex.length === 4) {
        const r = hex[0];
        const g = hex[1];
        const b = hex[2];
        const a = hex[3] as string | undefined;

        return newColor(
            parseInt("0x" + r + r) / 255,
            parseInt("0x" + g + g) / 255,
            parseInt("0x" + b + b) / 255,
            a ? parseInt("0x" + a + a) / 255 : 1,
        );
    }

    if (hex.length === 6 || hex.length === 8) {
        const r = hex.substring(0, 2);
        const g = hex.substring(2, 4);
        const b = hex.substring(4, 6);
        const a = hex.substring(6);

        return newColor( 
            parseInt("0x" + r) / 255,
            parseInt("0x" + g) / 255,
            parseInt("0x" + b)/ 255,
            a ? parseInt("0x" + a) / 255 : 1,
        );
    }

    return undefined;
}

export function newColorFromHex(hex: string): CssColor {
    const col = newColorFromHexOrUndefined(hex);
    if (!col) {
        throw new Error("invalid hex: " + hex);
    }

    return col;
}

/**
 * Taken from https://gist.github.com/mjackson/5311256
 */
export function newColorFromHsv(h: number, s: number, v: number): CssColor {
    let r = 0, g = 0, b = 0;

    if (s === 0) {
        r = g = b = v; // achromatic
        return newColor(r, g, b, 1);
    }

    function hue2rgb(p: number, q: number, t: number) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    var q = v < 0.5 ? v * (1 + s) : v + s - v * s;
    var p = 2 * v - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);

    return newColor(r, g, b, 1);
}

function lerp(a: number, b: number, factor: number) {
    if (factor < 0) {
        return a;
    }

    if (factor > 1) {
        return b;
    }

    return a + (b - a) * factor;
}

/**
 * NOTE to self: try to use a CSS transition on the colour style before you reach for this!
 **/
export function lerpColor(c1: CssColor, c2: CssColor, factor: number, dst: CssColor) {
    dst.r = lerp(c1.r, c2.r, factor);
    dst.g = lerp(c1.g, c2.g, factor);
    dst.b = lerp(c1.b, c2.b, factor);
    dst.a = lerp(c1.a, c2.a, factor);
}


///////////////////////////
// CSS Builder

export function newStyleElement(): HTMLStyleElement {
    return document.createElement("style") as HTMLStyleElement;
}

const stylesStringBuilder: string[] = [];
const allClassNames = new Set<string>();

// collect every single style that was created till this point, and append it as a style node.
export function initCssbStyles(stylesRoot?: HTMLElement) {
    // NOTE: right now, you probably dont want to use document.body as your styles root, if that is also your app root.
    if (!stylesRoot) {
        stylesRoot = document.head;
    }

    const sb = stylesStringBuilder;
    if (sb.length > 0) {
        const text = sb.join("");
        stylesStringBuilder.length = 0;

        const styleNode = newStyleElement();
        styleNode.setAttribute("type", "text/css");
        styleNode.textContent = "\n\n" + text + "\n\n";
        stylesRoot.append(styleNode);
    }
}

/**
 * A util allowing components to register styles that they need to an inline stylesheet.
 * All styles in the entire bundle are string-built and appended in a `<style />` node as soon as
 * dom-utils is initialized. See {@link initializeDomUtils}
 *
 * The object approach allows us to add a prefix to all the class names we make.
 */
export function newCssBuilder(prefix: string = "") {
    const builder = stylesStringBuilder;
    return {
        /** Appends a CSS style to the builder. The prefix is not used. */
        s(string: string) {
            builder.push(string);
        },
        /** 
         * Returns `prefix + className`.
         * If this classname exists, we'll give you `prefix + classname + {incrementing number}`.
         */
        newClassName(className: string) {
            let name = prefix + className ;
            let baseName = name;
            let count = 2;
            while (allClassNames.has(name)) {
                // Should basically never happen. Would be interesting to see if it ever does, so I am logging it
                console.warn("conflicting class name " + name + ", generating another one");
                name = baseName + count;
                count++;
            }
            allClassNames.add(name);
            return name;
        },
        // makes a new class, it's variants, and returns the class name
        cn(className: string, styles: string[] | string): string {
            const name = this.newClassName(className);

            for (let style of styles) {
                const finalStyle = `.${name}${style}`;
                builder.push(finalStyle + "\n");
            }

            return name;
        },
    };
}

export function isColourLike(val: object): val is CssColor {
    return "r" in val && "g" in val && "b" in val && "a" in val && "toString" in val;
}


///////////////////////////
// Theme management system

export type CssVarValue = string | CssColor | object;
export type Theme = Record<string, CssVarValue>;
export type CssVarDict<T extends Theme> = { [K in keyof T & string]: `var(--${K})` };

const defaultTheme = {
    bg:         newColorFromHex("#FFF"),
    bg2:        newColorFromHex("#CCC"),
    mg:         newColorFromHex("#888"),
    fg2:        newColorFromHex("#333"),
    fg:         newColorFromHex("#000"),
    fg025a:     newColorFromHex("#00000040"),
    fg05a:      newColorFromHex("#00000080"),
    mediumText: "4rem",
    normalText: "1.5rem",
    smallText:  "1rem",
} satisfies Theme;

/**
 * Hint:
 * ```ts
 *
 * const appTheme = {
 *      ...defaultTheme,
 *      // custom vars go here
 * };
 *
 * const cssVarsApp = getCssVarsDict({
 *      ...appTheme,
 * });
 *
 * setCssVars(cssVarsApp);
 *
 * ```
 */
export function getCssVarsDict<T extends Theme>(theme: T): CssVarDict<T> {
    return Object.fromEntries(
        Object.keys(theme)
        .map((k: keyof T) =>  typeof k === "string" ? [k, `var(--${k})`] : null)
        .filter(k => !!k)
    );
}

export const cssVars = getCssVarsDict(defaultTheme);
setCurrentTheme(cssVars);

let currentTheme: Theme = cssVars;
export function getCurrentTheme(): Readonly<Theme> {
    return currentTheme;
}

/** 
 * Use this to manage which app theme is 'current'.
 * Anything that isn't a string, number or colour-like object is ignored.
 * For now, you'll need to manually make sure your themes have parity with one another.
 */
export function setCurrentTheme(theme: Theme, cssRoot?: HTMLElement) {
    if (!cssRoot) {
        cssRoot = document.querySelector(":root") as HTMLElement;
    }

    currentTheme = theme;

    for (const k in theme) {
        const val = theme[k];
        if (typeof val === "string" || isColourLike(val)) {
            setCssVar(cssRoot, k, val);
        }
    }
}

export function setCssVar(cssRoot: HTMLElement, varName: string, value: string | CssColor) {
    const fullVarName = `--${varName}`;
    cssRoot.style.setProperty(fullVarName, "" + value);
}
