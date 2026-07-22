import { deepEquals } from "./deep-equals.ts";

// testing.ts v0.0.0

export type Result = {
	name:   string;
	fails:  string[] | undefined;

	isDebugging: boolean;

	// Need some way to verify that something happened at all.
	// But this should be the fast path, so we're not literally logging a bunch of strings for passes.
	checks: number; 
	time: number;

	fn: ((r: Result) => void);
}

export type Group = {
	name:	   string;

	// Only one of the two will ever be set.
	subgroups: Group[] | undefined;
	tests:     Result[] | undefined;

	_fails:  number;
	_checks: number;
	_time:   number;
	_debugging: number;
}

export type Context = {
	groups: Group[];
}

export function newTestingContext(): Context {
	return {
		groups: [],
	};
}

export function check(r: Result, outcome: boolean, message = ""): boolean {
	r.checks += 1;
	if (!outcome) {
		if (!message) {
			message = "check " + r.checks;
		}

		failure(r, "Check failed - " + message);
	}
	return outcome;
}

export function checkEqual(r: Result, a: unknown, b: unknown, message = ""): boolean {
	if (!check(r, a === b, message)) {
		failure(r, `\ngot   : ${JSON.stringify(a)},\nwanted: ${JSON.stringify(b)}\n`);
		return false;
	}
	return true;
}

export function assert(r: Result, outcome: boolean, message: string = ""): asserts outcome {
	if (!check(r, outcome, message)) {
		throw new Error("Test assertion failed");
	}
}

export function assertEqual<T>(r: Result, actual: unknown, expected: T, message: string = ""): asserts actual is T {
	if (!checkEqual(r, actual, expected, message)) {
		throw new Error("Test assertion failed");
	}
}

export function checkDeepEqual(r: Result, a: unknown, b: unknown) {
	const result = deepEquals(a, b);

	if (!check(r, result.mismatches.length === 0)) {
		const message = [`got: ${JSON.stringify(a)} !== expected: ${JSON.stringify(b)}`];
		for (const mismatch of result.mismatches) {
			message.push(`${mismatch.path} - ${mismatch.expected} !== ${mismatch.got}`)
		}
		failure(r, message.join("\n"));
	}
}

export function failure(r: Result, message: string) {
	if (!r.fails) {
		r.fails = [];
	}

	r.fails.push(message);
}

export function add(name: string, fn: ((r: Result) => void), g?: Group) {
	if (!g) g = groups[groups.length - 1];

	if (!g.tests) {
		g.tests = [];
	}

	const test: Result = {
		name,
		fails: undefined,
		checks: 0,
		time: 0,
		fn,
		// easier to grep than a boolean flag, and it works well with table-driven testing too since I can add [deb
		// ug] to the name directly. this allows me to build abstractions like
		// addAllTestCases(r, [ 
		//		{ name: "[deb" + "ug] blah", case: ..., expected: ... },
		// ])
		// Importantly, we don't run any other tests when you've selected some tests for debug.
		// That way, console-logs and breakpoints are guaranteed to be useful.
		// We do a bit of obfuscation here, so that your grep doesn't hit this implementation.
		isDebugging: name.startsWith("[de" + "bug]"), 
	};

	g.tests.push(test);
}

function newGroup(name: string): Group {
	return {
		name:      name,
		subgroups: undefined,
		tests:     undefined,

		_fails:  0,
		_checks: 0,
		_time:   0,
		_debugging: 0,
	};
}

function pushGroup(name: string) {
	const subgroup = newGroup(name);

	if (groups.length > 0) {
		const currentGroup = groups[groups.length - 1];
		if (!currentGroup.subgroups) {
			currentGroup.subgroups = [];
		}
		currentGroup.subgroups.push(subgroup);
	}
	groups.push(subgroup);
	if (groups.length === 1) {
		t.groups.push(subgroup);
	}
}

// _tryingToCover allows us to quickly navigate to what we're trying to cover with a particular higher level test, and
// vice-versa. If you ever remove or change those internal methods, you're documenting which tests you _expect_ to be affected by this.
// It's more useful when the functionality you're covering is not being provided by the functions you call in the test itself.
// Rather than typing the name via a string, inserting the symbol allows the LSP to automatically keep names in sync,
// and notify us when those things get removed from the codebase.
// You can just leave it empty most of the time, but sometimes it's useful to make some symbols easier to navigate to.
export function group(name: string, _tryingToCover: unknown[], registerFn: () => void) {
	pushGroup(name);

	try {
		registerFn();
	} catch(e) {
		throw e;
	} finally {
		groups.pop();
	}
}

const t = newTestingContext();
const groups: Group[] = [];

export function file(name: string, _coveringSymbols: any = null) {
	groups.length = 0;
	pushGroup(name);
}

