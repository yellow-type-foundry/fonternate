import { FontSettings, ChromeMessage, AppState, FontCapabilities } from '../types';

export const defaultFontSettings: FontSettings = {
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

export const defaultCapabilities: FontCapabilities = {
  ss: [],
  swashLevels: [],
  supportsLIGA: true,
  supportsDLIG: true,
  supportsCALT: true,
};

export const defaultAppState: AppState = {
  fontName: '',
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

export const sendMessage = async (message: ChromeMessage): Promise<any> => {
  return new Promise(async (resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      // Get the current tab ID if available (for popup context)
      let tabId: number | undefined;
      try {
        if (chrome.tabs) {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          tabId = tabs[0]?.id;
        }
      } catch (e) {
        // Ignore errors getting tab ID
      }

      chrome.runtime.sendMessage({
        ...message,
        tabId, // Include tab ID in message
      }, (response: any) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    } else {
      reject(new Error('Chrome runtime not available'));
    }
  });
};

export const getFontSettings = async (): Promise<FontSettings> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.sync.get(['fontSettings']);
      return result.fontSettings || defaultFontSettings;
    }
    return defaultFontSettings;
  } catch (error) {
    console.error('Error getting font settings:', error);
    return defaultFontSettings;
  }
};

export const saveFontSettings = async (settings: FontSettings): Promise<void> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.sync.set({ fontSettings: settings });
      // Save previous font when a new font is applied
      if (settings.fontFamily && settings.isEnabled) {
        await chrome.storage.sync.set({ previousFont: settings.fontFamily });
      }
    }
  } catch (error) {
    console.error('Error saving font settings:', error);
  }
};

export const getPreviousFont = async (): Promise<string> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.sync.get(['previousFont']);
      return result.previousFont || '';
    }
    return '';
  } catch (error) {
    console.error('Error getting previous font:', error);
    return '';
  }
};

export const getAppState = async (): Promise<AppState> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.sync.get(['appState']);
      if (result.appState) {
        // Convert Set from array
        const state = result.appState;
        if (Array.isArray(state.stylisticSets)) {
          state.stylisticSets = new Set(state.stylisticSets);
        }
        if (Array.isArray(state.textStyles)) {
          state.textStyles = new Set(state.textStyles);
        }
        return state;
      }
    }
    return defaultAppState;
  } catch (error) {
    console.error('Error getting app state:', error);
    return defaultAppState;
  }
};

export const saveAppState = async (state: AppState): Promise<void> => {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      // Convert Set to array for storage
      const stateToSave = {
        ...state,
        stylisticSets: Array.from(state.stylisticSets),
        textStyles: Array.from(state.textStyles),
      };
      await chrome.storage.sync.set({ appState: stateToSave });
      
      // Save previous font when a new font is applied
      if (state.fontName && state.fontName !== state.lastFontName) {
        await chrome.storage.sync.set({ previousFont: state.fontName });
      }
    }
  } catch (error) {
    console.error('Error saving app state:', error);
  }
}; 