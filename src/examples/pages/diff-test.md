# Diff test

one

```ts - How

function imGame(c: ImCache) {
    // If you're not careful, setting styles like this can leak 
    // into the parent component. In many cases, like this one, it's 
    // fine (what we want, even) - just be conscious of what you're doing.
    if (im.IsFirstRender(c)) {
        // Don't let the DOM nodes appear outside the example viewport
        imdom.setStyle(c, "overflow", "hidden");
        imdom.setStyle(c, "position", "relative");
    }

    imDivBegin(c); {
        // This div is the background, we may or may not need it.

        if (im.IsFirstRender(c)) {
            imdom.setStyle(c, "position", "absolute");
            imdom.setStyle(c, "height", "100%");
            imdom.setStyle(c, "width", "100%");
            imdom.setStyle(c, "overflow", "hidden");

            // I've put this in so you can see it is
            imdom.setStyle(c, "backgroundColor", "blue");
        }

        // The imdom.TrackVisibility utility uses an IntersectionObserver under 
        // the hood to check if the component is visible on the screen at this moment. 
        // The threshold 0.5 says that 50% of it must be on the screen before
        // it becomes visible. This is also how we know which tutorial example
        // should be recieving the current keyboard input.
        const visible = imdom.TrackVisibility(c, 0.5).isVisible;
        if (im.If(c) && visible) {
            imDivBegin(c); {
                // This DIV is the play area. I've translated it 50%, 50% so that
                // 0, 0 is the center
                if (im.IsFirstRender(c)) {
                    imdom.setStyle(c, "backgroundColor", "transparent");
                    imdom.setStyle(c, "height", "100%");
                    imdom.setStyle(c, "width", "100%");
                    imdom.setStyle(c, "transform", "translate(50%, 50%)");
                    imdom.setStyle(c, "position", "absolute");
                }

                // This is our player
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

then

```ts - Lets go #diff[-1]
function imGame(c: ImCache) {
    // If you're not careful, setting styles like this can leak 
    // into the parent component. In many cases, like this one, it's 
    // fine (what we want, even) - just be conscious of what you're doing.
    if (im.IsFirstRender(c)) {
        // Don't let the DOM nodes appear outside the example viewport
        imdom.setStyle(c, "overflow", "hidden");
        imdom.setStyle(c, "position", "relative");
    }


    const root = imDivBegin(c).root; {
        // This div is the background, we may or may not need it.

        if (im.IsFirstRender(c)) {
            imdom.setStyle(c, "position", "absolute");
            imdom.setStyle(c, "height", "100%");
            imdom.setStyle(c, "width", "100%");
            imdom.setStyle(c, "overflow", "hidden");
        }

        const rect = root.getBoundingClientRect();
        const halfWidth = rect.width / 2;
        const halfHeight = rect.height / 2;

        // The imdom.TrackVisibility utility uses an IntersectionObserver under 
        // the hood to check if the component is visible on the screen at this moment. 
        // The threshold 0.5 says that 50% of it must be on the screen before
        // it becomes visible. This is also how we know which tutorial example
        // should be recieving the current keyboard input.
        const visible = imdom.TrackVisibility(c, 0.5).isVisible;
        if (im.If(c) && visible) {
            imDivBegin(c); {
                if (im.IsFirstRender(c)) imdom.setStyle(c, "backgroundColor", "transparent");
                if (im.IsFirstRender(c)) imdom.setStyle(c, "height", "100%");
                if (im.IsFirstRender(c)) imdom.setStyle(c, "width", "100%");
                if (im.IsFirstRender(c)) imdom.setStyle(c, "transform", "translate(50%, 50%)");
                if (im.IsFirstRender(c)) imdom.setStyle(c, "position", "absolute");

                const player = im.GetInline(c, imGame) 
                    ?? im.Set(c, { x: 0, y: 0 });

                // Player movement
                {
                    // This is how you access the global event system's keyboard state,
                    // where we track the curent keyboard state. 
                    // It's very useful to have.
                    const keyboard = imdom.getKeyboard();

                    let xAxis = 0, yAxis = 0;

                    // I've added this to prevent up/down arrows from scrolling the webpage.
                    if (keyboard.keyDown) {
                        keyboard.keyDown.preventDefault();
                    }

                    // Horizontal movement
                    if (imdom.isKeyHeld(keyboard, key.ARROW_LEFT)) {
                        xAxis = -1;
                    } else if (imdom.isKeyHeld(keyboard, key.ARROW_RIGHT)) {
                        xAxis = 1;
                    }

                    // Vertical movement
                    if (imdom.isKeyHeld(keyboard, key.ARROW_DOWN)) {
                        // HTML y is down
                        yAxis = 1;
                    } else if (imdom.isKeyHeld(keyboard, key.ARROW_UP)) {
                        yAxis = -1;
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
                        imdom.setStyle(c, "display", "inline");
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
