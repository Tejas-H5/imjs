import * as test from "testing";
import * as ld from "line-diff";


test.group("Basic diffing", [], () => {
    const cases: { name: string, before: string, after: string, diff: string }[] = [
        {
            name: "one insert at the start",
            before: `console.log(a)`,
            after: `console.log(b)
console.log(a)`,
            diff: `+console.log(b)
console.log(a)`,
        },
        {
            name: "one insert in the middle",
            before: `console.log(a)
console.log(b)`,
            after: `console.log(a)
console.log(c)
console.log(b)`,
            diff: `console.log(a)
+console.log(c)
console.log(b)`,
        },
        {
            name: "one insert at the end",
            before: `console.log(a)`,
            after: `console.log(a)
console.log(b)`,
            diff: `console.log(a)
+console.log(b)`,
        },

        {
            name: "one remove at the start",
            before: `console.log(b)
console.log(a)`,
            after: `console.log(a)`,
            diff: `-console.log(b)
console.log(a)`,
        },
        {
            name: "one remove in the middle",
            before: `console.log(a)
console.log(c)
console.log(b)`,
            after: `console.log(a)
console.log(b)`,
            diff: `console.log(a)
-console.log(c)
console.log(b)`,
        },
        {
            name: "one remove at the end",
            before: `console.log(a)
console.log(b)`,
            after: `console.log(a)`,
            diff: `console.log(a)
-console.log(b)`,
        },
    ];

    for (const c of cases) {
        test.add(c.name, r => {
            const diff = ld.compute(c.before, c.after);
            const diffStr = ld.toString(diff);
            test.checkEqual(r, diffStr, c.diff);
        });
    }
});
