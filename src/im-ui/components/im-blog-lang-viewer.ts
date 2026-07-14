// im-blog-lang-viewer v0.0.1

import * as bl from "blog-lang";
import { el, im, ImCache, imdom } from "im-js";
import { cssVars, DisplayType, imui, BLOCK, COL, INLINE, LEFT, NA, PX, ROW, VH } from "im-ui";
import { imButtonStyle } from "im-ui/components/im-button";

export type MarkupRendererState = {
	blogpost: bl.Blogpost | undefined;
};

export function newMarkupRendererState(): MarkupRendererState {
	return {
		blogpost: undefined,
	};
}

// TODO: style this purely with CSS.

// Make sure the options you pass are stable immutable object.
// The component won't work if this isn't the case.
export type BlogLangRenderOptions = {
	userPtr?: any;
	imRenderBlock: (c: ImCache, block: bl.Block, options: BlogLangRenderOptions) => void;
	imRenderInlineItem: (c: ImCache, block: bl.InlineItem, options: BlogLangRenderOptions) => void;
};

export const defaultBlogLangRenderOptions = newBlogLangRenderOptions();

export function newBlogLangRenderOptions(
	imRenderBlock: ((c: ImCache, block: bl.Block, options: BlogLangRenderOptions) => void) = imRenderBlogLangBlock,
	imRenderInlineItem: ((c: ImCache, block: bl.InlineItem, options: BlogLangRenderOptions) => void) = imRenderBlogLangBlockItem,
	userPtr?: unknown,
): BlogLangRenderOptions {
	return {
		imRenderBlock: imRenderBlock,
		imRenderInlineItem: imRenderInlineItem,
		userPtr:       userPtr,
	};
}

export function imRenderBlogLangMarkup(c: ImCache, markup: string, markupVersion: number, options = defaultBlogLangRenderOptions) {
	const s = im.State(c, newMarkupRendererState);

	if (im.Memo(c, markupVersion) || !s.blogpost) {
		s.blogpost = bl.parse(markup);
	}

	imRenderBlogLangBlogpost(c, s.blogpost, options);
}

export function imRenderBlogLangBlogpost(c: ImCache, post: bl.Blogpost, options = defaultBlogLangRenderOptions) {
	imBegin(c); imui.Padding(c, 15, PX, 15, PX, 50, VH, 15, PX); {
		imRenderBlocksInternal(c, post.blocks, options);
	} imEnd(c);
}

export function imRenderBlocksInternal(c: ImCache, blocks: bl.Block[], options: BlogLangRenderOptions) {
	imBegin(c, COL); imui.Gap(c, 5, PX); {
		im.For(c); for (let i = 0; i < blocks.length; i++) {
			const block = blocks[i];

			// This computation was a lot simpler than I thought it would have had to be ...
			let needsExtraSpace = false;
			if (i > 0) {
				if (block.type === bl.B_TEXT) {
					needsExtraSpace = true;
				}
			}

			options.imRenderBlock(c, block, options);
		} im.ForEnd(c);
	} imEnd(c);
}

