import { BLOCK, imLayoutBegin, imLayoutEnd, imSize, NA, PERCENT, PX, cssVars, newCssBuilder } from "./ui-core";
import { ImCache, imMemo, isFirstishRender } from "src/utils/im-core";
import { elSetClass, elSetStyle } from "src/utils/im-dom";

// Surprisingly useful. That being said, I have been informed that using lines to design instead of spacing is usally a bad idea

const cssb = newCssBuilder();
const cnHLine = cssb.cn("hline", [
    ` { transition: opacity 0.1s linear, height 0.1s linear; }`
]);

export const LINE_HORIZONTAL = 1;
export const LINE_VERTICAL = 2;

export function imLine(
    c: ImCache,
    type: typeof LINE_HORIZONTAL | typeof LINE_VERTICAL,
    widthPx: number = 2,
    visible = true
) {
    let height = visible ? widthPx : 0;
    let heightUnit = PX;
    const isH = type === LINE_HORIZONTAL;

    imLayoutBegin(c, BLOCK); imSize(c,
        !isH ? height : 100, !isH ? heightUnit : PERCENT,
         isH ? height : 100,  isH ? heightUnit : PERCENT,
    ); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "backgroundColor", cssVars.fg);
            elSetClass(c, cnHLine);
        }

        if (imMemo(c, visible)) {
            elSetStyle(c, "opacity", "" + (visible ? 1 : 0));
        }
    } imLayoutEnd(c);
}

export function imHLineDivider(c: ImCache) {
    imLayoutBegin(c, BLOCK); imSize(c, 0, NA, 10, PX); imLayoutEnd(c);
}

