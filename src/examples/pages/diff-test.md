# Diff test

As it turns out, our blog post needs a minimum amount of
text in order for the width of the page to actually be what it 
needs to be !

Initial state:

```ts - imDivBegin/imDivEnd

function imGame(c: ImCache) {
    if (im.IsFirstRender(c)) {
        imdom.setStyle(c, "overflow", "hidden");
        imdom.setStyle(c, "position", "relative");
    }

    imDivBegin(c); {
        if (im.IsFirstRender(c)) {
            imdom.setStyle(c, "position", "absolute");
            imdom.setStyle(c, "height", "100%");
            imdom.setStyle(c, "width", "100%");
            imdom.setStyle(c, "overflow", "hidden");

            // I've put this in so you can see it is
            imdom.setStyle(c, "backgroundColor", "blue");
        }

        const visible = imdom.TrackVisibility(c, 0.5).isVisible;
        if (im.If(c) && visible) {
            imDivBegin(c); {
                if (im.IsFirstRender(c)) {
                    imdom.setStyle(c, "backgroundColor", "transparent");
                    imdom.setStyle(c, "height", "100%");
                    imdom.setStyle(c, "width", "100%");
                    imdom.setStyle(c, "transform", "translate(50%, 50%)");
                    imdom.setStyle(c, "position", "absolute");
                }

                imDivBegin(c); {
                    if (im.IsFirstRender(c)) {
                        imdom.setStyle(c, "display", "inline");
                        // I've put this in so you can see it is
                        imdom.setStyle(c, "backgroundColor", "red");
                    }

                    imStr(c, "P");
                } imDivEnd(c);
            } imDivEnd(c);
        } im.IfEnd(c);
    } imDivEnd(c);
}

function imStr(c: ImCache, str: string) {
    imdom.Str(c, str);
}
function imDivBegin(c: ImCache) {
    return imdom.ElBegin(c, el.DIV);
}
function imDivEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
```


```ts - Moving the player around #diff[-1]

function imGame(c: ImCache) {
    if (im.IsFirstRender(c)) {
        imdom.setStyle(c, "overflow", "hidden");
        imdom.setStyle(c, "position", "relative");
    }

    const root = imDivBegin(c).root; {
        if (im.IsFirstRender(c)) {
            imdom.setStyle(c, "position", "absolute");
            imdom.setStyle(c, "height", "100%");
            imdom.setStyle(c, "width", "100%");
            imdom.setStyle(c, "overflow", "hidden");
        }

        const rect = root.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;

        const visible = imdom.TrackVisibility(c, 0.5).isVisible;
        if (im.If(c) && visible) {
            imDivBegin(c); {
                if (im.IsFirstRender(c)) {
                    imdom.setStyle(c, "backgroundColor", "transparent");
                    imdom.setStyle(c, "height", "100%");
                    imdom.setStyle(c, "width", "100%");
                    imdom.setStyle(c, "transform", "translate(50%, 50%)");
                    imdom.setStyle(c, "position", "absolute");
                }

                const player = im.GetInline(c, imGame) 
                    ?? im.Set(c, { x: 0, y: 0 });

                // Player movement
                {
                    // This is how you access the global event system's keyboard state,
                    // where we track the curent keyboard state. 
                    // It's very useful to have.
                    const keyboard = imdom.getKeyboard();

                    const xAxis = 
                        imdom.isKeyHeld(keyboard, key.ARROW_LEFT) ? -1 :
                        imdom.isKeyHeld(keyboard, key.ARROW_RIGHT) ? 1 : 0;

                    const yAxis = 
                        imdom.isKeyHeld(keyboard, key.ARROW_UP) ? -1 : // HTML y is down
                        imdom.isKeyHeld(keyboard, key.ARROW_DOWN) ? 1 : 0;

                    // I've added this to prevent up/down arrows from scrolling the webpage,
                    // but other hotkeys still need to work.
                    if (xAxis || yAxis) {
                        if (keyboard.keyDown) keyboard.keyDown.preventDefault();
                    }

                    // Let's apply the movement in a framerate-independent way with delta-time.
                    const movementSpeed = 1000;
                    player.x += xAxis * im.getDeltaTimeSeconds(c) * movementSpeed;
                    player.y += yAxis * im.getDeltaTimeSeconds(c) * movementSpeed;

                    player.x = clamp(player.x, -halfWidth, halfWidth);
                    player.y = clamp(player.y, -halfHeight, halfHeight);
                }

                imDivBegin(c); {
                    if (im.IsFirstRender(c)) {
                        imdom.setStyle(c, "position", "absolute");
                        // I'd prefer if the player was actually centered.
                        imdom.setStyle(c, "transform", "translate(-50%, -50%)");
                    }

                    // Let's assign the position to the player here:
                    if (im.Memo(c, player.x)) imdom.setStyle(c, "left", player.x + "px");
                    if (im.Memo(c, player.y)) imdom.setStyle(c, "top", player.y + "px");

                    imStr(c, "P");
                } imDivEnd(c);
            } imDivEnd(c);
        } im.IfEnd(c);
    } imDivEnd(c);
}

function imStr(c: ImCache, str: string) {
    imdom.Str(c, str);
}
function imDivBegin(c: ImCache) {
    return imdom.ElBegin(c, el.DIV);
}
function imDivEnd(c: ImCache) {
    imdom.ElEnd(c, el.DIV);
}
function clamp(val: number, lo: number, hi: number): number {
    if (val < lo) return lo;
    if (val > hi) return hi;
    return val;
}
```
