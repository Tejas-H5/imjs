import { imExampleMain } from "./examples/examples";
import { newImCache } from "./utils/im-core";

const globalCache = newImCache();
imExampleMain(globalCache);
