/**
 * In-page panel pinned to the top-left. Iframe loads popup.html#embed (tighter layout).
 * Close (×) collapses to a 40×40 + FAB; + expands again.
 */

const HOST_ID = 'fonternate-pinned-host';
const STORAGE_VISIBLE = 'fonternatePinnedPanel';
const STORAGE_COLLAPSED = 'fonternatePinnedCollapsed';

const POPUP_URL = () => `${chrome.runtime.getURL('popup.html')}#embed`;

let escapeHandler: ((e: KeyboardEvent) => void) | null = null;

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

/** Returns a function to re-measure iframe content height (same-origin only). */
function wireIframeAutoResize(iframe: HTMLIFrameElement): () => void {
  const update = () => {
    try {
      const doc = iframe.contentDocument;
      const body = doc?.body;
      const html = doc?.documentElement;
      if (!body) return;
      const h = Math.max(
        body.scrollHeight,
        body.offsetHeight,
        html?.scrollHeight ?? 0,
        html?.offsetHeight ?? 0
      );
      const max = Math.min(window.innerHeight * 0.92 - 48, 900);
      iframe.style.height = `${Math.min(h + 6, max)}px`;
    } catch {
      // ignore
    }
  };

  iframe.addEventListener('load', () => {
    update();
    try {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        const ro = new ResizeObserver(() => update());
        ro.observe(doc.body);
        if (doc.documentElement) {
          ro.observe(doc.documentElement);
        }
      }
    } catch {
      // ignore
    }
  });

  return update;
}

export function removePinnedPanel(): void {
  document.getElementById(HOST_ID)?.remove();
  removeEscapeListener();
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
      top: 12px;
      left: 12px;
      z-index: 2147483647;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid #e9e4e2;
      background: #f9f6f5;
      box-shadow: 0 4px 16px rgba(0,0,0,0.16);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6e493f;
      font-size: 24px;
      font-weight: 300;
      line-height: 1;
      padding: 0;
      box-sizing: border-box;
    }
    .fab:hover {
      background: #e9e4e2;
    }
    .fab.hidden {
      display: none !important;
    }
    .panel {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 2147483647;
      width: 393px;
      max-width: calc(100vw - 24px);
      max-height: calc(100vh - 24px);
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow-x: hidden;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      background: #fff;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .panel.hidden {
      display: none !important;
    }
    .bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 10px;
      background: #f9f6f5;
      border-bottom: 1px solid #e9e4e2;
      flex-shrink: 0;
      font-size: 11px;
      font-weight: 600;
      color: #6e493f;
    }
    .close {
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 20px;
      line-height: 1;
      color: #6e493f;
      padding: 0 4px;
      border-radius: 4px;
    }
    .close:hover {
      background: #e9e4e2;
    }
    iframe {
      width: 100%;
      min-height: 0;
      height: 400px;
      border: none;
      display: block;
    }
  `;

  const panel = document.createElement('div');
  panel.className = 'panel';
  if (startCollapsed) {
    panel.classList.add('hidden');
  }

  const bar = document.createElement('div');
  bar.className = 'bar';
  const title = document.createElement('span');
  title.textContent = 'Fonternate';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'close';
  close.setAttribute('aria-label', 'Collapse panel');
  close.textContent = '×';

  const iframe = document.createElement('iframe');
  iframe.src = POPUP_URL();
  iframe.title = 'Fonternate';
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write');

  const updateIframeHeight = wireIframeAutoResize(iframe);

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'fab';
  fab.setAttribute('aria-label', 'Expand Fonternate');
  fab.textContent = '+';
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
      updateIframeHeight();
      setTimeout(updateIframeHeight, 120);
      setTimeout(updateIframeHeight, 400);
    });
    attachEscapeHandler(collapse);
  };

  close.addEventListener('click', collapse);
  fab.addEventListener('click', expand);

  bar.appendChild(title);
  bar.appendChild(close);
  panel.appendChild(bar);
  panel.appendChild(iframe);

  shadow.appendChild(style);
  shadow.appendChild(fab);
  shadow.appendChild(panel);

  (document.body || document.documentElement).appendChild(host);

  if (!startCollapsed) {
    attachEscapeHandler(collapse);
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