export function imRenderBlogLangBlock(c: ImCache, block: bl.Block, options: BlogLangRenderOptions) {
	imBegin(c); {
		im.Switch(c, block.type); switch (block.type) {
			case bl.B_TEXT: {
				im.Switch(c, block.style); switch (block.style) {
					case bl.S_NORMAL: {
						imBegin(c); {
							imRenderBlogpostBlockItems(c, block.inlineItems, options);
						} imEnd(c);
					} break;
					case bl.S_HEADING1: {
						imdom.ElBegin(c, el.H1); {
							if (im.isFirstRender(c)) imdom.setStyle(c, "textAlign", "center");
							imRenderBlogpostBlockItems(c, block.inlineItems, options);
						} imdom.ElEnd(c, el.H1);
					} break;
					case bl.S_HEADING2: {
						imdom.ElBegin(c, el.H2); {
							if (im.isFirstRender(c)) imdom.setStyle(c, "textAlign", "center");
							imRenderBlogpostBlockItems(c, block.inlineItems, options);
						} imdom.ElEnd(c, el.H2);
					} break;
					case bl.S_HEADING3: {
						imdom.ElBegin(c, el.H3); {
							if (im.isFirstRender(c)) imdom.setStyle(c, "textAlign", "center");
							imRenderBlogpostBlockItems(c, block.inlineItems, options);
						} imdom.ElEnd(c, el.H3);
					} break;
					case bl.S_QUOTE: {
					} break;
				} im.SwitchEnd(c)
			} break;
			case bl.B_CODE: {
				const padding = 5;
				imBegin(c); imui.Relative(c); {
					if (im.isFirstRender(c)) {
						imdom.setStyle(c, "backgroundColor", cssVars.bg2);
						imdom.setStyle(c, "padding", padding + "px");
						imdom.setStyle(c, "borderRadius", padding + "px");
					}
					imBegin(c); imui.Absolute(c, padding, PX, padding, PX, 0, NA, 0, NA); {
						if (im.isFirstRender(c)) {
							imdom.setStyle(c, "fontSize", "0.7em");
							imdom.setStyle(c, "fontStyle", "italic");
							imdom.setStyle(c, "whiteSpace", "pre-wrap");
							imdom.setStyle(c, "color", cssVars.fg2);
						}
						imStr(c, block.language);
					} imEnd(c);
					imBegin(c); {
						if (im.isFirstRender(c)) {
							imdom.setStyle(c, "fontFamily", "monospace");
							imdom.setStyle(c, "whiteSpace", "pre-wrap");
						}
						imStr(c, block.code);
					} imEnd(c);
				} imEnd(c);
			} break;
			case bl.B_LIST: {
				im.Switch(c, block.style); {
					const listType = block.style === bl.LS_ORDERED ? el.OL : el.UL;
					imdom.ElBegin(c, listType); {
						im.For(c); for (const item of block.items) {
							imdom.ElBegin(c, el.LI); {
								imRenderBlocksInternal(c, item.blocks, options);
							} imdom.ElEnd(c, el.LI);
						} im.ForEnd(c);
					} imdom.ElEnd(c, listType);
				} im.SwitchEnd(c);
			} break;
			case bl.B_TABLE: {
				const edgeWidth = 1;

				if (im.isFirstRender(c)) {
					imdom.setStyle(c, "border", "1px solid " + cssVars.fg);
				}

				const tableState = im.GetInline(c, bl.parse) ??
					im.Set(c, { maxCols: 0, gridTemplateCols: "" });

				if (im.Memo(c, block)) {
					tableState.maxCols          = 0;
					tableState.gridTemplateCols = "";

					if (block.rows.length > 0) {
						for (const row of block.rows) {
							tableState.maxCols = Math.max(tableState.maxCols, row.cells.length);
						}

						const firstRow = block.rows[0];
						tableState.gridTemplateCols = firstRow.cells
							.map(c => {
								switch (c.style) {
									case bl.TCS_FR:      return "1fr";
									case bl.TCS_CONTENT: return "max-content";;
								}
								return "1fr";
							})
							.join(" ");

					}

					imdom.setStyle(c, "display", "grid");
				}

				if (im.Memo(c, tableState.gridTemplateCols)) {
					imdom.setStyle(c, "display", "grid");
					imdom.setStyle(c, "gridTemplateColumns", tableState.gridTemplateCols);
					imdom.setStyle(c, "backgroundColor", cssVars.fg);
					imdom.setStyle(c, "gap", "1px");
				}

				im.For(c); for (const row of block.rows) { for (let colIdx = 0; colIdx < row.cells.length; colIdx++) {
					imBegin(c, BLOCK); {
						if (im.isFirstRender(c)) {
							imdom.setStyle(c, "padding", "5px");
							imdom.setStyle(c, "backgroundColor", cssVars.bg);
						}

						if (im.If(c) && colIdx < row.cells.length) {
							const cell = row.cells[colIdx];
							imRenderBlocksInternal(c, cell.contents, options);
						} im.IfEnd(c);
					} imEnd(c);
				}} im.ForEnd(c);
			} break;
		} im.SwitchEnd(c);
	} imEnd(c);
}

