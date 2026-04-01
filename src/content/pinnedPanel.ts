/**
 * In-page panel pinned to the top-left. Iframe loads popup.html#embed (tighter layout).
 * Close (×) collapses to a 40×40 + FAB; + expands again.
 */

const HOST_ID = 'fonternate-pinned-host';
const STORAGE_VISIBLE = 'fonternatePinnedPanel';
const STORAGE_COLLAPSED = 'fonternatePinnedCollapsed';

const POPUP_URL = () => `${chrome.runtime.getURL('popup.html')}#embed`;
const PINNED_PANEL_WIDTH = 300;
const PINNED_IFRAME_MAX_HEIGHT = 420;
const PINNED_IFRAME_MIN_HEIGHT = 120;

let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

/** Popup #embed posts this so the host can remeasure iframe height after React layout changes. */
let embedLayoutMessageListener: ((ev: MessageEvent) => void) | null = null;

function removeEmbedLayoutListener(): void {
  if (embedLayoutMessageListener) {
    window.removeEventListener('message', embedLayoutMessageListener);
    embedLayoutMessageListener = null;
  }
}

function removeEscapeListener(): void {
  if (escapeHandler) {
    document.removeEventListener('keydown', escapeHandler, true);
    escapeHandler = null;
  }
}

function attachEscapeHandler(collapse: () => void): void {
  removeEscapeListener();
  escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      collapse();
    }
  };
  document.addEventListener('keydown', escapeHandler, true);
}

/** Auto-fit iframe height to its content (same-origin). */
function wirePinnedPanelAutoResize(iframe: HTMLIFrameElement): () => void {
  let resizeObserver: ResizeObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  const update = () => {
    try {
      const doc = iframe.contentDocument;
      const body = doc?.body;
      const html = doc?.documentElement;
      if (!body) return;
      const root = doc.getElementById('root');
      const rootRect = root?.getBoundingClientRect();
      const rootH = rootRect?.height ?? 0;
      // Prefer #root / documentElement: body.scrollHeight can match the iframe viewport when inner layout is constrained.
      const contentHeight = Math.max(
        root?.scrollHeight ?? 0,
        root?.offsetHeight ?? 0,
        rootH,
        body.scrollHeight,
        body.offsetHeight,
        html?.scrollHeight ?? 0,
        html?.offsetHeight ?? 0
      );
      const viewportCap = Math.max(120, window.innerHeight - 24);
      const maxHeight = Math.min(PINNED_IFRAME_MAX_HEIGHT, viewportCap);
      const nextHeight = Math.min(maxHeight, Math.max(PINNED_IFRAME_MIN_HEIGHT, contentHeight + 2));
      iframe.style.height = `${Math.round(nextHeight)}px`;
    } catch {
      // ignore
    }
  };

  iframe.addEventListener('load', () => {
    update();
    try {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (mutationObserver) {
        mutationObserver.disconnect();
      }

      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => update());
      });
      resizeObserver.observe(doc.body);
      if (doc.documentElement) {
        resizeObserver.observe(doc.documentElement);
      }
      const rootEl = doc.getElementById('root');
      if (rootEl) {
        resizeObserver.observe(rootEl);
      }

      // Fallback for UI state toggles that don't always trigger body resize immediately.
      mutationObserver = new MutationObserver(() => {
        requestAnimationFrame(() => requestAnimationFrame(update));
      });
      mutationObserver.observe(doc.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });

      // Safety pass after render batching.
      setTimeout(update, 60);
      setTimeout(update, 180);
    } catch {
      // ignore
    }
  });

  return update;
}

export function removePinnedPanel(): void {
  document.getElementById(HOST_ID)?.remove();
  removeEscapeListener();
  removeEmbedLayoutListener();
  void chrome.storage?.local?.remove([STORAGE_VISIBLE, STORAGE_COLLAPSED]);
}

