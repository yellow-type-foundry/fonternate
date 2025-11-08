import { FontSettings, ChromeMessage, AppState } from '../types';
import { getFontSettings, getAppState } from '../utils/chrome';

class FontInjector {
  private settings: FontSettings | null = null;
  private appState: AppState | null = null;
  private styleElement: HTMLStyleElement | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    // Wait for DOM to be ready
    const waitForDOM = (): Promise<void> => {
      return new Promise((resolve) => {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', () => resolve());
        } else {
          resolve();
        }
      });
    };

    await waitForDOM();

    // Load initial settings
    this.settings = await getFontSettings();
    this.appState = await getAppState();
    
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
        case 'APPLY_FONT':
          this.handleApplyFont(message.payload);
          sendResponse({ success: true });
          return true;
        case 'DETECT_CAPABILITIES':
          this.handleDetectCapabilities(message.payload, sendResponse);
          return true; // Keep message channel open for async response
        case 'REVERT_TO_PREVIOUS_FONT':
          this.handleRevertToPreviousFont(message.payload);
          sendResponse({ success: true });
          return true;
        case 'RESET_ALL':
          this.handleResetAll();
          sendResponse({ success: true });
          return true;
        case 'CHECK_FEATURE_SUPPORT':
          const { fontFamily, feature } = message.payload;
          const isSupported = this.checkFeatureSupport(fontFamily, feature);
          sendResponse({ isSupported });
          return true; // Keep message channel open for async response
      }
    });

    // Apply fonts on page load/refresh if font is set
    // Wait a bit more to ensure document.head exists
    setTimeout(() => {
      if (this.appState?.fontName) {
        this.applyFontFromAppState(this.appState);
      } else if (this.settings?.isEnabled && this.settings?.fontFamily) {
        this.applyFonts();
      }
    }, 0);
  }

  private checkFeatureSupport(fontFamily: string, feature: string): boolean {
    // Ensure document.body exists
    if (!document.body) {
      // If body doesn't exist yet, assume feature is supported (will be checked later)
      return true;
    }

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
    
    // Add font-weight (always apply, even if 400)
    css += ` font-weight: ${this.settings.fontWeight || 400} !important;`;
    
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

  private handleApplyFont(payload: {
    fontName: string;
    textTransform: string;
    stylisticSets: number[];
    swashLevel: number;
    liga: boolean;
    dlig: boolean;
    calt: boolean;
  }) {
    if (!payload.fontName?.trim()) {
      this.removeFontStyle();
      return;
    }

    // Ensure document.head exists
    if (!document.head) {
      // Wait for head to be available
      setTimeout(() => this.handleApplyFont(payload), 10);
      return;
    }

    this.removeFontStyle();

    this.styleElement = document.createElement('style');
    this.styleElement.id = 'font-override-style';
    
    let css = `* { font-family: "${payload.fontName}" !important;`;
    
    // Add text-transform if set
    if (payload.textTransform && payload.textTransform !== 'none') {
      css += ` text-transform: ${payload.textTransform} !important;`;
    }
    
    // Build font-feature-settings
    const features: string[] = [];
    
    // Add stylistic sets (with explicit value 1 to enable)
    if (payload.stylisticSets && Array.isArray(payload.stylisticSets) && payload.stylisticSets.length > 0) {
      payload.stylisticSets.forEach(num => {
        // Ensure num is a valid number between 1-20
        const numValue = typeof num === 'number' ? num : parseInt(num, 10);
        if (numValue >= 1 && numValue <= 20) {
          const ssKey = `ss${numValue.toString().padStart(2, '0')}`;
          features.push(`"${ssKey}" 1`);
        }
      });
    }
    
    // Add swash level (with explicit value 1 to enable)
    if (payload.swashLevel > 0) {
      features.push('"swsh" 1');
    }
    
    // Add ligature features - always include them, set to 1 (on) or 0 (off)
    // Ligatures are ON by default in CSS, so we need to explicitly disable them
    features.push(`"liga" ${payload.liga ? '1' : '0'}`);
    features.push(`"dlig" ${payload.dlig ? '1' : '0'}`);
    
    // Add contextual alternates - always include it, set to 1 (on) or 0 (off)
    // Contextual alternates are ON by default in CSS, so we need to explicitly disable them
    features.push(`"calt" ${payload.calt ? '1' : '0'}`);
    
    if (features.length > 0) {
      css += ` font-feature-settings: ${features.join(', ')} !important;`;
    }
    
    css += ' }';
    
    // Debug logging
    console.log('[Fonternate] Applying font:', {
      fontName: payload.fontName,
      stylisticSets: payload.stylisticSets,
      features: features,
      css: css
    });
    
    this.styleElement.textContent = css;
    document.head.appendChild(this.styleElement);
  }

  private async handleDetectCapabilities(
    payload: { fontName: string },
    sendResponse: (response: any) => void
  ) {
    const { fontName } = payload;
    
    if (!fontName?.trim()) {
      sendResponse({
        capabilities: {
          ss: [],
          swashLevels: [],
          supportsLIGA: true,
          supportsDLIG: true,
          supportsCALT: true,
        },
      });
      return;
    }

    // Wait for document.body to be ready if needed
    const waitForBody = (): Promise<void> => {
      return new Promise((resolve) => {
        if (document.body) {
          resolve();
        } else {
          const checkBody = () => {
            if (document.body) {
              resolve();
            } else {
              setTimeout(checkBody, 10);
            }
          };
          checkBody();
        }
      });
    };

    await waitForBody();

    const capabilities = {
      ss: [] as number[],
      swashLevels: [] as number[],
      supportsLIGA: this.checkFeatureSupport(fontName, 'liga'),
      supportsDLIG: this.checkFeatureSupport(fontName, 'dlig'),
      supportsCALT: this.checkFeatureSupport(fontName, 'calt'),
    };

    // Detect stylistic sets (ss01-ss20)
    for (let i = 1; i <= 20; i++) {
      const ssKey = `ss${i.toString().padStart(2, '0')}`;
      if (this.checkFeatureSupport(fontName, ssKey)) {
        capabilities.ss.push(i);
      }
    }

    // Detect swash levels (test swsh feature)
    if (this.checkFeatureSupport(fontName, 'swsh')) {
      capabilities.swashLevels = [0, 1, 2]; // Assume 0-2 levels if swsh is supported
    } else {
      capabilities.swashLevels = [0];
    }

    sendResponse({ capabilities });
  }

  private handleRevertToPreviousFont(payload: { fontName: string }) {
    if (!payload.fontName?.trim()) {
      this.removeFontStyle();
      return;
    }

    // Apply the previous font (simplified - just apply the font name)
    this.removeFontStyle();
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'font-override-style';
    this.styleElement.textContent = `* { font-family: "${payload.fontName}" !important; }`;
    document.head.appendChild(this.styleElement);
  }

  private handleResetAll() {
    // Completely remove font override - reset to original site font
    this.removeFontStyle();
  }

  private applyFontFromAppState(appState: AppState) {
    if (!appState.fontName?.trim()) {
      this.removeFontStyle();
      return;
    }

    this.handleApplyFont({
      fontName: appState.fontName,
      textTransform: appState.textTransform,
      stylisticSets: Array.from(appState.stylisticSets),
      swashLevel: appState.swashLevel,
      liga: appState.liga,
      dlig: appState.dlig,
      calt: appState.calt,
    });
  }
}

// Initialize the font injector
const fontInjector = new FontInjector(); 