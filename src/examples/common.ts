import { BLOCK, imJustify, imLayout, imLayoutBegin, imLayoutEnd, imPadding, PX, ROW } from "src/utils/im-js/im-ui";
import { ImCache, isFirstishRender } from "src/utils/im-js/im-core";
import { EL_H1, EL_H2, elSetStyle, imElBegin, imElEnd } from "src/utils/im-js/im-dom";

export function imHeadingBegin(c: ImCache) {
    imElBegin(c, EL_H1); imLayout(c, ROW); imJustify(c);
}
export function imHeadingEnd(c: ImCache) {
    return imElEnd(c, EL_H1);
}

export function imParaBegin(c: ImCache) {
    imLayoutBegin(c, BLOCK);
    if (isFirstishRender(c)) elSetStyle(c, "paddingTop", "10px");
    if (isFirstishRender(c)) elSetStyle(c, "paddingBottom", "10px");
}
export function imParaEnd(c: ImCache) {
    return imLayoutEnd(c);
}

export function imSubheadingBegin(c: ImCache) {
    return imElBegin(c, EL_H2);
}
export function imSubheadingEnd(c: ImCache) {
    return imElEnd(c, EL_H2);
}

export function imBaseContainerBegin(c: ImCache) {
    imLayoutBegin(c, BLOCK); imPadding(c, 0, PX, 10, PX, 10, PX, 10, PX);
}
export function imBaseContainerEnd(c: ImCache) {
    imLayoutEnd(c);
}

