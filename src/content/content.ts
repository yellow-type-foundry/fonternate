import { FontSettings, ChromeMessage } from '../types';
import { getFontSettings } from '../utils/chrome';

class FontInjector {
  private settings: FontSettings | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Load initial settings
    this.settings = await getFontSettings();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      switch (message.type) {
        case 'UPDATE_FONT_SETTINGS':
        case 'TOGGLE_EXTENSION':
          this.settings = message.payload;
          this.applyFonts();
          break;
        case 'RESET_FONTS':
          this.resetFonts();
          break;
        case 'CHECK_FEATURE_SUPPORT':
          const { fontFamily, feature } = message.payload;
          const isSupported = this.checkFeatureSupport(fontFamily, feature);
          sendResponse({ isSupported });
          return true; // Keep message channel open for async response
      }
    });

    // Apply fonts if extension is enabled
    if (this.settings?.isEnabled && this.settings?.fontFamily) {
      this.applyFonts();
    }
  }

  private checkFeatureSupport(fontFamily: string, feature: string): boolean {
    // Test if the feature is supported by comparing text rendering with and without the feature
    const testText = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const fontSize = '72px';
    
    // Create element with the feature enabled
    const withFeature = document.createElement('span');
    withFeature.style.fontFamily = `"${fontFamily}"`;
    withFeature.style.fontFeatureSettings = `"${feature}"`;
    withFeature.style.position = 'absolute';
    withFeature.style.visibility = 'hidden';
    withFeature.style.fontSize = fontSize;
    withFeature.style.whiteSpace = 'nowrap';
    withFeature.textContent = testText;
    
    // Create element without the feature
    const withoutFeature = document.createElement('span');
    withoutFeature.style.fontFamily = `"${fontFamily}"`;
    withoutFeature.style.fontFeatureSettings = `"${feature}" off`;
    withoutFeature.style.position = 'absolute';
    withoutFeature.style.visibility = 'hidden';
    withoutFeature.style.fontSize = fontSize;
    withoutFeature.style.whiteSpace = 'nowrap';
    withoutFeature.textContent = testText;
    
    document.body.appendChild(withFeature);
    document.body.appendChild(withoutFeature);
    
    // Get measurements BEFORE removing elements
    const widthWith = withFeature.offsetWidth;
    const widthWithout = withoutFeature.offsetWidth;
    const computedWith = window.getComputedStyle(withFeature).fontFeatureSettings;
    
    // Clean up
    document.body.removeChild(withFeature);
    document.body.removeChild(withoutFeature);
    
    // If widths differ significantly, the feature is supported
    // Also check if font-feature-settings was actually applied
    const hasFeature = computedWith.includes(feature);
    
    // Feature is supported if widths differ OR feature is in computed style
    return Math.abs(widthWith - widthWithout) > 1 || hasFeature;
  }

  private applyFonts() {
    if (!this.settings || !this.settings.fontFamily) return;

    if (this.settings.isEnabled) {
      this.injectFontStyle();
    } else {
      this.removeFontStyle();
    }
  }

  private injectFontStyle() {
    if (!this.settings?.fontFamily) return;

    // Remove existing style if present
    this.removeFontStyle();

    // Create and inject style element
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'font-override-style';
    
    // Build CSS with font-family and optional font-feature-settings
    // Only apply font if it's enabled (don't apply fallback)
    let css = `* { font-family: "${this.settings.fontFamily}" !important;`;
    
    // Add text-transform if set
    if (this.settings.textTransform && this.settings.textTransform !== 'none') {
      css += ` text-transform: ${this.settings.textTransform} !important;`;
    }
    
    // Add font-feature-settings if any OpenType features are enabled
    const enabledFeatures = this.getEnabledOpenTypeFeatures();
    if (enabledFeatures.length > 0) {
      css += ` font-feature-settings: ${enabledFeatures.map(f => `"${f}"`).join(', ')} !important;`;
    }
    
    css += ' }';
    
    this.styleElement.textContent = css;
    document.head.appendChild(this.styleElement);
  }

  private getEnabledOpenTypeFeatures(): string[] {
    if (!this.settings?.openTypeFeatures) return [];
    
    const features: string[] = [];
    
    // Add enabled stylistic sets (ss01-ss20)
    for (let i = 1; i <= 20; i++) {
      const ssKey = `ss${i.toString().padStart(2, '0')}` as keyof typeof this.settings.openTypeFeatures;
      if (this.settings.openTypeFeatures[ssKey]) {
        features.push(ssKey);
      }
    }
    
    // Add other OpenType features
    if (this.settings.openTypeFeatures.swsh) features.push('swsh');
    if (this.settings.openTypeFeatures.calt) features.push('calt');
    if (this.settings.openTypeFeatures.dlig) features.push('dlig');
    if (this.settings.openTypeFeatures.liga) features.push('liga');
    
    return features;
  }

  private removeFontStyle() {
    if (this.styleElement) {
      this.styleElement.remove();
      this.styleElement = null;
    }
  }

  private resetFonts() {
    this.removeFontStyle();
  }
}

// Initialize the font injector
const fontInjector = new FontInjector(); 