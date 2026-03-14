import path from 'node:path';
import fs from 'node:fs/promises';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const BASE_DIR   = path.join(__dirname, "../");

for await (const file of fs.glob("**/*.ts", { cwd: BASE_DIR })) {
	if (file.includes("node_modules")) continue;
	if (file.includes("migrate")) continue;

	const filePath = path.join(BASE_DIR, file);

	let newText = await fs.readFile(filePath, { encoding: "utf-8" });

	if (!filePath.includes("im-core")) {
		newText = newText
			.replace(/\bimCacheBegin\b/g, "im.CacheBegin")
			.replace(/\bimCacheEnd\b/g, "im.CacheEnd")
			.replace(/\bimGetInline\b/g, "im.GetInline")
			.replace(/\bimSet\b/g, "im.Set")
			.replace(/\bimGet\b/g, "im.Get")
			.replace(/\bimState\b/g, "im.State")
			.replace(/\bimMemo\b/g, "im.Memo")
			.replace(/\bimIf\b/g, "im.If")
			.replace(/\bimIfElse\b/g, "im.IfElse")
			.replace(/\bimElse\b/g, "im.Else")
			.replace(/\bimIfEnd\b/g, "im.IfEnd")
			.replace(/\bimKeyedBegin\b/g, "im.KeyedBegin")
			.replace(/\bimKeyedEnd\b/g, "im.KeyedEnd")
			.replace(/\bimSwitch\b/g, "im.Switch")
			.replace(/\bimSwitchEnd\b/g, "im.SwitchEnd")
			.replace(/\bimTry\b/g, "im.Try")
			.replace(/\bimCatch\b/g, "im.Catch")
			.replace(/\bimTryEnd\b/g, "im.TryEnd")
			.replace(/\bimCatch\b/g, "im.Catch")
			.replace(/\bimTryCatch\b/g, "im.Catch")
			.replace(/\bimFor\b/g, "im.For")
			.replace(/\bimForEnd\b/g, "im.ForEnd")
			.replace(/\bimImmediateModeBlockBegin\b/g, "im.ImmediateModeBlockBegin")
			.replace(/\bimImmediateModeBlockEnd\b/g, "im.ImmediateModeBlockEnd")
			.replace(/\bimForEachCacheEntryItem\b/g, "im.ForEachCacheEntryItem")
			.replace(/\bisSetRequired\b/g, "im.isSetRequired")
			.replace(/\bgetEntryAt\b/g, "im.getEntryAt")
			.replace(/\bisEventRerender\b/g, "im.isEventRerender")
			.replace(/\bgetCurrentCacheEntries\b/g, "im.getCurrentCacheEntries")
			.replace(/\bREMOVE_LEVEL_NONE\b/g, "im.REMOVE_LEVEL_NONE")
			.replace(/\bREMOVE_LEVEL_DETATCHED\b/g, "im.REMOVE_LEVEL_DETATCHED")
			.replace(/\bREMOVE_LEVEL_DESTROYED\b/g, "im.REMOVE_LEVEL_DESTROYED")
			.replace(/\bgetEntriesRemoveLevel\b/g, "im.getEntriesRemoveLevel")
			.replace(/\bgetRootEntries\b/g, "im.getRootEntries")
			.replace(/\bisFirstishRender\b/g, "im.isFirstishRender")
			.replace(/\bgetDeltaTimeSeconds\b/g, "im.getDeltaTimeSeconds")
			.replace(/\bMEMO_NOT_CHANGED\b/g, "im.MEMO_NOT_CHANGED")
			.replace(/\bMEMO_CHANGED\b/g, "im.MEMO_CHANGED")
			.replace(/\bMEMO_FIRST_RENDER\b/g, "im.MEMO_FIRST_RENDER")
			.replace(/\bMEMO_FIRST_RENDER_CONDITIONAL\b/g, "im.MEMO_FIRST_RENDER_CONDITIONAL")
			.replace(/\bnewCache\b/g, "im.newCache")
			.replace(/\bonImmediateModeBlockDestroyed\b/g, "im.onImmediateModeBlockDestroyed")
			.replace(/\bgetEntriesIsInConditionalPathway\b/g, "im.getEntriesIsInConditionalPathway")
			.replace(/\brerenderCache\b/g, "im.rerenderCache")
			.replace(/\brecursivelyEnumerateEntries\b/g, "im.recursivelyEnumerateEntries")
			.replace(/\bgetEntriesParent\b/g, "im.getEntriesParent")
			.replace(/\bgetEntriesParentFromEntries\b/g, "im.getEntriesParentFromEntries")
			.replace(/\bgetFpsCounterState\b/g, "im.getFpsCounterState")
			.replace(/\bgetItemsIterated\b/g, "im.getItemsIterated")
			.replace(/\bgetTotalMapEntries\b/g, "im.getTotalMapEntries")
			.replace(/\bgetTotalDestructors\b/g, "im.getTotalDestructors")
			.replace(/\bgetStackLength\b/g, "im.getStackLength")
			.replace(/\bgetRenderCount\b/g, "im.getRenderCount")
			.replace("", "")
			.replace(/\bim\.Get\(c, inlineTypeId\((.+?)\)\)/g, "im.GetInline(c, $1)");
	}

	if (!filePath.includes("im-dom")) {
		newText = newText
			.replace(/\bimDomRootBegin\b/g, "imdom.RootBegin")
			.replace(/\bimDomRootEnd\b/g, "imdom.RootEnd")
			.replace(/\bimElBegin\b/g, "imdom.ElBegin")
			.replace(/\bimElEnd\b/g, "imdom.ElEnd")
			.replace(/\bimElSvgBegin\b/g, "imdom.ElSvgBegin")
			.replace(/\bimElSvgEnd\b/g, "imdom.ElSvgEnd")
			.replace(/\bimStr\b/g, "imdom.Str")
			.replace(/\bimStrFmt\b/g, "imdom.StrFmt")
			.replace(/\bimStr\b/g, "imdom.Text")
			.replace(/\bimStrFmt\b/g, "imdom.TextFmt")
			.replace(/\bimDomRootExistingBegin\b/g, "imdom.RootExistingBegin")
			.replace(/\bimDomRootExistingEnd\b/g, "imdom.RootExistingEnd")
			.replace(/\bimFinalizeDeferred\b/g, "imdom.FinalizeDeferred")
			.replace(/\bimOn\b/g, "imdom.On")
			.replace(/\bimTrackSize\b/g, "imdom.TrackSize")
			.replace(/\bimTrackVisibility\b/g, "imdom.TrackVisibility")
			.replace(/\bimPreventScrollEventPropagation\b/g, "imdom.PreventScrollEventPropagation")
			.replace(/\bimGlobalEventSystemBegin\b/g, "imdom.GlobalEventSystemBegin")
			.replace(/\bimGlobalEventSystemEnd\b/g, "imdom.GlobalEventSystemEnd")
			.replace(/\bnewDomAppender\b/g, "imdom.newDomAppender")
			.replace(/\belGetAppender\b/g, "imdom.getAppender")
			.replace(/\belGet\b/g, "imdom.getElement")
			.replace(/\bFINALIZE_IMMEDIATELY\b/g, "imdom.FINALIZE_IMMEDIATELY")
			.replace(/\bFINALIZE_DEFERRED\b/g, "imdom.FINALIZE_DEFERRED")
			.replace(/\belSetStyle\b/g, "imdom.setStyle")
			.replace(/\belSetClass\b/g, "imdom.setClass")
			.replace(/\belSetAttr\b/g, "imdom.setAttr")
			.replace(/\belSetTextSafetyRemoved\b/g, "imdom.setTextUnsafe")
			.replace(/\bgetGlobalEventSystem\(\).mouse\b/g, "imdom.getMouse()")
			.replace(/\bgetGlobalEventSystem\(\).keyboard.keys\b/g, "imdom.getKeyboard()")
			.replace(/\bgetGlobalEventSystem\(\).keyboard\b/g, "imdom.getKeyboard()")
			.replace(/\belHasMousePress\b/g, "imdom.hasMousePress")
			.replace(/\belHasMouseUp\b/g, "imdom.hasMouseUp")
			.replace(/\belHasMouseClick\b/g, "imdom.hasMouseClick")
			.replace(/\belHasMouseOver\b/g, "imdom.hasMouseOver")
			.replace(/\bisKeyPressed\b/g, "imdom.isKeyPressed")
			.replace(/\bisKeyRepeated\b/g, "imdom.isKeyRepeated")
			.replace(/\bisKeyPressedOrRepeated\b/g, "imdom.isKeyPressedOrRepeated")
			.replace(/\bisKeyReleased\b/g, "imdom.isKeyReleased")
			.replace(/\bisKeyHeld\b/g, "imdom.isKeyHeld")
			.replace(/\bisLetterPressed\b/g, "imdom.isLetterPressed")
			.replace(/\bisLetterRepeated\b/g, "imdom.isLetterRepeated")
			.replace(/\bisLetterPressedOrRepeated\b/g, "imdom.isLetterPressedOrRepeated")
			.replace(/\bisLetterReleased\b/g, "imdom.isLetterReleased")
			.replace(/\bisLetterHeld\b/g, "imdom.isLetterHeld")
			.replace(/\bnewImGlobalEventSystem\b/g, "imdom.newImGlobalEventSystem")
			.replace(/\bnewKeysState\b/g, "imdom.newKeysState")
			.replace(/\bgetNormalizedKey\b/g, "imdom.getNormalizedKey")
			.replace(/\b: Key\b/g, ": NormalizedKey")
			.replace(/\bKey;/g, "NormalizedKey;")
			.replace(/\bEL_SVG_/g, "elsvg.")
			.replace(/\bEL_/g, "el.")
			.replace(/\bEV_/g, "ev.")
	}

	newText = newText
		.replace(/(im\.)+/g, "im.")
		.replace(/(imdom\.)+/g, "imdom.");

	newText = replaceBetween(newText, "import ", "im-core\";", `import { im, ImCache, imdom, el, ev, } from "src/utils/im-js";`);
	newText = replaceBetween(newText, "import ", "im-dom\";", ``);
	newText = replaceBetween(newText, "import ", "key-state\";", ``);

	await fs.writeFile(filePath, newText);

	console.log("Updated " + file);
}

function replaceBetween(text: string, from: string, to: string, replacement: string): string {
	const idx = text.indexOf(to);
	if (idx === -1) return text;

	const fromIdx = text.lastIndexOf(from, idx);
	if (fromIdx === -1) return text;

	return text.substring(0, fromIdx) + replacement + text.substring(idx + to.length);
}
