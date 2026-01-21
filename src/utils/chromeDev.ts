/**
 * Mock Chrome APIs for development mode (when running in browser, not extension)
 * This allows the UI to be debugged in a regular browser tab
 */

import { FontSettings, ChromeMessage, AppState, FontCapabilities } from '../types';

// Default values (duplicated here to avoid circular dependency with chrome.ts)
const defaultCapabilities: FontCapabilities = {
  ss: [],
  swashLevels: [],
  supportsLIGA: true,
  supportsDLIG: true,
  supportsCALT: true,
};

const defaultAppState: AppState = {
  fontName: '',
  fontWeight: 'regular',
  textTransform: 'none',
  stylisticSets: new Set<number>(),
  swashLevel: 0,
  liga: true,
  dlig: false,
  calt: true,
  textStyles: new Set<string>(),
  capabilities: defaultCapabilities,
  loading: false,
  error: null,
  lastFontName: undefined,
};

const defaultFontSettings: FontSettings = {
  fontFamily: '',
  isEnabled: false,
  textTransform: 'none',
  fontWeight: 400,
  openTypeFeatures: {
    ss01: false,
    ss02: false,
    ss03: false,
    ss04: false,
    ss05: false,
    ss06: false,
    ss07: false,
    ss08: false,
    ss09: false,
    ss10: false,
    ss11: false,
    ss12: false,
    ss13: false,
    ss14: false,
    ss15: false,
    ss16: false,
    ss17: false,
    ss18: false,
    ss19: false,
    ss20: false,
    swsh: false,
    calt: false,
    dlig: false,
    liga: false,
  },
};

// In-memory storage for dev mode
let devStorage: Record<string, any> = {
  appState: defaultAppState,
  fontSettings: defaultFontSettings,
};

/**
 * Check font weights in dev mode (runs in browser context)
 */
function checkFontWeightsInDevMode(baseFontName: string, weightSuffixes: string[]): string[] {
  if (!document || !document.body) {
    console.warn('[DEV MODE] Cannot check font weights - document.body not available');
    return [];
  }

  const availableWeights: string[] = [];
  const testText = 'Ag';
  const fontSize = '72px';

  for (const suffix of weightSuffixes) {
    const fontName = `${baseFontName}-${suffix}`;
    console.log(`[DEV MODE] Checking font: ${fontName}`);
    const isAvailable = checkFontExistsInDevMode(fontName, testText, fontSize);
    console.log(`[DEV MODE] Font ${fontName} available:`, isAvailable);
    if (isAvailable) {
      availableWeights.push(suffix);
    }
  }

  return availableWeights;
}

/**
 * Check if a font exists in dev mode
 */
function checkFontExistsInDevMode(fontFamily: string, testText: string, fontSize: string): boolean {
  if (!document.body) return false;

  // Use Font Loading API if available
  if (document.fonts && document.fonts.check) {
    try {
      const fontSpec = `"${fontFamily}"`;
      if (document.fonts.check(fontSpec)) {
        return true;
      }
    } catch (e) {
      // Fall back to other method
    }
  }

  // Create test elements and compare rendering
  const testElement = document.createElement('span');
  testElement.style.fontFamily = `"${fontFamily}", monospace`;
  testElement.style.position = 'absolute';
  testElement.style.visibility = 'hidden';
  testElement.style.fontSize = fontSize;
  testElement.style.whiteSpace = 'nowrap';
  testElement.style.fontWeight = 'normal';
  testElement.style.fontStyle = 'normal';
  testElement.textContent = testText;
  
  const fallbackElement = document.createElement('span');
  fallbackElement.style.fontFamily = 'monospace';
  fallbackElement.style.position = 'absolute';
  fallbackElement.style.visibility = 'hidden';
  fallbackElement.style.fontSize = fontSize;
  fallbackElement.style.whiteSpace = 'nowrap';
  fallbackElement.style.fontWeight = 'normal';
  fallbackElement.style.fontStyle = 'normal';
  fallbackElement.textContent = testText;
  
  const sansFallbackElement = document.createElement('span');
  sansFallbackElement.style.fontFamily = 'sans-serif';
  sansFallbackElement.style.position = 'absolute';
  sansFallbackElement.style.visibility = 'hidden';
  sansFallbackElement.style.fontSize = fontSize;
  sansFallbackElement.style.whiteSpace = 'nowrap';
  sansFallbackElement.style.fontWeight = 'normal';
  sansFallbackElement.style.fontStyle = 'normal';
  sansFallbackElement.textContent = testText;
  
  document.body.appendChild(testElement);
  document.body.appendChild(fallbackElement);
  document.body.appendChild(sansFallbackElement);
  
  // Force reflow
  void testElement.offsetWidth;
  void fallbackElement.offsetWidth;
  void sansFallbackElement.offsetWidth;
  
  const computedFont = window.getComputedStyle(testElement).fontFamily.toLowerCase();
  const fallbackFont = window.getComputedStyle(fallbackElement).fontFamily.toLowerCase();
  const sansFallbackFont = window.getComputedStyle(sansFallbackElement).fontFamily.toLowerCase();
  
  const testWidth = testElement.offsetWidth;
  const testHeight = testElement.offsetHeight;
  const fallbackWidth = fallbackElement.offsetWidth;
  const fallbackHeight = fallbackElement.offsetHeight;
  const sansFallbackWidth = sansFallbackElement.offsetWidth;
  const sansFallbackHeight = sansFallbackElement.offsetHeight;
  
  document.body.removeChild(testElement);
  document.body.removeChild(fallbackElement);
  document.body.removeChild(sansFallbackElement);
  
  const fontNameLower = fontFamily.toLowerCase();
  const hasFontName = computedFont.includes(fontNameLower) && 
                     !computedFont.startsWith('monospace') &&
                     !computedFont.startsWith('sans-serif');
  
  const widthDiffersFromMonospace = Math.abs(testWidth - fallbackWidth) > 5;
  const heightDiffersFromMonospace = Math.abs(testHeight - fallbackHeight) > 2;
  const widthDiffersFromSans = Math.abs(testWidth - sansFallbackWidth) > 5;
  const heightDiffersFromSans = Math.abs(testHeight - sansFallbackHeight) > 2;
  
  const differsFromMonospace = widthDiffersFromMonospace || heightDiffersFromMonospace;
  const differsFromSans = widthDiffersFromSans || heightDiffersFromSans;
  const dimensionsDiffer = differsFromMonospace || differsFromSans;
  
  const isAvailable = hasFontName && dimensionsDiffer;
  
  if (!isAvailable) {
    console.log(`[DEV MODE] Font "${fontFamily}" not available:`, {
      hasFontName,
      dimensionsDiffer,
      computedFont,
      testWidth,
      fallbackWidth,
      sansFallbackWidth
    });
  }
  
  return isAvailable;
}