export function imRenderBlogpostBlockItems(c: ImCache, items: bl.InlineItem[], options: BlogLangRenderOptions) {
	if (im.isFirstRender(c)) {
		imdom.setStyle(c, "lineHeight", "1.4");
	}
	
	im.For(c); for (const item of items) {

		options.imRenderInlineItem(c, item, options);
	} im.ForEnd(c);
}

export function imRenderBlogLangBlockItem(c: ImCache, item: bl.InlineItem, options: BlogLangRenderOptions) {
	im.Switch(c, item.type); switch (item.type) {
		case bl.T_TEXT: imRenderItemText(c, item, options); break;
		case bl.T_CODE: imRenderItemCode(c, item, options); break;
		case bl.T_URL:  imRenderItemUrl(c, item, options); break;
	} im.SwitchEnd(c);
}

export function imRenderItemText(c: ImCache, item: bl.InlineText, options: BlogLangRenderOptions) {
	imBegin(c, INLINE); {
		if (im.isFirstRender(c)) {
			imdom.setStyle(c, "fontStyle", (item.styleFlags & bl.V_ITALIC) ? "italic" : "");
			imdom.setStyle(c, "fontWeight", (item.styleFlags & bl.V_BOLD) ? "bold" : "");
			imdom.setStyle(c, "textDecoration", (item.styleFlags & bl.V_STRIKETHROUGH) ? "line-through" : "");
		}
		imStr(c, item.text);
	} imEnd(c);
}

export function imRenderItemCode(c: ImCache, item: bl.InlineCode, options: BlogLangRenderOptions) {
	imBegin(c, INLINE); {
		if (im.isFirstRender(c)) {
			imdom.setStyle(c, "backgroundColor", cssVars.bg2);
			imdom.setStyle(c, "color", cssVars.fg2);
			imdom.setStyle(c, "fontFamily", "monospace");
			imdom.setStyle(c, "padding", "2px 2px");
			imdom.setStyle(c, "borderRadius", "5px");
		}
		imStr(c, item.code);
	} imEnd(c);
}

function makeUrl(url: string): URL | undefined {
	try {
		return new URL(url);
	} catch (err) {
		try {
			const localPath = window.location.origin + window.location.pathname;
			return new URL(localPath + url);
		} catch (err2) {
			throw err;
		}
	}
}

export function imRenderItemUrl(c: ImCache, item: bl.InlineUrl, options: BlogLangRenderOptions) {
	imItemUrlBegin(c, item, options); {
		imStr(c, item.text);
	} imItemUrlEnd(c);
}

export function imItemUrlBegin(c: ImCache, item: bl.InlineUrl, options: BlogLangRenderOptions) {
	imBegin(c, INLINE); {
		imdom.ElBegin(c, el.A); {
			imButtonStyle(c, false);

			const url = item.url;
			const urlChanged = im.Memo(c, url);
			if (urlChanged) {
				imdom.setAttr(c, "href", url);
				imdom.setAttr(c, "target", "_blank");
				imdom.setAttr(c, "rel", "noopener noreferrer");
			}

		} // imdom.ElEnd(c, el.A);
	} // imEnd
}

export function imItemUrlEnd(c: ImCache) {
	// imBegin
	{
		// imdom.ElBegin(c, el.A); 
		{

			if (im.If(c) && imdom.hasMouseOver(c)) {
				imStr(c, " -> ");
			} im.IfEnd(c);
		} imdom.ElEnd(c, el.A);
	} imEnd(c);
}


