import { im, ImCache } from "../im-core";
import { imdom, el } from "../im-dom";

export type Url = string & { readonly __Url: unique symbol; };

export function imLink(c: ImCache, url: Url, text: string = url) {
    imdom.ElBegin(c, el.A); {
        if (im.Memo(c, url)) {
            imdom.setAttr(c, "rel", "nofollow noopener noreferrer external");
            imdom.setAttr(c, "target", "_blank");
            imdom.setAttr(c, "href", url);
        }

        imdom.Str(c, text);
    } imdom.ElEnd(c, el.A);
}
