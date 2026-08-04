export function assert(value: boolean, message: string = "Assertion failed"): asserts value {
    if (value === false) {
        throw new Error(message);
    }
}

