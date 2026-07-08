import {
	advance,
	compare,
	compareAndAdvance,
	compareAndAdvanceEnd,
	compareAndMaybeAdvance,
	computeStandardString,
	newParser,
	Parser,
	parserPos,
	parseStandardString,
	parseWhitespace,
	reachedEnd,
	reset,
	TextPosition
} from "./parser-utils";

export type BlogPost = {
	blocks: Block[];
}

type BaseItem = {
	type:  number;
	start: TextPosition;
	end:   TextPosition;
};

export type TextBlock = BaseItem & {
	type:       typeof B_TEXT;
	style:      number;
	inlineItems: InlineItem[];
}

export type CodeBlock = BaseItem & {
	type:     typeof B_CODE;
	code:     string;
	language: string;
}

export type ListBlock = BaseItem & {
	type:   typeof B_LIST;
	style:  number;
	items: ListItem[];
};

export type ListItem = {
	blocks: Block[];
};

export type TableBlock = BaseItem & {
	type: typeof B_TABLE;
	rows: TableRow[];
};
export type TableRow = {
	cells: TableCell[];
}
export type TableCell = {
	contents: Block[];
};

export type Block = 
 | TextBlock
 | CodeBlock
 | ListBlock
 | TableBlock
 ;

type BaseInlineItem = BaseItem & {
	styleFlags: number;
};

export type InlineText = BaseInlineItem & {
	type:  typeof T_TEXT;
	text:  string;
};

export type InlineCode = BaseInlineItem & {
	type:  typeof T_CODE;
	code:  string;
};

export type InlineUrl = BaseInlineItem & {
	type:  typeof T_URL;
	text: string;
	url:  string;
};

export type InlineItem = 
 | InlineText
 | InlineCode
 | InlineUrl
 ;

// Block types
export const B_NONE = 0;
export const B_TEXT = 1;
export const B_CODE = 2;
export const B_LIST = 3;
export const B_TABLE = 4;

// Inline Text types
export const T_NONE = 0;
export const T_TEXT = 1;
export const T_URL  = 2;
export const T_CODE = 3;

// Visuals commands
export const V_BOLD          = 1 << 0;
export const V_ITALIC        = 1 << 1;
export const V_STRIKETHROUGH = 1 << 2;

// Block Styles
export const S_NORMAL   = 0;
export const S_HEADING1 = 1;
export const S_HEADING2 = 2;
export const S_HEADING3 = 3;
export const S_QUOTE    = 4;

// List styles
export const LS_UNORDERED = 0;
export const LS_ORDERED   = 1;

// Block type - this value is internal to the parser - 
// it determines what kind of thing we've just stumbled into,
// and is seperate to the block type or style.
// It needs to be mapped to the appropriate type+style combination
const BT_NORMAL   = 0;
const BT_HEADING1 = 1;
const BT_HEADING2 = 2;
const BT_HEADING3 = 3;
const BT_QUOTE    = 4;
const BT_CODE     = 5;
const BT_UNORDERED_LIST = 6;
const BT_ORDERED_LIST   = 7;
const BT_TABLE      = 8;
const BT_TABLE_ROW  = 9;
const BT_TABLE_CELL = 10;

function parseBlockType(parser: Parser, advance: boolean): number {
	let blockType = BT_NORMAL;

		 if (compareAndMaybeAdvance(parser, "# ", advance))   { blockType = BT_HEADING1; }
	else if (compareAndMaybeAdvance(parser, "## ", advance))  { blockType = BT_HEADING2; }
	else if (compareAndMaybeAdvance(parser, "### ", advance)) { blockType = BT_HEADING3; }
	else if (compareAndMaybeAdvance(parser, "> ", advance))   { blockType = BT_QUOTE;    }
	else if (compareAndMaybeAdvance(parser, "```", advance))  { blockType = BT_CODE;     }
	else if (compareAndMaybeAdvance(parser, "#list[", advance))  { blockType = BT_UNORDERED_LIST;  }
	else if (compareAndMaybeAdvance(parser, "#ul[",   advance))  { blockType = BT_UNORDERED_LIST;  }
	else if (compareAndMaybeAdvance(parser, "#ol[",   advance))  { blockType = BT_ORDERED_LIST;  }
	else if (compareAndMaybeAdvance(parser, "#dot", advance))    { blockType = BT_ORDERED_LIST;   }
	else if (compareAndMaybeAdvance(parser, "#table[", advance)) { blockType = BT_TABLE; }
	else if (compareAndMaybeAdvance(parser, "#row", advance))    { blockType = BT_TABLE_ROW; }
	else if (compareAndMaybeAdvance(parser, "#cell", advance))   { blockType = BT_TABLE_CELL; }
	// Heading 4 is never used. Just bold your text at that point.
	
	return blockType;
}

