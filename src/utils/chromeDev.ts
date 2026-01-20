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
