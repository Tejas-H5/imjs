import { ImCache, imMemo, isFirstishRender } from "src/utils/im-core";
import { EL_TEXTAREA, elSetAttr, elSetClass, elSetStyle, elSetTextSafetyRemoved, imElBegin, imElEnd } from "src/utils/im-dom";
import { BLOCK, imLayoutBegin, imLayoutEnd, INLINE, cssVars, newCssBuilder, imHandleLongWords, imRelative, imSize, PERCENT, NA } from "./ui-core";
import { setInputValue } from "./dom-utils";

export function getLineBeforePos(text: string, pos: number): string {
    const i = getLineStartPos(text, pos);
    return text.substring(i, pos);
}

export function getLineStartPos(text: string, pos: number): number {
    let i = pos;
    if (text[i] === "\r" || text[i] === "\n") {
        i--;
    }

    for (; i > 0; i--) {
        if (text[i] === "\r" || text[i] === "\n") {
            i++
            break;
        }
    }

    if (pos < i) {
        return 0;
    }

    return i;
}

export function newTextArea(initFn?: (el: HTMLTextAreaElement) => void): HTMLTextAreaElement {
    const textArea = document.createElement("textarea");

    initFn?.(textArea);

    return textArea
}

const cssb = newCssBuilder();

const cnTextAreaRoot = cssb.newClassName("customTextArea");
cssb.s(`
.${cnTextAreaRoot} textarea { 
    white-space: pre-wrap; 
    padding: 5px; 
    caret-color: ${cssVars.fg};
    color: transparent;
}
.${cnTextAreaRoot}:has(textarea:focus), .${cnTextAreaRoot}:has(textarea:hover) { 
    background-color: ${cssVars.bg2};
}
`);


export type TextAreaArgs = {
    value: string;
    isOneLine?: boolean;
    placeholder?: string;
};

// My best attempt at making a text input with the layout semantics of a div.
// NOTE: this text area has a tonne of minor things wrong with it. we should fix them at some point.
//   - When I have a lot of empty newlines, and then click off, the empty lines go away 'as needed' 
export function imTextAreaBegin(c: ImCache, {
    value,
    isOneLine,
    placeholder = "",
}: TextAreaArgs) {
    let textArea: HTMLTextAreaElement;

    const root = imLayoutBegin(c, BLOCK); {
        if (isFirstishRender(c)) {
            elSetStyle(c, "display",   "flex");
            elSetStyle(c, "flex",      "1");
            elSetStyle(c, "height",    "100%");
            elSetStyle(c, "overflowY", "auto");
            elSetClass(c, cnTextAreaRoot);
        }

        // This is now always present.
        imLayoutBegin(c, BLOCK); imHandleLongWords(c); imRelative(c); imSize(c, 100, PERCENT, 0, NA); {
            if (isFirstishRender(c)) {
                elSetStyle(c, "height", "fit-content");
            }

            if (imMemo(c, isOneLine)) {
                elSetStyle(c, "whiteSpace", isOneLine ? "nowrap" : "pre-wrap");
                elSetStyle(c, "overflow", isOneLine ? "hidden" : "");
            }

            // This is a facade that gives the text area the illusion of auto-sizing!
            // but it only works if the text doesn't end in whitespace....
            imLayoutBegin(c, INLINE); {
                const placeholderChanged = imMemo(c, placeholder);
                const valueChanged = imMemo(c, value);
                if (placeholderChanged || valueChanged) {
                    if (!value) {
                        elSetTextSafetyRemoved(c, placeholder);
                        elSetStyle(c, "color", cssVars.fg2);
                    } else {
                        elSetTextSafetyRemoved(c, value);
                        elSetStyle(c, "color", cssVars.fg);
                    }
                }
            } imLayoutEnd(c);

            // This full-stop at the end of the text is what prevents the text-area from collapsing in on itself
            imLayoutBegin(c, INLINE); {
                if (isFirstishRender(c)) {
                    elSetStyle(c, "color", "transparent");
                    elSetStyle(c, "userSelect", "none");
                    elSetTextSafetyRemoved(c, ".");
                }
            } imLayoutEnd(c);

            textArea = imElBegin(c, EL_TEXTAREA).root; {
                if (isFirstishRender(c)) {
                    elSetStyle(c, "all", "unset");
                    elSetStyle(c, "position", "absolute");
                    elSetStyle(c, "top", "0");
                    elSetStyle(c, "left", "0");
                    elSetStyle(c, "bottom", "0");
                    elSetStyle(c, "right", "0");
                    elSetStyle(c, "whiteSpace", "pre-wrap");
                    elSetStyle(c, "width", "100%");
                    elSetStyle(c, "height", "100%");
                    elSetStyle(c, "backgroundColor", "rgba(0, 0, 0, 0)");
                    elSetStyle(c, "color", "rgba(0, 0, 0, 0)");
                    elSetStyle(c, "overflowY", "hidden");
                    elSetStyle(c, "padding", "0");
                }

                if (imMemo(c, value)) {
                    // don't update the value out from under the user implicitly
                    setInputValue(textArea, value);
                }

            } // imElEnd(c, EL_TEXTAREA);
        } // imLayoutEnd(c);

        // TODO: some way to optionally render other stuff hereYou can now render your own overlays here.
    } // imLayoutEnd(c);


    return [root, textArea] as const;
}

