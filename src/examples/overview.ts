import { assert } from "assert";
import * as bl from "blog-lang";
import { el, ev, im, ImCache, ImCacheRerenderFn, imdom } from "im-js";
import { BLOCK, cssVars, imui } from "im-ui";
import { BlogLangRenderOptions, defaultBlogLangRenderOptions, imRenderBlogLangBlock, imRenderBlogLangMarkup } from "im-ui/components/im-blog-lang-viewer";
import * as tsc from "minimal-tsc";
import { imVisualTestInstallation, TEST_CENTERED, VisualTestHarnessState } from "visual-testing-harness";

import { imBaseContainerBegin, imBaseContainerEnd } from "./common";
import OVERVIEW from "./overview.md";

export function imJsCompleteOverview(c: ImCache, harness: VisualTestHarnessState) {
    const renderOptions = im.GetInline(c, imJsCompleteOverview) ?? im.Set(c, {
        ...defaultBlogLangRenderOptions,
        imRenderBlock: imRenderBlockCustom
    });
    renderOptions.userPtr = harness;

    imBaseContainerBegin(c); {
        imRenderBlogLangMarkup(c, OVERVIEW, 0, renderOptions);
    } imBaseContainerEnd(c);
}

type InlineTest = {
    originalTypescript:  string;
    compiledJavascript: string;
    renderFn:           ImCacheRerenderFn;
    name: string;
};

function imCodeBlock(c: ImCache, code: string) {
    imui.Begin(c, BLOCK); {
        if (im.isFirstRender(c)) {
            imdom.setStyle(c, "fontFamily", "monospace");
            imdom.setStyle(c, "whiteSpace", "pre-wrap");
        }

        imdom.Str(c, code);
    } imui.End(c);
}


function imDivBegin(c: ImCache) {
    return imdom.ElBegin(c, el.DIV);
}

function imDivEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}

const imStr = imdom.Str;

function imExampleButtonIsClicked(c: ImCache, text: string): MouseEvent | null {
    let result: MouseEvent | null = null;
    imdom.ElBegin(c, el.BUTTON); {
        result = imdom.On(c, ev.MOUSEDOWN);
        imdom.Str(c, text);
    } imdom.ElEnd(c, el.BUTTON);
    return result;
}

function inlineTestFromCodeBlock(code: string, language: string): InlineTest {
    const transformResult = tsc.transform(code, [
        { namespace: "im",      env: im },
        { namespace: "imdom",   env: imdom },
        { namespace: "el",      env: el },
        { namespace: "ev",      env: ev },
        { namespace: "imui",    env: imui },
        { namespace: "cssVars", env: cssVars },
        { env: {
            assert: assert,
            imDivBegin: imDivBegin, imDivEnd: imDivEnd, 
            imExampleButtonIsClicked: imExampleButtonIsClicked,
            imStr: imStr,
        }}
    ]);

    const firstMethod = Object.values(transformResult.values)[0] ?? undefined;
    console.log(transformResult.values);

    return {
        name: language.substring("ts - ".length),
        originalTypescript: code,
        compiledJavascript: transformResult.javaScript,
        renderFn: (c) => {
            if (im.If(c) && transformResult.error) {
                imui.Begin(c, BLOCK); {
                    imdom.Str(c, "An error has occured during compilation");
                } imui.End(c);
                imCodeBlock(c, transformResult.codeGenCode);
                imui.Begin(c, BLOCK); {
                    imdom.Str(c, transformResult.error);
                } imui.End(c);
            } else { 
                im.Else(c)
                
                const tryState = im.Try(c); try {
                    if (im.If(c) && tryState.err) {
                        imui.Begin(c, BLOCK); {
                            imdom.Str(c, "An error has occured at runtime:");
                        } imui.End(c);
                        imui.Begin(c, BLOCK); {
                            imdom.Str(c, tryState.err);
                        } imui.End(c);

                        const state = im.GetInline(c, inlineTestFromCodeBlock) ??
                                im.Set(c, { isUndefinedError: false });

                        if (im.Memo(c, tryState.err)) {
                            state.isUndefinedError = false;
                            if (tryState.err instanceof Error) {
                                if (tryState.err.message.endsWith("is not defined")) {
                                    state.isUndefinedError = true;
                                }
                            }
                        }

                        if (im.If(c) && state.isUndefinedError) {
                            imui.Begin(c, BLOCK); {
                                imCodeBlock(c, transformResult.javaScript);
                            } imui.End(c);
                        } im.IfEnd(c);
                    } else { im.Else(c);
                        firstMethod(c);
                    } im.IfEnd(c);
                } catch(err) {
                    im.Catch(c, tryState, err);
                } im.TryEnd(c, tryState);
            } im.IfEnd(c);
        }
    };
}

function imRenderBlockCustom(c: ImCache, block: bl.Block, options: BlogLangRenderOptions): void {
    if (im.If(c) && block.type === bl.B_CODE && block.language.startsWith("ts")) {
        // TODO: im.Memo on block.code
        let test = im.Get(c, inlineTestFromCodeBlock) ?? 
            im.Set(c, inlineTestFromCodeBlock(block.code, block.language));

        imVisualTestInstallation(
            c,
            test.name,
            options.userPtr as VisualTestHarnessState,
            test.renderFn,
            TEST_CENTERED,
            test.originalTypescript,
        );
    } else {
        im.Else(c);
        imRenderBlogLangBlock(c, block, options);
    } im.IfEnd(c);
}



