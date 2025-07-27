import { FontSettings, ChromeMessage } from '../types';

export const defaultFontSettings: FontSettings = {
  fontFamily: '',
  isEnabled: false,
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
  },
};

export const sendMessage = async (message: ChromeMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage(message, (response: any) => {
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
    }
  } catch (error) {
    console.error('Error saving font settings:', error);
  }
}; 