import { BLOCK, imui, PX, ROW } from "im-ui";
import { im, imdom, el, ImCache } from "im-js";

export function imHeadingBegin(c: ImCache) {
    imdom.ElBegin(c, el.H1); imui.Layout(c, ROW); imui.Justify(c);
}

export function imHeadingEnd(c: ImCache) {
    return imdom.ElEnd(c, el.H1);
}

export function imParaBegin(c: ImCache) {
    imui.Begin(c, BLOCK);
    if (imdom.isFirstishRender()) imdom.setStyle(c, "paddingTop", "10px");
    if (imdom.isFirstishRender()) imdom.setStyle(c, "paddingBottom", "10px");
}
export function imParaEnd(c: ImCache) {
    return imui.End(c);
}

export function imSubheadingBegin(c: ImCache) {
    return imdom.ElBegin(c, el.H2);
}
export function imSubheadingEnd(c: ImCache) {
    return imdom.ElEnd(c, el.H2);
}

export function imBaseContainerBegin(c: ImCache) {
    imui.Begin(c, BLOCK); imui.Padding(c, 0, PX, 10, PX, 10, PX, 10, PX);
}
export function imBaseContainerEnd(c: ImCache) {
    imui.End(c);
}

