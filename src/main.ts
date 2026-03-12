import { im } from "src/utils/im-js";
import { imMain } from "./examples/examples";
import { cssVars, imui, } from "./utils/im-js/im-ui";

const SPACING_1 = "10px";

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

h1 {
	margin-top: ${SPACING_1};
	margin-bottom: ${SPACING_1};
}

p {
	margin-top: 0px;
	margin-bottom: ${SPACING_1};
}
`);

imui.init();

const globalCache = im.newCache();
imMain(globalCache);
