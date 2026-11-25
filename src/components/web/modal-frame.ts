/**
 * Desktop presentation for the app's sheets (React Native `Modal`s).
 *
 * The sheets are built for a phone: full-screen forms (`presentationStyle`
 * pageSheet / opaque modals) and bottom sheets over a dimmed backdrop
 * (`transparent` modals). On a computer react-native-web would stretch both
 * across the whole window. This tags each modal layer as it opens so the
 * `min-width: 1024px` rules in `public/index.html` can present it:
 *
 * - `data-tb-modal="panel"` (opaque): a centered, rounded panel over a dimmed
 *   window.
 * - `data-tb-modal="overlay"` (transparent): the sheet keeps its own backdrop
 *   but sits in a centered column; the window outside it is dimmed with the
 *   same colour as that backdrop (`--tb-scrim`), so the dim looks continuous,
 *   and a click outside the column counts as a click on the backdrop (closes
 *   the sheet, exactly like tapping above it).
 *
 * Narrower windows ignore the tags (the CSS only applies on wide windows), so
 * phones and tablets in the browser are unchanged. Only the web build imports
 * this file.
 */

let installed = false;

/** rgba alpha of a computed CSS colour, or 1 for opaque / unparseable values. */
function alphaOf(color: string): number {
  if (color === 'transparent') return 0;
  const m = color.match(/rgba?\(([^)]+)\)/);
  if (!m) return 1;
  const parts = m[1].split(/[,\s/]+/).filter(Boolean);
  return parts.length >= 4 ? Number(parts[3]) : 1;
}

/** The sheet's backdrop: the first semi-transparent fill near the top of the layer. */
function findScrim(layer: HTMLElement): HTMLElement | null {
  let level: Element[] = [layer];
  for (let depth = 0; depth < 5 && level.length; depth++) {
    const next: Element[] = [];
    for (const el of level) {
      for (const child of Array.from(el.children)) {
        const a = alphaOf(getComputedStyle(child).backgroundColor);
        if (a > 0 && a < 1) return child as HTMLElement;
        next.push(child);
      }
    }
    level = next;
  }
  return null;
}

/**
 * An opaque modal: react-native-web paints its solid fill on a content element
 * a couple of levels inside the layer (between the focus trap's zero-size
 * sentinels), and some sheets draw their own full-size background. Look a few
 * levels down for a solid fill as big as the layer.
 */
function isFullScreenSheet(layer: HTMLElement): boolean {
  const outer = layer.getBoundingClientRect();
  let level: Element[] = [layer];
  for (let depth = 0; depth < 5 && level.length; depth++) {
    for (const el of level) {
      const r = el.getBoundingClientRect();
      const covers = r.width >= outer.width - 1 && r.height >= outer.height - 1;
      if (covers && alphaOf(getComputedStyle(el).backgroundColor) >= 1) return true;
    }
    level = level.flatMap((el) => Array.from(el.children));
  }
  return false;
}

/** Layers still waiting for their styles, each with the observer watching it. */
const pending = new WeakMap<HTMLElement, MutationObserver>();

function tag(layer: HTMLElement) {
  if (layer.dataset.tbModal) return;
  if (getComputedStyle(layer).position !== 'fixed') {
    // react-native-web first mounts the layer hidden and adds its full-window
    // styles a moment later (when the open animation starts); tag it then.
    if (!pending.has(layer)) {
      const o = new MutationObserver(() => {
        if (getComputedStyle(layer).position !== 'fixed') return;
        o.disconnect();
        pending.delete(layer);
        tag(layer);
      });
      o.observe(layer, { attributes: true, attributeFilter: ['class', 'style'] });
      pending.set(layer, o);
    }
    return;
  }
  if (isFullScreenSheet(layer)) {
    layer.dataset.tbModal = 'panel';
    return;
  }
  layer.dataset.tbModal = 'overlay';
  const scrim = findScrim(layer);
  if (scrim) {
    layer.style.setProperty('--tb-scrim', getComputedStyle(scrim).backgroundColor);
    // Clicks beside the column land on the portal (index.html stretches it
    // over the window); treat them as a click on the backdrop.
    const portal = layer.parentElement;
    portal?.addEventListener('click', (e) => {
      if (e.target === portal) scrim.click();
    });
  }
}

function scan(portal: Element) {
  const layer = portal.firstElementChild;
  if (layer instanceof HTMLElement) tag(layer);
}

/** Watch for sheets opening and tag them for the desktop CSS. Safe to call more than once. */
export function installDesktopModalFrame() {
  if (installed || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  installed = true;
  const isPortal = (n: Node): n is HTMLElement =>
    n instanceof HTMLElement && n.parentElement === document.body && n.tagName === 'DIV' && n.id !== 'root';

  // react-native-web mounts each Modal in its own <div> appended to <body>, and
  // renders the layer into it (sometimes a frame after the div appears). Watch
  // <body>'s direct children and each portal's direct children only, so the
  // app's own DOM updates never reach this observer.
  const watched = new WeakSet<Element>();
  const portalObserver = new MutationObserver((records) => {
    for (const r of records) scan(r.target as Element);
  });
  const watch = (portal: HTMLElement) => {
    scan(portal);
    if (watched.has(portal)) return;
    watched.add(portal);
    portalObserver.observe(portal, { childList: true });
  };
  new MutationObserver((records) => {
    for (const r of records) {
      r.addedNodes.forEach((n) => {
        if (isPortal(n)) watch(n);
      });
    }
  }).observe(document.body, { childList: true });
  Array.from(document.body.children).forEach((n) => {
    if (isPortal(n)) watch(n);
  });
}
