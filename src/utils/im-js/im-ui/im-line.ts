import { BLOCK, imLayoutBegin, imLayoutEnd, imSize, NA, PERCENT, PX, cssVars, newCssBuilder } from "./ui-core";
import { im, ImCache } from "../im-core";
import { imdom } from "../im-dom";

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
        if (im.isFirstishRender(c)) {
            imdom.setStyle(c, "backgroundColor", cssVars.fg);
            imdom.setClass(c, cnHLine);
        }

        if (im.Memo(c, visible)) {
            imdom.setStyle(c, "opacity", "" + (visible ? 1 : 0));
        }
    } imLayoutEnd(c);
}

export function imHLineDivider(c: ImCache) {
    imLayoutBegin(c, BLOCK); imSize(c, 0, NA, 10, PX); imLayoutEnd(c);
}

