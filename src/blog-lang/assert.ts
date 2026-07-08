/** Alternative names include: onGod(val); frFr(val); noCap(val); noLieDetected(val); */
export function assert(val: boolean): asserts val {
	if (val !== true) {
		throw new Error("Failed");
	}
}