// Mock Chrome runtime
const mockChrome = {
  runtime: {
    sendMessage: (message: ChromeMessage, callback?: (response: any) => void) => {
      console.log('[DEV MODE] chrome.runtime.sendMessage:', message);
      
      // Simulate async response
      setTimeout(() => {
        let response: any = { success: true };
        
        switch (message.type) {
          case 'APPLY_FONT':
            console.log('[DEV MODE] Would apply font:', message.payload);
            response = { success: true };
            break;
          case 'DETECT_CAPABILITIES':
            // Return mock capabilities
            response = {
              capabilities: {
                ss: [1, 2, 3],
                swashLevels: [0, 1, 2],
                supportsLIGA: true,
                supportsDLIG: true,
                supportsCALT: true,
              } as FontCapabilities,
            };
            break;
          case 'CHECK_FONT_WEIGHTS':
            // Check font weights in dev mode
            const { baseFontName, weightSuffixes } = message.payload || {};
            if (baseFontName && weightSuffixes && Array.isArray(weightSuffixes)) {
              console.log(`[DEV MODE] Checking font weights for: ${baseFontName}`);
              const availableWeights = checkFontWeightsInDevMode(baseFontName, weightSuffixes);
              response = { availableWeights };
              console.log(`[DEV MODE] Available font weights for ${baseFontName}:`, availableWeights);
            } else {
              response = { availableWeights: [] };
            }
            break;
          case 'RESET_ALL':
            console.log('[DEV MODE] Would reset all');
            response = { success: true };
            break;
          default:
            response = { success: true };
        }
        
        if (callback) callback(response);
      }, 100);
    },
    getURL: (path: string) => {
      // Return a placeholder URL for dev mode
      return `http://localhost:3000/${path}`;
    },
    lastError: undefined,
  },
  storage: {
    sync: {
      get: async (keys: string | string[] | { [key: string]: any } | null): Promise<Record<string, any>> => {
        console.log('[DEV MODE] chrome.storage.sync.get:', keys);
        const keyArray = Array.isArray(keys) ? keys : keys ? [keys] : Object.keys(devStorage);
        const result: Record<string, any> = {};
        keyArray.forEach(key => {
          if (typeof key === 'string' && devStorage[key]) {
            result[key] = devStorage[key];
          }
        });
        return result;
      },
      set: async (items: { [key: string]: any }): Promise<void> => {
        console.log('[DEV MODE] chrome.storage.sync.set:', items);
        Object.assign(devStorage, items);
      },
    },
  },
  tabs: {
    query: async (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
      console.log('[DEV MODE] chrome.tabs.query:', queryInfo);
      // Return mock tab
      return [{
        id: 1,
        url: 'http://localhost:3000',
        title: 'Dev Mode Tab',
      } as chrome.tabs.Tab];
    },
  },
};

/**
 * Check if we're running in extension context or dev mode
 */
export const isExtensionContext = (): boolean => {
  return typeof chrome !== 'undefined' && 
         chrome.runtime && 
         chrome.runtime.id !== undefined;
};

/**
 * Get Chrome API (real or mock)
 */
export const getChromeAPI = (): typeof chrome => {
  if (isExtensionContext()) {
    return chrome;
  }
  
  // Inject mock Chrome API into global scope for dev mode
  if (typeof window !== 'undefined' && !(window as any).chrome) {
    (window as any).chrome = mockChrome;
    console.log('[DEV MODE] Mock Chrome API initialized');
  }
  
  return (window as any).chrome || mockChrome;
};

/**
 * Initialize dev mode Chrome APIs
 */
export const initDevMode = () => {
  if (!isExtensionContext()) {
    // Replace global chrome with mock
    (window as any).chrome = mockChrome;
    console.log('[DEV MODE] Running in development mode');
    console.log('[DEV MODE] Chrome APIs are mocked - actions will be logged to console');
    console.log('[DEV MODE] Storage is in-memory only');
  }
};

/**
 * Get URL for extension resource (works in both extension and dev mode)
 */
export const getResourceURL = (path: string): string => {
  if (isExtensionContext() && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(path);
  }
  // In dev mode, return a path that webpack-dev-server can serve
  return `/assets/${path.split('/').pop()}`;
};
