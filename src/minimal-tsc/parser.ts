// A very minimal function that converts TypeScript to JavaScript
// that will work specifically just for the code that I've written in 
// the examples on this website. It won't work in production on your site!

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

export function transform(tsCode: string, modules: Module[]): CompileResult {
	const sb: string[] = [];

	let i = 0;
	while (i < tsCode.length) {
		if (compare(tsCode, i, "import ")) {
			i = toNewline(tsCode, i);
		} else if (compare(tsCode, i, ":")) {
			const nextPos = toNonWhitespace(tsCode, i + 1)

			if  (isLetter(tsCode[nextPos])) {
				i = toNonIdentifier(tsCode, nextPos);
			}
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
		.map(m => m.namespace ?? `{ ${Object.keys(m.env).join(", ")} }`)
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

function toNonIdentifier(code: string, i: number): number {
	while (i < code.length && (isLetter(code[i]) || isDigit(code[i]))) {
		i++;
	}
	return i;
}

function compare(code: string, pos: number, query: string): boolean {
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
