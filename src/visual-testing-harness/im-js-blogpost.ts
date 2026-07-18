import * as bl from "blog-lang";
import { ev, im, ImCache, ImCacheRerenderFn, imdom } from "im-js";
import { BLOCK, imui } from "im-js/im-ui";
import {
    BlogLangRenderOptions,
    imItemUrlBegin,
    imItemUrlEnd,
    imRenderBlogLangBlock,
    imRenderBlogLangBlockItem,
    imRenderBlogLangBlogpost,
    newBlogLangRenderOptions
} from "im-js/im-ui/components/im-blog-lang-viewer";
import * as tsc from "minimal-tsc";
import { imVisualTestInstallation, setCurrentTest, TEST_CENTERED, VisualTestHarnessState } from "visual-testing-harness";
import { imBaseContainerBegin, imBaseContainerEnd } from "../examples/common";

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

type InlineTestState = {
    logs:   unknown[][];
    warns:  unknown[][];
    errors: unknown[][];
};

function newInlineTestState(): InlineTestState {
    return {
        logs:   [],
        warns:  [],
        errors: [],
    };
}

function testHasOutput(s: InlineTestState): boolean {
    return (
        s.logs.length > 0 ||
        s.warns.length > 0 ||
        s.errors.length > 0
    );
}

function inlineTestFromCodeBlock(code: string, language: string, userModules: tsc.Module[]): InlineTest {
    const testState = newInlineTestState();
    const consoleStub = {
        log: (...vals: unknown[]) =>   testState.logs.push(vals),
        warn: (...vals: unknown[]) =>  testState.warns.push(vals),
        error: (...vals: unknown[]) => testState.errors.push(vals),
    };

    const modules: tsc.Module[] = [
        ...userModules,
        { namespace: "console", env: consoleStub },
    ];

    const transformResult = tsc.transform(code, modules);

    const firstMethod = Object.values(transformResult.values)
            .filter(m => m.name.startsWith("im"))[0] ?? undefined;

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
                    } else { 
                        im.Else(c);
                        firstMethod(c);

                        if (im.If(c) && testState.logs.length > 0) {
                            imui.Begin(c, BLOCK); {
                                imdom.Str(c, "Logs");
                            } imui.End(c);
                            imui.Begin(c, BLOCK); {
                                im.For(c); for (const logLine of testState.logs) {
                                    imui.Begin(c, BLOCK); {
                                        im.For(c); for (const val of logLine) {
                                            imdom.StrFmt(c, val, JSON.stringify);
                                        } im.ForEnd(c);
                                    } imui.End(c);
                                } im.ForEnd(c);
                            } imui.End(c);
                        } im.IfEnd(c);
                    } im.IfEnd(c);
                } catch(err) {
                    im.Catch(c, tryState, err);
                } im.TryEnd(c, tryState);
            } im.IfEnd(c);
        }
    };
}

function imRenderBlockCustom(c: ImCache, block: bl.Block, options: BlogLangRenderOptions, modules: tsc.Module[]): void {
    if (im.If(c) && block.type === bl.B_CODE && block.language.startsWith("ts ")) {
        imui.Begin(c, BLOCK); imui.Relative(c); {
            const modulesChanged = im.Memo(c, modules);
            const blockChanged = im.Memo(c, block);

            let test = im.Get(c, inlineTestFromCodeBlock);
            if (!test || modulesChanged || blockChanged) {
                test = im.Set(c, inlineTestFromCodeBlock(block.code, block.language, modules));
            }

            imVisualTestInstallation(
                c,
                test.name,
                options.userPtr as VisualTestHarnessState,
                test.renderFn,
                TEST_CENTERED,
                test.originalTypescript,
            );
        } imui.End(c);
    } else {
        im.Else(c);
        imRenderBlogLangBlock(c, block, options);
    } im.IfEnd(c);
}


function imRenderItemCustom(c: ImCache, item: bl.InlineItem, options: BlogLangRenderOptions): void {
    if (im.If(c) && item.type === bl.T_URL) {
        imItemUrlBegin(c, item, options); {
            imdom.Str(c, item.text);

            const clickEvent = imdom.On(c, ev.CLICK);
            if (clickEvent) {
                if (item.url.startsWith("/")) {
                    // It's a local path, so we shouldn't need to navigate anywhere.
                    clickEvent.preventDefault();
                    window.history.pushState(null, "", item.url);
                    document.getElementById("top")?.scrollIntoView();
                }
            }
        } imItemUrlEnd(c);
    } else {
        im.Else(c);
        imRenderBlogLangBlockItem(c, item, options);
    } im.IfEnd(c);
}

export function imJsBlogPost(c: ImCache, harness: VisualTestHarnessState, post: bl.Blogpost, modules: tsc.Module[]) {
    const modulesChanged = im.Memo(c, modules);

    let renderOptions = im.Get(c, newBlogLangRenderOptions);
    if (!renderOptions || modulesChanged) {
        renderOptions = im.Set(c, newBlogLangRenderOptions(
            (c, block, options) => imRenderBlockCustom(c, block, options, modules),
            imRenderItemCustom,
        ));
    }
    renderOptions.userPtr = harness;

    imBaseContainerBegin(c); {
        imRenderBlogLangBlogpost(c, post, renderOptions);
    } imBaseContainerEnd(c);
}

