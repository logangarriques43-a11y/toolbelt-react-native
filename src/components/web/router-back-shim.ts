/**
 * "Back" after a page refresh in the browser.
 *
 * Every screen leaves with `router.back()` (Back buttons, and after Save). On a
 * phone there is always a screen to return to, but in a browser a refresh, a
 * bookmark or a shared link starts with an empty stack, and `back()` silently
 * does nothing, so Save would appear to hang and Back would be dead.
 * `installWebBackFallback()` makes `back()` go to the dashboard when there's
 * nothing to go back to. `useRouter()` returns this same shared object, so
 * every screen gets the fallback.
 *
 * Only the web build imports this file.
 */

import { router } from 'expo-router';

let installed = false;

export function installWebBackFallback() {
  if (installed) return;
  installed = true;
  const originalBack = router.back.bind(router);
  (router as { back: () => void }).back = () => {
    if (router.canGoBack()) originalBack();
    else router.replace('/');
  };
}
