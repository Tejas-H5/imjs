// A very minimal function that converts TypeScript to JavaScript
// that will work specifically just for the code that I've written in 
// the examples on this website. 
// It won't work in production on your site - but it only needs to 
// work for the specific examples I've created here!

export type CompileResult = {
	javaScript: string;
	values: Record<string, any>;

	// useful for debugging purposes
	error?: Error;
	codeGenCode: string;
}

export type Module = {
	namespace?: string;
	env: Record<string, any>;
}

function skipTypeExpression(tsCode: string, pos: number): number {
	let i = pos;
	i++;

	const nextPos = toNonWhitespace(tsCode, i)
	if  (!isLetter(tsCode[nextPos])) {
		return pos;
	}
	i = nextPos;

	if (
		compare(tsCode, i, "null") ||
		compare(tsCode, i, "undefined") ||
		compare(tsCode, i, "true") ||
		compare(tsCode, i, "false") ||
		compare(tsCode, i, "Math.")
	) {
		return pos;
	}

	while (i < tsCode.length && isLetter(tsCode[nextPos])) {
		i = toNonIdentifier(tsCode, i);
		i = toNonWhitespace(tsCode, i);

		if (tsCode[i] !== ".") {
			break;
		}

		if (tsCode[i] !== "(") {
			// This is a function call. Not a type at all :D false alarm guys. All this tarversal for null? or was it undefined? void 0?
			return pos;
		}

		i++;
	}

	if (compare(tsCode, i, "<")) {
		let openChevrons = 1;
		i++;
		while (i < tsCode.length && openChevrons > 0) {
			if (tsCode[i] === "<") {
				openChevrons++;
			} else if (tsCode[i] === ">") {
				openChevrons--;
			}
			i++;
		}
	}

	i = toNonWhitespace(tsCode, i);

	while (compare(tsCode, i, "|")) {
		i++;
		i = skipTypeExpression(tsCode, i + 1);
		i = toNonWhitespace(tsCode, i);
	}

	return i;
}

export function transform(tsCode: string, modules: Module[]): CompileResult {
	const sb: string[] = [];

	let i = 0;
	while (i < tsCode.length) {
		if (compare(tsCode, i, "//")) {
			i = toNewline(tsCode, i);
		} else if (compare(tsCode, i, "import ")) {
			i = toNewline(tsCode, i);
		} else if (compare(tsCode, i, ":")) {
			i = skipTypeExpression(tsCode, i);
			i = toNonWhitespace(tsCode, i);
		} else if (compare(tsCode, i, " as ")) {
			i += " as ".length;
			i = toNonWhitespace(tsCode, i);
			i = skipTypeExpression(tsCode, i);
		} else if (compare(tsCode, i, "{")) {
			// Mainly to avoid having to parse expressions.
			const iPrev = toNonWhitespacePrev(tsCode, i - 1);
			if (
				comparePrev(tsCode, i, "({") ||
				comparePrev(tsCode, iPrev, "return")
			) {
				const start = i;

				i = skipObject(tsCode, i);
				const end = i;
				const skippedText = tsCode.substring(start, end);
				sb.push(skippedText);
				console.log("skipping object", skippedText);
			}
		} else if (compare(tsCode, i, "case ")) {
			const start = i;
			while (i < tsCode.length && tsCode[i] !== ":") {
				i++;
			}
			i++;

			sb.push(tsCode.substring(start, i));
		}

		sb.push(tsCode[i]);
		i++;
	}

	let code = sb.join("");

	const functionNames: string[] = [];
	for (const match of code.matchAll(/function (\w+)/g)) {
		functionNames.push(match[1]);
	}

	const moduleArgs = modules
		.map(m => m.namespace ?? `{ ${
			Object
				.keys(m.env)
				.map(key => functionNames.includes(key) ? `${key}: ${key}Imported` : key)
				.join(", ")
		} }`)
		.join(",");

	const codeGenCode = 
`return ((${moduleArgs}) => {
	${code}
	return {${functionNames.join(", ")}};
})`

	try {
		const codeGenFn = new Function(codeGenCode)();
		const values    = codeGenFn(...modules.map(m => m.env));
		return {
			javaScript: code,
			values: values,
			codeGenCode: codeGenCode,
		};
	} catch (err) {
		console.error(err, codeGenCode, modules.map(m => m.env));
		return {
			javaScript: "<error>",
			values: {},
			codeGenCode: codeGenCode,
			error: err instanceof Error ? err : new Error("" + err),
		};
	}
}

function toNewline(code: string, i: number): number {
	while (i < code.length && code[i] !== "\n") {
		i++;
	}
	return i;
}

function toNonWhitespace(code: string, i: number): number {
	while (i < code.length && isWhitespace(code[i])) {
		i++;
	}
	return i;
}

function toNonWhitespacePrev(code: string, i: number): number {
	while (i >= 0 && isWhitespace(code[i])) {
		i--;
	}
	return i;
}

function toNonIdentifier(code: string, i: number): number {
	while (i < code.length && (isLetter(code[i]) || isDigit(code[i]))) {
		i++;
	}
	return i;
}

function compare(code: string, pos: number, query: string): boolean {
	if (pos < 0) {
		return false;
	}

	if (pos + query.length > code.length) {
		return false;
	}

	for (let i = 0; i < query.length; i++) {
		if (code[pos + i] !== query[i]) {
			return false;
		}
	}

	return true;
}

function comparePrev(code: string, pos: number, query: string): boolean {
	return compare(code, pos - query.length + 1, query);
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
    const code = c.charCodeAt(0);
	if (65 <= code && code < 91) {
		// A-Z
		return true;
	}
	if (97 <= code && code < 123) {
		// a-z
		return true;
	}
	return false;
}

export function isDigit(c: string) {
	const code = c.charCodeAt(0);
	// ASCII codes for '0' and '9'
	return code >= 48 && code <= 57;
}

function skipObject(tsCode: string, i: number): number {
	if (tsCode[i] !== "{") {
		return i;
	}

	i++;
	let brackets = 1;

	while (i < tsCode.length && brackets > 0) {
		if (tsCode[i] === "{") {
			brackets += 1;
		} else if (tsCode[i] === "}") {
			brackets -= 1;
		}
		i++;
	}

	return i;
}