function injectPinnedPanel(startCollapsed: boolean): void {
  if (document.getElementById(HOST_ID)) return;

  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('data-fonternate-pinned', 'true');

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    .fab {
      position: fixed;
      bottom: 12px;
      left: 12px;
      z-index: 2147483647;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid #e9e4e2;
      background: rgba(255, 255, 255, 0.9);
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.16);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #1c1f21;
      padding: 0;
      box-sizing: border-box;
    }
    .fab svg {
      display: block;
      flex-shrink: 0;
    }
    .fab:hover {
      background: rgba(255, 255, 255, 0.96);
    }
    .fab.hidden {
      display: none !important;
    }
    .panel {
      position: fixed;
      bottom: 12px;
      left: 12px;
      z-index: 2147483647;
      width: ${PINNED_PANEL_WIDTH}px;
      height: auto;
      max-width: calc(100vw - 24px);
      max-height: calc(100vh - 24px);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      background: rgba(255, 255, 255, 0.9);
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      font-family: system-ui, -apple-system, sans-serif;
      transition: height 180ms ease;
    }
    .panel.hidden {
      display: none !important;
    }
    .panel-content {
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
    }
    .close {
      position: absolute;
      top: 6px;
      right: 6px;
      z-index: 2;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 18px;
      line-height: 1;
      color: #6e493f;
      width: 20px;
      height: 20px;
      padding: 0;
      border-radius: 8px;
      flex-shrink: 0;
    }
    .close:hover {
      background: #e9e4e2;
    }
    iframe {
      width: 100%;
      height: ${PINNED_IFRAME_MIN_HEIGHT}px;
      min-height: 0;
      border: none;
      display: block;
      background: transparent;
    }
  `;

  const panel = document.createElement('div');
  panel.className = 'panel';
  if (startCollapsed) {
    panel.classList.add('hidden');
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.setAttribute('aria-label', 'Collapse panel');
  close.textContent = '×';
  const content = document.createElement('div');
  content.className = 'panel-content';

  const iframe = document.createElement('iframe');
  iframe.title = 'Fonternate';
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
  iframe.setAttribute('allowtransparency', 'true');
  const updatePanelHeight = wirePinnedPanelAutoResize(iframe);
  removeEmbedLayoutListener();
  embedLayoutMessageListener = (ev: MessageEvent) => {
    try {
      if (ev.source !== iframe.contentWindow) return;
      const viewportCap = Math.max(120, window.innerHeight - 24);
      const maxHeight = Math.min(PINNED_IFRAME_MAX_HEIGHT, viewportCap);
      if (ev.data?.type === 'FONTERNATE_EMBED_HEIGHT') {
        const rawHeight = Number(ev.data.height);
        if (!Number.isFinite(rawHeight) || rawHeight <= 0) return;
        const nextHeight = Math.min(maxHeight, Math.max(PINNED_IFRAME_MIN_HEIGHT, rawHeight + 2));
        iframe.style.height = `${Math.round(nextHeight)}px`;
        return;
      }
      if (ev.data?.type === 'FONTERNATE_EMBED_LAYOUT') {
        requestAnimationFrame(() => {
          updatePanelHeight();
          setTimeout(updatePanelHeight, 60);
        });
      }
    } catch {
      // ignore
    }
  };
  window.addEventListener('message', embedLayoutMessageListener);
  iframe.src = POPUP_URL();

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fab';
  fab.setAttribute('aria-label', 'Expand Fonternate');
  const svgNS = 'http://www.w3.org/2000/svg';
  const plusSvg = document.createElementNS(svgNS, 'svg');
  plusSvg.setAttribute('width', '18');
  plusSvg.setAttribute('height', '18');
  plusSvg.setAttribute('viewBox', '0 0 18 18');
  plusSvg.setAttribute('aria-hidden', 'true');
  const lineV = document.createElementNS(svgNS, 'line');
  lineV.setAttribute('x1', '9');
  lineV.setAttribute('y1', '3.25');
  lineV.setAttribute('x2', '9');
  lineV.setAttribute('y2', '14.75');
  lineV.setAttribute('fill', 'none');
  lineV.setAttribute('stroke', 'currentColor');
  lineV.setAttribute('stroke-linecap', 'round');
  lineV.setAttribute('stroke-linejoin', 'round');
  lineV.setAttribute('stroke-width', '1.5');
  const lineH = document.createElementNS(svgNS, 'line');
  lineH.setAttribute('x1', '3.25');
  lineH.setAttribute('y1', '9');
  lineH.setAttribute('x2', '14.75');
  lineH.setAttribute('y2', '9');
  lineH.setAttribute('fill', 'none');
  lineH.setAttribute('stroke', 'currentColor');
  lineH.setAttribute('stroke-linecap', 'round');
  lineH.setAttribute('stroke-linejoin', 'round');
  lineH.setAttribute('stroke-width', '1.5');
  plusSvg.appendChild(lineV);
  plusSvg.appendChild(lineH);
  fab.appendChild(plusSvg);
  if (!startCollapsed) {
    fab.classList.add('hidden');
  }

  const collapse = () => {
    panel.classList.add('hidden');
    fab.classList.remove('hidden');
    void chrome.storage?.local?.set({ [STORAGE_COLLAPSED]: true });
    removeEscapeListener();
  };

  const expand = () => {
    panel.classList.remove('hidden');
    fab.classList.add('hidden');
    void chrome.storage?.local?.set({ [STORAGE_COLLAPSED]: false });
    requestAnimationFrame(() => {
      updatePanelHeight();
      setTimeout(updatePanelHeight, 120);
    });
    attachEscapeHandler(collapse);
  };

  close.addEventListener('click', collapse);
  fab.addEventListener('click', expand);

  content.appendChild(close);
  content.appendChild(iframe);
  panel.appendChild(content);

  shadow.appendChild(style);
  shadow.appendChild(fab);
  shadow.appendChild(panel);

  (document.body || document.documentElement).appendChild(host);

  if (!startCollapsed) {
    attachEscapeHandler(collapse);
    requestAnimationFrame(() => {
      updatePanelHeight();
      setTimeout(updatePanelHeight, 180);
    });
  }

  void chrome.storage?.local?.set({ [STORAGE_VISIBLE]: true, [STORAGE_COLLAPSED]: startCollapsed });
}

export function togglePinnedPanel(): void {
  if (document.getElementById(HOST_ID)) {
    removePinnedPanel();
  } else {
    injectPinnedPanel(false);
  }
}

export async function initPinnedPanelFromStorage(): Promise<void> {
  try {
    const r = await chrome.storage.local.get([STORAGE_VISIBLE, STORAGE_COLLAPSED]);
    if (r[STORAGE_VISIBLE]) {
      injectPinnedPanel(!!r[STORAGE_COLLAPSED]);
    }
  } catch {
    // ignore
  }
}