export function parse(markup: string): BlogPost {
	// Let's not deal with line endings in the rest of the code.
	markup = markup.split("\r\n").join("\n");

	const parser = newParser(markup);
	const result: BlogPost = {
		blocks: [],
	};

	const ctx: ParseContext = {};

	parseBlocks(parser, result.blocks, ctx);

	return result;
}

type ParseContext = {
	list?:  ListBlock;
	table?: TableBlock;
};

function parseBlocks(parser: Parser, blocks: Block[], ctx: ParseContext) {
	let parseNext = B_NONE;
	let listStyle = LS_UNORDERED;
	let style     = S_NORMAL;

	let doneBlockList = false;

	outer: while (!reachedEnd(parser) && !doneBlockList) {
		switch(parseNext) {
			case B_NONE: {
				parseWhitespace(parser);

				if (ctx.list) {
					// Advancing will be handled at the list level
					if (compare(parser, "]") || compare(parser, "#dot")) {
						doneBlockList = true;
						break outer;
					}
				}

				if (ctx.table) {
					// Advancing will be handled at the table level
					if (compare(parser, "]") || compare(parser, "#cell") || compare(parser, "#row")) {
						doneBlockList = true;
						break outer;
					}
				}

				parseNext = B_TEXT;
				style = S_NORMAL
				
				const blockType = parseBlockType(parser, true);
				switch(blockType) {
					case BT_NORMAL:   { /* Nothing */ } break;
					case BT_HEADING1: { style = S_HEADING1 } break;
					case BT_HEADING2: { style = S_HEADING2 } break;
					case BT_HEADING3: { style = S_HEADING3 } break;
					case BT_HEADING3: { style = S_HEADING3 } break;
					case BT_QUOTE:    { style = S_QUOTE } break;
					case BT_CODE:     { parseNext = B_CODE } break;
					case BT_UNORDERED_LIST:  { parseNext = B_LIST; listStyle = LS_UNORDERED; } break;
					case BT_ORDERED_LIST:    { parseNext = B_LIST; listStyle = LS_ORDERED; }   break;
					case BT_TABLE:    { parseNext = B_TABLE; } break;
					// NOTE: Could be htat we're dispatching this in the wrong place.
					case BT_TABLE_ROW:  {
						// TODO: Nothing ?
					} break;
					case BT_TABLE_CELL: {
						// TODO: Nothing ?
					} break;
				}
			} break;
			case B_TEXT: {
				parseNext = B_NONE;

				const items = parseInlineTextItems(parser, ctx);
				if (items.length > 0) {
					blocks.push({
						type: B_TEXT,
						style: style,
						start: items[0].start,
						end: items[items.length - 1].end,
						inlineItems: items,
					});
				}
			} break;
			case B_CODE: {
				parseNext = B_NONE;

				let language = parseTextToNextLine(parser);
				const start = parserPos(parser);
				let end: TextPosition | undefined;
				while (!reachedEnd(parser)) {
					end = compareAndAdvanceEnd(parser, "```")
					if (end) {
						break;
					}
					advance(parser);
				}

				if (!end) {
					end = parserPos(parser);
				}

				const code = parser.text.substring(start.i, end.i);
				blocks.push({
					type:     B_CODE,
					start:    start,
					end:      end,
					language: language,
					code:     code,
				});
			} break;
			case B_LIST: {
				parseNext = B_NONE;

				let parseFailed = false;
				const start = parserPos(parser);

				const list: ListBlock = {
					type:   B_LIST,
					start:  start,
					end:    start,
					items:  [],
					style:  listStyle,
				};
				const ctx = { list: list };

				// Parse list items
				while (!reachedEnd(parser)) {
					parseWhitespace(parser);
					if (!compareAndAdvance(parser, "#dot")) {
						if (!compareAndAdvance(parser, "]")) {
							parseFailed = true;
						}
						break;
					}

					const item: ListItem = { blocks: [] };
					list.items.push(item)
					parseBlocks(parser, item.blocks, ctx);
				}

				if (parseFailed) {
					reset(parser, start);
				} else {
					list.end = parserPos(parser);
					blocks.push(list);
				}
			} break;
			case B_TABLE: {
				parseNext = B_NONE;

				let parseFailed = false;
				const start = parserPos(parser);
				const table: TableBlock = {
					type:   B_TABLE,
					start:  start,
					end:    start,
					rows:   [],
				};
				const ctx: ParseContext = { table: table };

				// Parse rows
				while (!reachedEnd(parser)) {
					parseWhitespace(parser);
					if (!compareAndAdvance(parser, "#row")) {
						if (!compareAndAdvance(parser, "]")) {
							parseFailed = true;
						}
						break;
					}

					const row: TableRow = { cells: [] };
					table.rows.push(row);

					// Parse cells
					while (!reachedEnd(parser)) {
						parseWhitespace(parser);
						if (!compareAndAdvance(parser, "#cell")) {
							break;
						}

						const cell: TableCell = { contents: [] };
						row.cells.push(cell);
						parseBlocks(parser, cell.contents, ctx);
					}
				}

				if (parseFailed) {
					reset(parser, start);
				} else {
					table.end = parserPos(parser);
					blocks.push(table);
				}
			} break;
		}
	}
}

