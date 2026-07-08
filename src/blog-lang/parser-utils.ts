export type Parser = {
	text:   string;
	pos:    TextPosition;
	errors: ParseError[];
	char:   string;
}

type ParseError = {
	message: string;
	pos:     TextPosition;
};

export function reportParserError(parser: Parser, error: string) {
	parser.errors.push({
		message: error,
		pos:     parserPos(parser),
	});
}

export function getNumErrors(parser: Parser): number {
	return parser.errors.length;
}

export function hasNewErrors(parser: Parser, prevNumErrors: number): boolean {
	return getNumErrors(parser) > prevNumErrors;
}

export function newParser(code: string): Parser {
	return {
		text: code,
		pos: {
			i:    0,
			line: 0,
			col:  0,
			tabs: 0,
		},
		errors: [],
		char: code[0] ?? " ",
	};
}

export function reachedEnd(r: Parser) {
    return r.pos.i >= r.text.length;
}

export function advanceToNextNewLine(r: Parser) {
    while (advance(r) && r.char !== "\n") { }
}

export function compare(r: Parser, str: string): boolean {
    for (let i = 0; i < str.length; i++) {
        const pos = r.pos.i + i;
        if (pos >= r.text.length)   return false;
        if (r.text[pos] !== str[i]) return false;
    }

    return true;
}

export function compareAndAdvance(r: Parser, str: string): boolean {
	let result = false;

	if (compare(r, str)) {
		advanceBy(r, str.length);
		result = true;
	}

	return result;
}

export function compareAndMaybeAdvance(r: Parser, str: string, advance: boolean) {
	let result;
	if (advance) {
		result = compareAndAdvance(r, str);
	} else {
		result = compare(r, str);
	}
	return result;
}

// Returns the text position _before_ the symbol we matched, if it matched
export function compareAndAdvanceEnd(r: Parser, str: string): TextPosition | undefined {
	let end: TextPosition | undefined;
	if (compare(r, str)) {
		end = parserPos(r);
		advanceBy(r, str.length);
	}
	return end;
}

export function compareWordBoundary(r: Parser, str: string): boolean {
	if (compare(r, str)) {
		const next = r.text[r.pos.i + str.length];
		if (next && isLetter(next)) {
			return false;
		}

		return true;
	}

	return false;
}

export function compareWordBoundaryAndAdvance(r: Parser, str: string): boolean {
	let result = false;

	if (compareWordBoundary(r, str)) {
		advanceBy(r, str.length);
		result = true;
	}

	return result;
}

export function advance(r: Parser): boolean {
	let hasMore = advanceTextPosition(r.pos, r.text);
	updateChar(r);
	return hasMore;
}

function updateChar(r: Parser) {
	if (r.pos.i < 0) {
		r.char = " ";
	} else if (r.pos.i >= r.text.length) {
		r.char = "\n";
	} else {
		r.char = r.text[r.pos.i];
	}
}

export function advanceBy(r: Parser, count: number) {
	for (let i = 0; i < count; i++) {
		advance(r);
	}
}

export function reset(r: Parser, pos: TextPosition) {
	copyTextPosition(r.pos, pos);
	updateChar(r);
}

export function parserPos(r: Parser): TextPosition {
	return cloneTextPosition(r.pos);
}

// Thankyou Trevor https://stackoverflow.com/questions/1496826/check-if-a-single-character-is-a-whitespace
export function isWhitespace(c: string | undefined): boolean {
	return (
		c === " " ||
		c === "\n" ||
		c === "\t" ||
		c === "\r" ||
		c === "\f" ||
		c === "\v" ||
		c === "\u00a0" ||
		c === "\u1680" ||
		c === "\u2000" ||
		c === "\u200a" ||
		c === "\u2028" ||
		c === "\u2029" ||
		c === "\u202f" ||
		c === "\u205f" ||
		c === "\u3000" ||
		c === "\ufeff"
	);
}

export function isLetter(c: string) {
	return c.toUpperCase() != c.toLowerCase() || (c.codePointAt(0) ?? 0) > 127 || c === "_";
}

export function isDigit(c: string) {
	const code = c.charCodeAt(0);
	// ASCII codes for '0' and '9'
	return code >= 48 && code <= 57;
}

export type TextPosition = {
	i:    number;
	line: number;
	col:  number;
	tabs: number;     // we need this to correctly get a screen position, since tabs might have a different size.
};

export function newTextPosition(i: number, line: number, col: number, tabs: number): TextPosition {
	return { i, line, col, tabs: tabs };
}

export function cloneTextPosition(pos: TextPosition): TextPosition {
	return {
		i:    pos.i,
		line: pos.line,
		col:  pos.col,
		tabs: pos.tabs,     // we need this to correctly get a screen position, since tabs might have a different size.
	};
}

export function copyTextPosition(dst: TextPosition, src: TextPosition) {
	dst.i    = src.i;
	dst.line = src.line;
	dst.col  = src.col;
	dst.tabs = src.tabs;
}

// Returns true if we've still got more to go
export function advanceTextPosition(pos: TextPosition, text: string) {
	if (pos.i >= text.length) {
		return false;
	}

	const c = text[pos.i];
	if (c === "\n") {
		pos.line++;
		pos.col = 0;
		pos.tabs = 0;
	} else if (c === "\t") {
		pos.tabs++;
	} else {
		pos.col++;
	}

	pos.i++;

	return true
}

export function parseStandardString(parser: Parser, quoteChar: string): TextPosition | undefined {
	if (!compareAndAdvance(parser, quoteChar)) return undefined;

	const restorePoint = parserPos(parser);

	let foundQuote = false;

	while (!reachedEnd(parser)) {
		if (parser.char === "\\") {
			advance(parser);
			advance(parser);
			continue;
		} 

		if (parser.char === quoteChar) {
			foundQuote = true;
			break;
		}

		advance(parser);
	}
	
	if (foundQuote) {
		const pos = parserPos(parser);
		advance(parser);
		return pos;
	}

	reset(parser, restorePoint);

	return undefined;
}

export function computeStandardString(parser: Parser, start: TextPosition, end: TextPosition): string {
	const chars: string[] = [];

	for (let i = start.i + 1; i < end.i; i++) {
		let val = parser.text[i];
		if (val === "\\") {
			i++;
			if (i === end.i) {
				break;
			}
			val = parser.text[i];
		}
		chars.push(val);
	}

	return chars.join("");
}

export function parseWhitespace(parser: Parser) {
	while (!reachedEnd(parser)) {
		if (!isWhitespace(parser.char)) {
			break;
		}
		advance(parser);
	}
}