export function runAll(): Context {
	let hasDebugTests = false;
	{
		const recomputePreRunAggregateStats = (g: Group) => {
			if (g.tests) {
				for (const test of g.tests) {
					if (test.isDebugging) {
						hasDebugTests = true;
						g._debugging += 1;
					}
				}
			}

			if (g.subgroups) {
				for (const subgroup of g.subgroups) {
					recomputePreRunAggregateStats(subgroup);
					g._debugging += subgroup._debugging;
				}
			}
		}

		for (const g of t.groups) {
			recomputePreRunAggregateStats(g);
		}
	}

	const result = runAllInternal(t.groups, hasDebugTests);

	{
		const recomputeResultAggregateStats = (g: Group) => {
			if (g.tests) {
				for (const test of g.tests) {
					if (test.fails) {
						g._fails += test.fails.length;
					}
					g._checks += test.checks;
					g._time   += test.time;
				}
			}
			if (g.subgroups) {
				for (const subgroup of g.subgroups) {
					recomputeResultAggregateStats(subgroup);
					g._fails  += subgroup._fails;
					g._checks += subgroup._checks;
					g._time   += subgroup._time;
				}
			}
		}
		for (const g of t.groups) {
			recomputeResultAggregateStats(g);
		}
	}

	return result;
}

function runAllInternal(groups: Group[], debugOnly: boolean) {
	for (const group of groups) {
		if (!group.tests && !group.subgroups) {
			add("This group didn't have any tests", r => {
				check(r, false, "");
			}, group);
		} 

		if (group.tests) {
			for (const test of group.tests) {
				if (debugOnly && !test.isDebugging) {
					continue;
				}

				// useful for finding infinite loops, not much else.
				// console.log("Running test ", test.name)

				const t0 = performance.now();
				try {
					test.fn(test);
				} catch(e) {
					failure(test, "Runtime error: " + e);
				}
				test.time = performance.now() - t0;

				if (test.checks === 0) {
					failure(test, "This test didn't test anything");
				}
			}
		}

		if (group.subgroups) {
			runAllInternal(group.subgroups, debugOnly);
		}
	}

	return t;
}


function getDisplayableName(name: string): string {
	return name.replace(/\s+/g, " ");
}

export function printResult(test: Result, depth: number, mode: number) {
	if (test.fails) {
		console.log("  ".repeat(depth + 1), "FAIL", getDisplayableName(test.name));
		if (mode !== MODE_FAILING_SUMMARY) {
			for (const fail of test.fails) {
				console.log("  ".repeat(depth + 2), fail);
			}
		}
	} else {
		console.log("  ".repeat(depth + 1), "PASS (" + test.checks + ")", getDisplayableName(test.name));
	}
}

const MODE_ALL             = 0;
const MODE_FAILING         = 1;
const MODE_DEBUGGING       = 2;
const MODE_FAILING_SUMMARY = 3;
const MODE_ALL_PASSING     = 4;

export function printResultsInternal(g: Group, depth: number, mode: number) {
	if ((mode === MODE_FAILING || mode === MODE_FAILING_SUMMARY) && g._fails === 0) {
		return;
	}

	if (mode === MODE_DEBUGGING && g._debugging === 0) {
		return;
	}

	if (g._fails === 0) {
		console.log("  ".repeat(depth), "PASS (" + g._checks + ", " + Math.floor(g._time) + "ms)", getDisplayableName(g.name));
	} else {
		console.log("  ".repeat(depth), "FAIL (" + g._fails + ", " +  Math.floor(g._time) + "ms)", getDisplayableName(g.name));
	}

	if (mode === MODE_FAILING || mode === MODE_FAILING_SUMMARY) {
		if (g.subgroups) {
			for (const sg of g.subgroups) {
				if (sg._fails > 0) {
					printResultsInternal(sg, depth + 1, mode);
				}
			}
		} 
		if (g.tests) {
			for (const test of g.tests) {
				if (test.fails) {
					printResult(test, depth, mode);
				}
			}
		}
	} 
	if (mode === MODE_DEBUGGING) {
		if (g.subgroups) {
			for (const sg of g.subgroups) {
				if (sg._debugging > 0) {
					printResultsInternal(sg, depth + 1, mode);
				}
			}
		} 
		if (g.tests) {
			for (const test of g.tests) {
				if (test.isDebugging) {
					printResult(test, depth, mode);
				}
			}
		}
	}
}

type Accumulator = {
	failingTests: number;
}

export function printResults(results: Context) {
	let mode = MODE_ALL_PASSING;
	let numFails = 0;
	for (const g of results.groups) {
		if (g._fails) {
			numFails += g._fails;
			mode = MODE_FAILING;
		}
		if (g._debugging > 0) {
			mode = MODE_DEBUGGING;
			break;
		}
	}

	if (mode === MODE_FAILING && numFails > 10) {
		mode = MODE_FAILING_SUMMARY;
	}

	if (mode === MODE_DEBUGGING) {
		console.log("Some tests have been isolated for debug:");
	} else if (mode === MODE_FAILING) {
		console.log("Some tests are failing:");
	} else if (mode === MODE_FAILING_SUMMARY) {
		// We do a bit of obfuscation here, so that your grep for de+bug doesn't hit this implementation.
		console.log(`A LOT of tests are failing (${numFails}) - islotate a test for debug by naming it "[${"deb" + "ug"}] ..."`);
	} else if (mode === MODE_ALL_PASSING) {
		console.log("All passing");
	}

	let hasFailures = false;
	for (const g of results.groups) {
		if (g._fails) {
			hasFailures = true;
			break;
		}
	}

	for (const g of results.groups) {
		printResultsInternal(g, 0, mode);
	}
}