function parseTextToNextLine(parser: Parser): string {
	let start = parser.pos.i;

	while (parser.char !== "\n") {
		advance(parser);
	}
	advance(parser);

	return parser.text.substring(start, parser.pos.i - 1);
}


function parseInlineType(parser: Parser, advance: boolean): number {
	let type = T_TEXT;
	     if (compareAndMaybeAdvance(parser, "`", advance))     {type = T_CODE;}
	else if (compareAndMaybeAdvance(parser, "#url[", advance)) {type = T_URL;}

	return type;
}

function parseInlineTextItems(parser: Parser, ctx: ParseContext): InlineItem[] {
	const items: InlineItem[] = [];

	let parseNext        = T_NONE;
	let foundBlockEnd    = false;
	let styleFlags       = 0;

	while (!reachedEnd(parser) && !foundBlockEnd) {
		switch(parseNext) {
			case T_NONE: {
				parseWhitespace(parser);

				foundBlockEnd = false;
				parseNext = parseInlineType(parser, true);
			} break;
			case T_TEXT: {
				parseNext = T_NONE;

				const start = parserPos(parser);
				let end: TextPosition | undefined;
				let trimEnd = false;
				let offset = 0;
				let nextStyleFlags = styleFlags;
				while (!reachedEnd(parser)) {
					end = compareAndAdvanceEnd(parser, "\n\n")
					if(end) {
						foundBlockEnd = true;
						break;
					}

					if (ctx.list || ctx.table) {
						if (compare(parser, "]")) {
							// Advancing will be handled at the block level.
							foundBlockEnd = true;
							trimEnd = true;
							break;
						}
					}

					if (ctx.table) {
						// Advancing will be handled at the table level.
						if (compare(parser, "#cell") || compare(parser, "#row")) {
							foundBlockEnd = true;
							trimEnd = true;
							break;
						}
					}

					// Style commands can end the current inline text (and start a new inline text straight away).
					if (compareAndAdvance(parser, "_")) {
						// Nooo it needs to be parsed like a scope!!1!!1 (nah I don't care tbh)
						nextStyleFlags = setBitFlag(styleFlags, V_ITALIC, !(styleFlags & V_ITALIC));
						offset = 1;
						break;
					} 
					if (compareAndAdvance(parser, "*")) {
						nextStyleFlags = setBitFlag(styleFlags, V_BOLD, !(styleFlags & V_BOLD));
						offset = 1;
						break;
					} 
					if (compareAndAdvance(parser, "~")) {
						nextStyleFlags = setBitFlag(styleFlags, V_STRIKETHROUGH, !(styleFlags & V_STRIKETHROUGH));
						offset = 1;
						break;
					}

					// Other inline items can end the text block
					const i = parser.pos.i;
					parseNext = parseInlineType(parser, true);
					if (parseNext > T_TEXT) {
						offset = parser.pos.i - i;
						break;
					}

					// Other blocks can interrupt text.
					const blockType = parseBlockType(parser, false)
					if (blockType !== 0) {
						foundBlockEnd = true;
						trimEnd = true;
						break;
					}

					advance(parser);
				}

				if (!end) {
					end = parserPos(parser);
				}

				let text = parser.text.substring(start.i, end.i);
				if (trimEnd) {
					text = text.trimEnd();
				}
				if (offset !== 0) {
					text = text.substring(0, text.length - offset);
				}

				if (text.length > 0) {
					items.push({ type: T_TEXT, start: start, end: end, text: text, styleFlags: styleFlags });
				}

				styleFlags = nextStyleFlags;
			} break;
			case T_CODE: {
				parseNext = T_TEXT;

				const start = parserPos(parser);
				let end: TextPosition | undefined;
				let trim = false;
				while (!reachedEnd(parser)) {
					if (parser.char === "\\") {
						// Need to be able to put ` inside of code blocks somehow
						advance(parser);
						advance(parser);
						continue;
					}

					end = compareAndAdvanceEnd(parser, "`")
					if(end) {
						break;
					}

					advance(parser);
				}

				if (!end) {
					end = parserPos(parser);
				}

				let code = parser.text.substring(start.i, end.i);
				if (trim) {
					code = code.trim();
				}

				items.push({ type: T_CODE, start: start, end: end, code: code, styleFlags: styleFlags });
			} break;
			case T_URL: {
				parseNext = T_TEXT;

				const resetPos = parserPos(parser);

				const urlOrText = parseFunctionArgument(parser);
				if (!urlOrText) {
					reset(parser, resetPos);
					parseNext = T_TEXT;
					break;
				}

				const realUrl = parseFunctionArgument(parser);

				let url, text;
				if (realUrl) {
					url  = realUrl.val;
					text = urlOrText.val;
				} else {
					url  = urlOrText.val;
					text = urlOrText.val;
				}

				let end = realUrl?.end ?? urlOrText.end;

				items.push({ type: T_URL, start: resetPos, end: end, text: text, url: url, styleFlags: styleFlags });
			} break;
		}
	}

	return items;
}

