
// Old HMR code. I've decided that I don't want to support HMR anymore

// Basically, HMR works like this. At least, for Vite it definitely does.
//
// [module 1] --needs hot-reload-> accept([module 2])
// [module 2] --needs hot-reload-> accept([module 3])
// [module 3] --needs hot-reload-> accept([module 4])
// ....
//
// each older module needs to accept the new module. This only happens once per-module.
// The module needs to pass along the very first module in the chain for state retention 
// to work. I anticipate a similar API for other bundlers.
// export type HmrState = {
//     imMain: (c: ImCache) => void;
//     cGlobal: ImCache;
//     timeout: number;
//     accept: (newModule: any, onInvalidate: (() => void) | undefined) => void;
// };


/**
 * HMR core function. See {@link HmrState} for an explanation of HMR.
 * Here is how you would use it with Vite (IS_PROD env variable not included):
 * ```ts
 * export let hmr: HmrState | undefined;
 * 
 * if (IS_PROD) {
 *     imMain([]);
 * } else {
 *     hmr = startRenderingWithHMR(imMain);
 *     if (import.meta.hot) {
 *         import.meta.hot.accept((newModule) => {
 *             hmr!.accept(newModule, import.meta.hot?.invalidate);
 *         });
 *     }
 * }
 * ```
 * Other bundlers will require slightly differnt code. 
 * You could put your own invalidator that does fancier logic.
 *
 * NOTE: doing HMR properly can significantly increase the complexity of your app, for very little cost. 
 * Don't reach for this till making tiny changes to styling or whatever is really slow.
 */
// export function startRenderingWithHMR(
//     renderFn: (c: ImCache) => void,
//     cGlobal: ImCache = [],
// ): HmrState {
//     // The previous module has this long to prevent the next module from initializing a
//     // fresh copy of itself.
//     const HMR_TIMEOUT = 100;
//     const timeout = setTimeout(() => {
//         console.log("[hmr] the first state has been initialized");
//         renderFn(cGlobal);
//     }, HMR_TIMEOUT);
//
//     const hmr: HmrState = {
//         imMain: renderFn,
//         cGlobal: cGlobal,
//         timeout: timeout,
//         accept: (newModule, onInvalidate) => {
//             if (!newModule) return;
//             const newHmr = newModule.hmr;
//             if (!newHmr) {
//                 console.warn("[hmr] The new module did not export the previous HMR state in a variable called 'hmr', invalidating...");
//                 onInvalidate?.();
//                 return;
//             }
//
//             // But it works though
//             const HMR_HACK_TIMEOUT = 30;
//             setTimeout(() => {
//                 let err;
//                 try {
//                     // Stop new module entrypoint, and pass our state forwards
//                     clearTimeout(newHmr.timeout);
//                     newHmr.cGlobal = hmr.cGlobal;
//
//                     console.log("[hmr] Attempting to patch the new render function...");
//                     hmr.cGlobal[CACHE_HMR_ENABLED] = true;
//                     newModule.hmr.imMain(hmr.cGlobal);
//                 } catch (e) {
//                     err = e;
//                 }
//
//                 // NOTE: CACHE_HMR_ENABLED is now a flag that gets set to true once, and stays that way.
//                 // I had wanted it to be a gate that I turn on and then turn off here, but that won't work - 
//                 // a `requestAnimationFrame` invoked 2 frames later will throw errors R.E patching
//                 // of typeIds, which is somewhat unexpected.
//                 // If I debug with breakpoints however, it does work as expected. This indicates that
//                 // the functions must get asyncronously patched some time after HMR actually
//                 // runs this accept callback. For now, I have noticed that I can also get it to work
//                 // as expected when I use HMR_HACK_TIMEOUT - it must have a similar effect to putting
//                 // in a breakpoint.
//
//                 let invalidate = false;
//                 if (err) {
//                     console.log("[hmr] Couldn't hot-reload: ", err);
//                     invalidate = true;
//                 } else if (hmr.cGlobal[CACHE_HMR_STATE_INCOMPATIBLE]) {
//                     console.log("[hmr] Couldn't hot-reload - the new component state layout is no longer compatible with the previous state");
//                     invalidate = true;
//                 }
//
//                 if (invalidate) {
//                     imCacheStopImmediately(hmr.cGlobal);
//                     try {
//                         onInvalidate?.();
//                     } catch (e) {
//                         console.error("[hmr] failed to invalidate: ", e);
//                         window.location.reload();
//                     }
//                 } else {
//                     console.log("[hmr] Reloaded x" + hmr.cGlobal[CACHE_RENDER_FN_CHANGES]);
//                 }
//
//             }, HMR_HACK_TIMEOUT);
//         }
//     };
//
//     return hmr;
// }
//
