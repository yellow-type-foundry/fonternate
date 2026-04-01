/**
 * In-page panel pinned to the top-left. Iframe loads popup.html#embed (tighter layout).
 * Close (×) collapses to a 40×40 + FAB; + expands again.
 */

const HOST_ID = 'fonternate-pinned-host';
const STORAGE_VISIBLE = 'fonternatePinnedPanel';
const STORAGE_COLLAPSED = 'fonternatePinnedCollapsed';

const POPUP_URL = () => `${chrome.runtime.getURL('popup.html')}#embed`;
const PINNED_PANEL_WIDTH = 300;
const PINNED_PANEL_HEIGHT = 300;

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
      bottom: 12px;
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
      color: #1c1f21;
      padding: 0;
      box-sizing: border-box;
    }
    .fab svg {
      display: block;
      flex-shrink: 0;
    }
    .fab:hover {
      background: #e9e4e2;
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
      height: ${PINNED_PANEL_HEIGHT}px;
      max-width: calc(100vw - 24px);
      max-height: calc(100vh - 24px);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.18);
      background: #fff;
      font-family: system-ui, -apple-system, sans-serif;
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
      height: 100%;
      min-height: 0;
      border: none;
      display: block;
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
  iframe.src = POPUP_URL();
  iframe.title = 'Fonternate';
  iframe.setAttribute('allow', 'clipboard-read; clipboard-write');

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