export function imTextAreaEnd(c: ImCache) {
    {
        {
            {
            } imElEnd(c, EL_TEXTAREA);
        } imLayoutEnd(c);
    } imLayoutEnd(c);
}



export type EditableTextAreaConfig = {
    useSpacesInsteadOfTabs?: boolean;
    tabStopSize?: number;
};

// Use this in a text area's "keydown" event handler
export function doExtraTextAreaInputHandling(
    e: KeyboardEvent,
    textArea: HTMLTextAreaElement,
    config: EditableTextAreaConfig
): boolean {
    const execCommand = document.execCommand.bind(document);

    // HTML text area doesn't like tabs, we need this additional code to be able to insert tabs (among other things).
    // Using the execCommand API is currently the only way to do this while perserving undo, 
    // and I won't be replacing it till there is really something better.
    const spacesInsteadOfTabs = config.useSpacesInsteadOfTabs ?? false;
    const tabStopSize = config.tabStopSize ?? 4;

    let text = textArea.value;
    const start = textArea.selectionStart;
    const end = textArea.selectionEnd;

    let handled = false;

    const getSpacesToRemove = (col: string) => {
        if (!config.useSpacesInsteadOfTabs) {
            return 1;
        }

        // if this bit has tabs, we can't do shiet
        if (![...col].every(c => c === " ")) {
            return 1;
        }

        // seems familiar, because it is - see the tab stop computation below
        let spacesToRemove = (col.length % tabStopSize)
        if (spacesToRemove === 0) {
            spacesToRemove = tabStopSize;
        }
        if (spacesToRemove > col.length) {
            spacesToRemove = col.length;
        }

        return spacesToRemove;
    }

    const getIndentation = (col: string): string => {
        if (!spacesInsteadOfTabs) {
            return "\t";
        }

        const numSpaces = tabStopSize - (col.length % tabStopSize);
        return " ".repeat(numSpaces);
    }

    if (e.key === "Backspace" && !e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        if (start === end) {
            const col = getLineBeforePos(text, start);

            const spacesToRemove = getSpacesToRemove(col);
            if (spacesToRemove) {
                e.preventDefault();
                for (let i = 0; i < spacesToRemove; i++) {
                    execCommand("delete", false, undefined);
                    handled = true;
                }
            }
        }
    } else if (e.key === "Tab" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (e.shiftKey) {
            e.preventDefault();

            let newStart = start;
            let newEnd = end;

            // iterating backwards allows us to delete text while iterating, since indices won't be shifted.
            let i = end;
            while (i >= start) {
                const col = getLineBeforePos(text, i);
                if (col.length === 0) {
                    i--;
                    continue;
                }

                const numNonWhitespaceAtColStart = col.trimStart().length;
                const pos = i - numNonWhitespaceAtColStart;
                textArea.selectionStart = pos;
                textArea.selectionEnd = pos;

                // de-indent by the correct amount.
                {
                    const col2 = col.substring(0, col.length - numNonWhitespaceAtColStart);
                    const spacesToRemove = getSpacesToRemove(col2);
                    for (let i = 0; i < spacesToRemove; i++) {
                        // cursor implicitly moves back 1 for each deletion.
                        execCommand("delete", false, undefined);
                        handled = true;
                        newEnd--;
                    }
                }

                i -= col.length;
            }

            textArea.selectionStart = newStart;
            textArea.selectionEnd = newEnd;
        } else {
            if (start === end) {
                const col = getLineBeforePos(text, start);
                const indentation = getIndentation(col);
                e.preventDefault();
                execCommand("insertText", false, indentation);
                handled = true;
            } else {
                e.preventDefault();

                let newStart = start;
                let newEnd = end;

                // iterating backwards allows us to delete text while iterating, since indices won't be shifted.
                let i = end;
                while (i >= start) {
                    const col = getLineBeforePos(text, i);
                    if (col.length === 0) {
                        i--;
                        continue;
                    }

                    const numNonWhitespaceAtColStart = col.trimStart().length;
                    const pos = i - numNonWhitespaceAtColStart;

                    // indent by the correct amount.
                    const col2 = col.substring(0, col.length - numNonWhitespaceAtColStart);
                    const indentation = getIndentation(col2);
                    textArea.selectionStart = pos;
                    textArea.selectionEnd = pos;

                    execCommand("insertText", false, indentation);
                    handled = true;
                    newEnd += indentation.length;

                    i -= col.length;
                }

                textArea.selectionStart = newStart;
                textArea.selectionEnd = newEnd;

            }
        }
    } else if (e.key === "Escape" && !e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey && start !== end) {
        handled = true;
        e.stopImmediatePropagation();
        textArea.selectionEnd = textArea.selectionStart;
    }

    return handled;
}

