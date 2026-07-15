import { im } from "im-js";
import { imMain } from "./examples/examples";
import { cssVars, imui, } from "./im-js/im-ui";

imui.newCssBuilder().s(`
html {
	color: ${cssVars.fg};
	font-family: "Inter", sans-serif;
	font-optical-sizing: auto;
	font-style: normal;

	font-size: 1.25rem;
}

body {
	pading: 0;
	margin: 0;
}

h1, h2, h3, h4, p, ul {
	margin: 0;
}
`);

imui.init();

const globalCache = im.newCache();
imMain(globalCache);