export function imHeading(c: ImCache, text: string) {
	imdom.ElBegin(c, el.H2); {
		imStr(c, text);
	} imdom.ElEnd(c, el.H2);
}

export function imSubHeading(c: ImCache, text: string) {
	imdom.ElBegin(c, el.H4); {
		imStr(c, text);
	} imdom.ElEnd(c, el.H4);
}

export function imBegin(c: ImCache, type: DisplayType = BLOCK, align = LEFT, justify = LEFT) {
	const result = imui.Begin(c, type);
	imui.Align(c, align);
	imui.Justify(c, justify);
	return result;
}

export function imHSpace(c: ImCache, col: string = cssVars.bg) {
	imBegin(c, BLOCK); {
		if (im.isFirstRender(c)) {
			imdom.setStyle(c, "width", "10px")
			imdom.setStyle(c, "backgroundColor", col);
		}
	} imEnd(c);
}

export function imHSpaceSmall(c: ImCache, col: string = cssVars.bg) {
	imBegin(c, BLOCK); {
		if (im.isFirstRender(c)) {
			imdom.setStyle(c, "width", "4px")
			imdom.setStyle(c, "backgroundColor", col);
		}
	} imEnd(c);
}

export function imVSpace(c: ImCache, col: string = cssVars.bg) {
	imBegin(c, BLOCK); {
		if (im.isFirstRender(c)) {
			imdom.setStyle(c, "height", "10px")
			imdom.setStyle(c, "backgroundColor", col);
		}
	} imEnd(c);
}

export function imVSpaceSmall(c: ImCache, col: string = cssVars.bg) {
	imBegin(c, BLOCK); {
		if (im.isFirstRender(c)) {
			imdom.setStyle(c, "height", "4px")
			imdom.setStyle(c, "backgroundColor", col);
		}
	} imEnd(c);
}

export function imVDivider(c: ImCache) {
	imBegin(c, BLOCK); {
		if (im.isFirstRender(c)) {
			imdom.setStyle(c, "minHeight", "10px")
		}
	} imEnd(c);
}

export const imEnd = imui.End;
export const imFlex = imui.Flex;
export const imStr = imdom.Str;
export const imStrFmt = imdom.StrFmt;

export function imCodeBegin(c: ImCache) {
	const result = imBegin(c, BLOCK); // Prevent style leaking out
	if (im.isFirstRender(c)) {
		imdom.setStyle(c, "fontFamily", "monospace")
		imdom.setStyle(c, "whiteSpace", "pre")
		imdom.setStyle(c, "tabSize", "4")
		imdom.setStyle(c, "backgroundColor", cssVars.bg2)
	}
	return result;
}

export function imCodeEnd(c: ImCache) {
	imEnd(c);
}

export function imCodeSpanBegin(c: ImCache) {
	const result = imBegin(c, INLINE); { // Prevent style leaking out
		imBegin(c, INLINE); {
			if (im.isFirstRender(c)) {
				imdom.setStyle(c, "fontFamily", "monospace")
				imdom.setStyle(c, "whiteSpace", "pre")
				imdom.setStyle(c, "tabSize", "4")
				imdom.setStyle(c, "background", cssVars.bg2)
			}
		} // imEnd
	} // imEnd

	return result;
}

export function imPre(c: ImCache) {
	if (im.isFirstRender(c)) {
		imdom.setStyle(c, "whiteSpace", "pre")
	}
}

export function imPreWrap(c: ImCache) {
	if (im.isFirstRender(c)) {
		imdom.setStyle(c, "whiteSpace", "pre-wrap")
	}
}

export function imB(c: ImCache) {
	if (im.isFirstRender(c)) imdom.setStyle(c, "fontWeight", "bold");
}

export function imCodeSpanEnd(c: ImCache) {
	imEnd(c);
	imEnd(c);
}

export const imGap = imui.Gap;


