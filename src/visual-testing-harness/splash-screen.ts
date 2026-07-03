import { im, imdom, ImCache } from "im-js";
import { imui, cssVars, BLOCK, COL, PERCENT, PX, ROW } from "im-ui";
import { lerp01 } from "im-ui/math-utils";
import { VisualTestHarnessState } from "./harness";

export function imSplashScreen(c: ImCache, s: VisualTestHarnessState): boolean {
    const { size } = imdom.TrackSize(c);
    const { width, height } = size;

    const a = s.animations;
    let animationComplete = false;
    im.Switch(c, a.introToUse); switch(a.introToUse) {
        case 0: { // Not sure what this is. im / JS. I have since scrapped the line
            const target = 0.2;
            a.scaleFactor = lerp01(a.scaleFactor, target, 10 * im.getDeltaTimeSeconds(c));
            animationComplete = Math.abs(a.scaleFactor - target) < 0.0001;

            imui.Begin(c, BLOCK); imui.Absolute(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                if (im.IsFirstRender(c)) imdom.setStyle(c, "overflow", "hidden");

                imui.Begin(c, BLOCK); {
                    imui.AbsoluteXY(c, width * a.scaleFactor, PX, height * a.scaleFactor, PX);
                    if (im.Memo(c, height)) imdom.setStyle(c, "fontSize", (0.4 * height) + "px")

                    imdom.Str(c, "im");
                } imui.End(c);

                imui.Begin(c, BLOCK); imui.Bg(c, cssVars.fg); {
                    imdom.setStyle(c, "transform", `translate(-50%, -50%) rotateZ(-${(70 - 45 * a.scaleFactor)}deg)`);

                    imui.Size(c, 100 * a.scaleFactor, PERCENT, 5 * a.scaleFactor, PERCENT);
                    imui.AbsoluteXY(c, width / 2, PX, height / 2, PX);
                } imui.End(c);

                imui.Begin(c, BLOCK); {
                    imui.AbsoluteXY(c, width * (1 - a.scaleFactor), PX, height * (1 - a.scaleFactor), PX);
                    if (im.Memo(c, height)) imdom.setStyle(c, "fontSize", (0.4 * height) + "px")

                    if (im.IsFirstRender(c)) imdom.setStyle(c, "transform", `translate(-100%, -100%)`);

                    imdom.Str(c, "JS");
                } imui.End(c);

                imui.Begin(c, BLOCK); {
                    imui.AbsoluteXY(c, width * 0.5, PX, height * (1 - a.scaleFactor * 0.5), PX);
                    if (im.Memo(c, height)) imdom.setStyle(c, "fontSize", (0.1 * height) + "px")
                    if (im.IsFirstRender(c)) imdom.setStyle(c, "transform", `translate(-50%, -100%)`);

                    imdom.Str(c, "Visual testing harness");
                } imui.End(c);

            } imui.End(c);
        } break;
        case 1: { // Some visual that stuck in my head after watching Billain third impact AMV
            a.t += im.getDeltaTimeSeconds(c);
            const duration = 0.75;
            const rowsDuration = duration * 1.5;
            const textDuration = duration * 1;

            if (a.t > (rowsDuration + textDuration)) {
                animationComplete = true;
            }

            const numCols = 4;
            let start = 0;
            imui.Begin(c, ROW); imui.Absolute(c, 0, PX, 0, PX, 0, PX, 0, PX); {
                im.For(c); for (let colIdx = 0; colIdx < numCols; colIdx++) {
                    const colDuration = rowsDuration / numCols;

                    let start = colIdx * colDuration;
                    const tCol = (a.t - start) / colDuration;

                    const MAX_COUNT = 30;

                    const renderUpTo = tCol * MAX_COUNT;
                    const colWidth  = width / numCols;
                    const colHeight = height / MAX_COUNT;

                    imui.Begin(c, COL); imui.Relative(c); imui.Flex(c); imui.Gap(c, 2, PX); {
                        let y = -colHeight * 4;
                        im.For(c); for (let i = 0; i < MAX_COUNT + 10; i++) {
                            const isOddColumn = colIdx % 2 === 0;
                            const yOffset = isOddColumn ? y : (-colHeight + height - y);

                            const t = renderUpTo - i;
                            const rendered = t > 1.0;

                            const fg = rendered ? cssVars.bg : cssVars.fg;
                            const bg = rendered ? cssVars.fg : cssVars.bg;

                            const text = rendered ? "Rendered" : "Rendering";

                            imui.Begin(c, ROW); imui.Bg(c, bg); imui.Fg(c, fg); imui.Align(c); imui.Justify(c); {
                                if (im.IsFirstRender(c)) {
                                    imdom.setStyle(c, "transform", `rotateZ(${isOddColumn ? "" : "-"}45deg)`);
                                }

                                imui.Size(c, colWidth, PX, colHeight, PX); 
                                imui.AbsoluteXY(c, 0, PX, yOffset, PX);

                                // lookahead
                                const la = 5;

                                imui.Begin(c, BLOCK); {
                                    imui.Opacity(c, t + la);
                                    imdom.Str(c, text);
                                } imui.End(c);
                            } imui.End(c);

                            y += colHeight * 2;
                        } im.ForEnd(c);
                    } imui.End(c);
                } im.ForEnd(c);
            } imui.End(c);

            start += rowsDuration;

            const tText = a.t - start;
            if (im.If(c) && tText > 0) {
                const tBlinkLength = 0.3;
                const tPhase = Math.floor((tText / textDuration) / tBlinkLength) % 2;
                const bg = tPhase === 0 ? cssVars.fg : cssVars.bg;
                const fg = tPhase === 0 ? cssVars.bg : cssVars.fg;

                imui.Begin(c, ROW); imui.Absolute(c, 0, PX, 0, PX, 0, PX, 0, PX); imui.Align(c); imui.Justify(c); {
                    imui.Begin(c, COL); imui.Align(c); {
                        imui.Bg(c, bg); 
                        imui.Fg(c, fg);

                        if (im.Memo(c, fg))     imdom.setStyle(c, "border", `${height * 0.05}px solid ${fg}`);
                        if (im.Memo(c, height)) imdom.setStyle(c, "fontSize", (height / 6) + "px");
                        if (im.Memo(c, height)) imdom.setStyle(c, "fontWeight", "bold");
                        imdom.Str(c, "imJS");

                        imui.Begin(c, COL); imui.Align(c); {
                            imdom.Str(c, "Visual testing harness");
                            if (im.Memo(c, height)) imdom.setStyle(c, "fontSize", (height / 12) + "px");
                        } imui.End(c);
                    } imui.End(c);
                } imui.End(c);
            } im.IfEnd(c);
        } break;
        case 2: { // Which way it rotating tho?
            a.t += im.getDeltaTimeSeconds(c);

            let angle = a.t * Math.PI * 2 - Math.PI / 2;
            // if (a.t > 1) {
            //     angle -= Math.PI * 2;
            // }

            if (a.t > 1) {
                animationComplete = true;
            }

            imui.Begin(c, BLOCK); imui.AbsoluteXY(c, width / 2, PX, height / 2, PX); {
                const flip = angle < Math.PI / 2;

                imdom.setStyle(c, "transform", `translate(-50%, -50%) rotateY(${angle}rad) scaleX(${flip ? "1" : "-1"})`);
                if (im.Memo(c, height)) imdom.setStyle(c, "fontSize", (0.4 * height) + "px")

                imdom.Str(c, flip ? "im" : "JS");
            } imui.End(c);

            imui.Begin(c, BLOCK); {
                imui.AbsoluteXY(c, width * 0.5, PX, height * 0.8, PX);
                if (im.Memo(c, height)) imdom.setStyle(c, "fontSize", (0.1 * height) + "px")
                if (im.IsFirstRender(c)) imdom.setStyle(c, "transform", `translate(-50%, -100%)`);

                imdom.Str(c, "Visual testing harness");
            } imui.End(c);
        } break;
        // We need more of these. I want 90% lok of this harness to just be various intro screens.
        // That being said. Maybe this is the mindset that is preventing me from shipping things...
    } im.SwitchEnd(c);


    return animationComplete;
}
