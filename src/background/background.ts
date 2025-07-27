import { ChromeMessage } from '../types';
import { getFontSettings, saveFontSettings } from '../utils/chrome';

// Handle keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === '_execute_action') {
    const settings = await getFontSettings();
    const newSettings = { ...settings, isEnabled: !settings.isEnabled };
    await saveFontSettings(newSettings);
    
    // Send message to content script to toggle font application
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_EXTENSION',
        payload: newSettings
      });
    }
  }
});

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_FONT_SETTINGS':
      getFontSettings().then(sendResponse);
      return true; // Keep message channel open for async response
      
    case 'UPDATE_FONT_SETTINGS':
      saveFontSettings(message.payload).then(() => {
        // Notify content script of settings change
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'UPDATE_FONT_SETTINGS',
              payload: message.payload
            });
          }
        });
        sendResponse({ success: true });
      });
      return true;
      
    case 'TOGGLE_EXTENSION':
      getFontSettings().then(async (settings) => {
        const newSettings = { ...settings, isEnabled: !settings.isEnabled };
        await saveFontSettings(newSettings);
        
        // Notify content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              type: 'TOGGLE_EXTENSION',
              payload: newSettings
            });
          }
        });
        sendResponse(newSettings);
      });
      return true;
      
    case 'RESET_FONTS':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'RESET_FONTS'
          });
        }
      });
      sendResponse({ success: true });
      return true;
      
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Handle extension installation
chrome.runtime.onInstalled.addListener(async () => {
  console.log('Font Override Extension installed');
  
  // Initialize default settings if not already set
  const settings = await getFontSettings();
  if (!settings) {
    await saveFontSettings({
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
    });
  }
}); 