type Arg =  {
	start: TextPosition;
	end:   TextPosition;
	val:   string;
}

function parseFunctionArgument(parser: Parser): Arg | undefined {
	parseWhitespace(parser);
	const start = parserPos(parser);

	let end = parseStandardString(parser, "'");
	if (!end) {
		end = parseStandardString(parser, '"');
		if (!end) {
			end = parseStandardString(parser, '`');
		}
	}

	let val: string | undefined;
	if (end) {
		parseWhitespace(parser);
		while(!reachedEnd(parser)) {
			if (compareAndAdvance(parser, ",")) { break; }
			if (compareAndAdvance(parser, "]")) { break; }
			advance(parser);
		}

		val = computeStandardString(parser, start, end);
		val = val.substring(1, val.length - 1)
	} else {
		while(!reachedEnd(parser)) {
			end = compareAndAdvanceEnd(parser, ",") ??
				  compareAndAdvanceEnd(parser, "]");
			if (end) {
				break;
			}
			advance(parser);
		}

		if (!end) {
			return undefined;
		}

		val = parser.text.substring(start.i, end.i);
	}

	if (!val) return undefined;

	return {
		start: start,
		end: end,
		val: val,
	};
}

function setBitFlag(flags: number, mask: number, on: boolean): number {
	let result = flags;

	if (on) {
		result = result | mask;
	} else {
		result = result & (~mask);
	}

	return result;
}
