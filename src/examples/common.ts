import { BLOCK, imJustify, imLayout, imLayoutBegin, imLayoutEnd, imPadding, PX, ROW } from "src/utils/im-js/im-ui";
import { im, imdom, el, ImCache } from "src/utils/im-js";

export function imHeadingBegin(c: ImCache) {
    imdom.ElBegin(c, el.H1); imLayout(c, ROW); imJustify(c);
}

export function imHeadingEnd(c: ImCache) {
    return imdom.ElEnd(c, el.H1);
}

export function imParaBegin(c: ImCache) {
    imLayoutBegin(c, BLOCK);
    if (im.isFirstishRender(c)) imdom.setStyle(c, "paddingTop", "10px");
    if (im.isFirstishRender(c)) imdom.setStyle(c, "paddingBottom", "10px");
}
export function imParaEnd(c: ImCache) {
    return imLayoutEnd(c);
}

export function imSubheadingBegin(c: ImCache) {
    return imdom.ElBegin(c, el.H2);
}
export function imSubheadingEnd(c: ImCache) {
    return imdom.ElEnd(c, el.H2);
}

export function imBaseContainerBegin(c: ImCache) {
    imLayoutBegin(c, BLOCK); imPadding(c, 0, PX, 10, PX, 10, PX, 10, PX);
}
export function imBaseContainerEnd(c: ImCache) {
    imLayoutEnd(c);
}

