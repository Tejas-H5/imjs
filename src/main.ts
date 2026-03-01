import { imExampleMain } from "./examples/examples";
import { newImCache } from "./utils/im-core";
import { cssVars, initImUi, newCssBuilder } from "./utils/im-ui";

const cssb = newCssBuilder();
cssb.s(`
html {
	color: ${cssVars.fg};
	font-family: "Inter", sans-serif;
	font-optical-sizing: auto;
	font-style: normal;
}

body {
	pading: 0;
	margin: 0;
}
`);

initImUi();

const globalCache = newImCache();
imExampleMain(globalCache);
