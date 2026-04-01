import { FontSettings, ChromeMessage, AppState } from '../types';
import { getFontSettings, getAppState } from '../utils/chrome';
import { getInstalledFonts, InstalledFont } from '../utils/fontDetection';
import { initPinnedPanelFromStorage, togglePinnedPanel } from './pinnedPanel';

class FontInjector {
  private settings: FontSettings | null = null;
  private appState: AppState | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private installedFontsCache: Array<{ family: string; fullName: string }> = [];

  constructor() {
    console.log('[Fonternate] Content script initialized');
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
    
    // Safari-specific: Ensure document.head exists and is accessible
    // Sometimes Safari needs a small delay even after DOMContentLoaded
    if (!document.head) {
      console.warn('[Fonternate] document.head not available, waiting...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Verify we can access document.head
    if (!document.head) {
      console.error('[Fonternate] ❌ CRITICAL: document.head is not available!');
      console.error('[Fonternate] This will prevent CSS injection from working.');
      return;
    }
    
    console.log('[Fonternate] ✅ document.head is available:', document.head);

    // Load initial settings
    this.settings = await getFontSettings();
    this.appState = await getAppState();
    
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      console.log('[Fonternate] Received message:', message.type, message.payload);
      
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
          try {
            console.log('[Fonternate] APPLY_FONT message received, payload:', message.payload);
            this.handleApplyFont(message.payload);
            sendResponse({ success: true });
          } catch (error) {
            console.error('[Fonternate] Error in handleApplyFont:', error);
            sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
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
        case 'CHECK_FONT_WEIGHTS':
          this.handleCheckFontWeights(message.payload, sendResponse);
          return true; // Keep message channel open for async response
        case 'DETECT_PAGE_FONTS':
          this.handleDetectPageFonts(sendResponse);
          return true; // Keep message channel open for async response
        case 'TOGGLE_PINNED_PANEL':
          togglePinnedPanel();
          sendResponse({ success: true });
          return true;
      }
    });

    void initPinnedPanelFromStorage();

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

  private async resolveExactFontName(userInput: string): Promise<string> {
    // Try to match user input to exact system font name
    // Note: Native messaging doesn't work in content scripts, so we use cached fonts
    // or fallback to user input if cache is empty
    try {
      // Use cached fonts if available (from previous lookups)
      let installedFonts = this.installedFontsCache;
      
      // If cache is empty, try to get fonts (but this will likely fail in content script)
      if (installedFonts.length === 0) {
        try {
          installedFonts = await getInstalledFonts();
          this.installedFontsCache = installedFonts;
        } catch (error) {
          // Native messaging not available in content script - this is expected
          // The popup should have already resolved the font name before sending it
          console.log('[Fonternate] Cannot resolve font name in content script (native messaging not available)');
          console.log('[Fonternate] Using font name as-is - popup should have resolved it:', userInput);
          return userInput.trim();
        }
      }
      
      const lowerInput = userInput.trim().toLowerCase();
      
      // Look for exact match (case-insensitive)
      const exactMatch = installedFonts.find(font => 
        font.family.toLowerCase() === lowerInput ||
        font.fullName.toLowerCase() === lowerInput
      );
      
      if (exactMatch) {
        console.log('[Fonternate] Resolved font name:', userInput, '->', exactMatch.family);
        return exactMatch.family;
      }
      
      // If no exact match, return user input as-is
      // The popup should have already resolved it, so this should be the exact name
      return userInput.trim();
    } catch (error) {
      console.warn('[Fonternate] Failed to resolve font name, using input as-is:', error);
      return userInput.trim();
    }
  }

  private async handleApplyFont(payload: {
    fontName: string;
    fontWeight?: number | string;  // CSS font-weight value (e.g., 400, 700, "bold")
    fontStyle?: 'normal' | 'italic';
    textTransform: string;
    stylisticSets: number[];
    swashLevel: number;
    liga: boolean;
    dlig: boolean;
    calt: boolean;
    textStyles?: string[];
    tracking?: number;              // Letter-spacing in em units
    fontSize?: number;               // Font-size in px units
    leading?: number;               // Line-height (unitless)
  }) {
    if (!payload.fontName?.trim()) {
      this.removeFontStyle();
      return;
    }

    // The popup already resolves font names to exact system names before sending
    // Native messaging doesn't work in content scripts, so we trust the popup's resolution
    // If resolution is needed, it should happen in the popup, not here
    const exactFontName = payload.fontName.trim();
    console.log('[Fonternate] Applying font:', exactFontName, 'with weight:', payload.fontWeight);
    
    // Safari-specific: Verify font exists before applying
    // This helps catch cases where font name doesn't match system
    const testText = 'Ag';
    const fontSize = '72px';
    const fontExists = this.checkFontExists(exactFontName, testText, fontSize);
    console.log('[Fonternate] Font verification:', fontExists ? '✅ Font exists' : '❌ Font not found');
    
    if (!fontExists) {
      console.warn('[Fonternate] ⚠️ WARNING: Font "' + exactFontName + '" not verified as available!');
      console.warn('[Fonternate] Font may not render correctly. Check native messaging logs for exact font name.');
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
    
    // Build CSS selector based on textStyles
    // If textStyles is empty or not provided, apply to all elements (*)
    // Otherwise, apply only to selected text styles
    const selector = (payload.textStyles && payload.textStyles.length > 0)
      ? payload.textStyles.join(', ')
      : '*';
    
    // Build a comprehensive stack of font-family variants to maximize matching
    const buildFontFamilyStack = (fontName: string): string[] => {
      const variants = new Set<string>();
      const trimmed = fontName.trim();
      const lower = trimmed.toLowerCase();
      if (!trimmed) return [];
      
      // Original variations
      variants.add(trimmed);
      variants.add(lower);
      variants.add(lower.toUpperCase());
      variants.add(this.capitalizeFontName(trimmed));
      
      // Try with spaces/hyphens if already has them
      if (trimmed.includes('-')) {
        const withSpaces = trimmed.replace(/-/g, ' ');
        variants.add(withSpaces);
        variants.add(this.capitalizeFontName(withSpaces));
      }
      if (trimmed.includes(' ')) {
        const withHyphens = trimmed.replace(/\s+/g, '-');
        variants.add(withHyphens);
        variants.add(this.capitalizeFontName(withHyphens));
      }
      
      // For names like "ytfmillie", try splitting into "YTF Millie" pattern
      // Look for common patterns: prefix + family name
      const commonPrefixes = ['ytf', 'ltf', 'otf', 'ttf', 'sf'];
      for (const prefix of commonPrefixes) {
        if (lower.startsWith(prefix) && lower.length > prefix.length) {
          const familyPart = lower.slice(prefix.length);
          if (familyPart.length > 2) {
            // Try "YTF Millie" or "SF Pro" format
            const spaced = `${prefix.toUpperCase()} ${this.capitalizeFontName(familyPart)}`;
            variants.add(spaced);
            // Try "YTFMillie" or "SFPro" format
            const noSpace = `${prefix.toUpperCase()}${this.capitalizeFontName(familyPart)}`;
            variants.add(noSpace);
            // Try just the family name
            variants.add(this.capitalizeFontName(familyPart));
          }
        }
      }
      
      // Special handling for Apple system fonts
      // "SF Pro" might be registered as "SF Pro Text", "SF Pro Display", etc.
      if (lower.startsWith('sf pro')) {
        variants.add('SF Pro Text');
        variants.add('SF Pro Display');
        variants.add('SFPro Text');
        variants.add('SFPro Display');
      }
      if (lower.startsWith('sf mono')) {
        variants.add('SF Mono');
        variants.add('SFMono');
      }
      
      // For multi-word names, try common variations
      const words = trimmed.split(/\s+/);
      if (words.length >= 2) {
        // Try "Word1Word2" format
        const noSpace = words.join('');
        variants.add(noSpace);
        variants.add(this.capitalizeFontName(noSpace));
        // Try "Word1-Word2" format
        const hyphenated = words.join('-');
        variants.add(hyphenated);
        variants.add(this.capitalizeFontName(hyphenated));
      }
      
      return Array.from(variants.values());
    };
    
    // CRITICAL: Use the resolved exact font name (already resolved above)
    // This ensures the browser uses the actual installed font, not a synthesized version
    
    // Build variations as fallbacks only (use resolved name)
    const familyStack = buildFontFamilyStack(exactFontName);
    
    // Build final stack: EXACT name first, then variations
    const finalStack: string[] = [];
    
    // 1. Add the EXACT font name first (this is the most important!)
    if (exactFontName) {
      finalStack.push(exactFontName);
    }
    
    // 2. For system fonts, add known actual system font names if they exist
    // This handles cases like "SF Pro" -> "SF Pro Text" / "SF Pro Display"
    const lowerInput = exactFontName.toLowerCase();
    if (lowerInput.includes('sf pro') || lowerInput === 'sfpro') {
      // SF Pro fonts on macOS are actually "SF Pro Text" and "SF Pro Display"
      if (!finalStack.includes('SF Pro Text')) finalStack.push('SF Pro Text');
      if (!finalStack.includes('SF Pro Display')) finalStack.push('SF Pro Display');
    }
    if (lowerInput.includes('sf mono') || lowerInput === 'sfmono') {
      if (!finalStack.includes('SF Mono')) finalStack.push('SF Mono');
    }
    
    // 3. Add variations from buildFontFamilyStack as fallbacks (excluding exact name)
    for (const variant of familyStack) {
      const variantLower = variant.toLowerCase();
      const exactLower = exactFontName.toLowerCase();
      
      // Skip if it's the exact same as the input (already added first)
      if (variantLower === exactLower) continue;
      
      // Skip if already in stack
      if (finalStack.some(f => f.toLowerCase() === variantLower)) continue;
      
      // Add variation as fallback
      finalStack.push(variant);
    }
    
    const familyCss = finalStack.map(name => `"${name}"`).join(', ');
    
    console.log('[Fonternate] Input font name (EXACT):', exactFontName);
    console.log('[Fonternate] Final font stack (exact name first):', finalStack);
    console.log('[Fonternate] Final CSS font-family:', familyCss);
    
    // IMPORTANT: Log a warning if the font name contains spaces or special characters
    // Some fonts might need to be referenced differently
    if (exactFontName.includes(' ') || exactFontName.includes('-')) {
      console.log('[Fonternate] Font name contains spaces/hyphens - ensure exact match from system');
    }
    
    // Safari Web Extensions: Use maximum specificity and multiple selectors
    // Safari treats injected styles as user styles, so we need aggressive specificity
    // Use both html * and body * to ensure maximum coverage
    let cssSelectors: string[];
    if (selector === '*') {
      // For universal, use multiple high-specificity selectors
      cssSelectors = [
        'html *',
        'body *',
        'html body *',
        '*'
      ];
    } else {
      // For specific selectors, add html and body prefixes
      const baseSelectors = selector.split(',').map(s => s.trim());
      cssSelectors = [
        ...baseSelectors.map(s => `html ${s}`),
        ...baseSelectors.map(s => `body ${s}`),
        ...baseSelectors.map(s => `html body ${s}`),
        ...baseSelectors
      ];
    }
    
    // Build all CSS properties first
    const fontWeightValue = (() => {
      if (payload.fontWeight === undefined) return 400;
      if (typeof payload.fontWeight === 'number') return payload.fontWeight;
      return this.getFontWeightValue(payload.fontWeight);
    })();
    console.log('[Fonternate] Applied font-weight:', fontWeightValue);

    const italicOn =
      payload.fontStyle === 'italic' ||
      (typeof payload.fontStyle === 'string' && payload.fontStyle.toLowerCase().trim() === 'italic');
    console.log('[Fonternate] fontStyle payload:', payload.fontStyle, '→', italicOn ? 'italic' : 'normal');
    
    // Collect all CSS properties
    const cssProperties: string[] = [
      `font-family: ${familyCss} !important`,
      `font-weight: ${fontWeightValue} !important`,
      `font-style: ${italicOn ? 'italic' : 'normal'} !important`,
    ];
    // Sites often set font-synthesis: none, which blocks faux italic; re-enable when italic is requested
    if (italicOn) {
      cssProperties.push(`font-synthesis: weight style !important`);
    }
    
    // Add tracking (letter-spacing) if textStyles are selected
    if (payload.textStyles && payload.textStyles.length > 0 && payload.tracking !== undefined) {
      cssProperties.push(`letter-spacing: ${payload.tracking}em !important`);
    }
    
    // Add font-size if textStyles are selected
    if (payload.textStyles && payload.textStyles.length > 0 && payload.fontSize !== undefined) {
      cssProperties.push(`font-size: ${payload.fontSize}px !important`);
    }
    
    // Add leading (line-height) if textStyles are selected
    if (payload.textStyles && payload.textStyles.length > 0 && payload.leading !== undefined) {
      cssProperties.push(`line-height: ${payload.leading} !important`);
    }
    
    // Add text-transform if set
    if (payload.textTransform && payload.textTransform !== 'none') {
      cssProperties.push(`text-transform: ${payload.textTransform} !important`);
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
      cssProperties.push(`font-feature-settings: ${features.join(', ')} !important`);
    }
    
    // Create CSS rule for each selector with all properties
    // Safari needs multiple high-specificity rules to override site styles
    const css = cssSelectors.map(sel => 
      `${sel} { ${cssProperties.join('; ')}; }`
    ).join('\n');
    
    console.log('[Fonternate] Generated CSS:', css);
    console.log('[Fonternate] Font-family stack:', familyCss);
    console.log('[Fonternate] Selector:', selector);
    
    // Safari-specific: Try to load/verify font before applying
    // This ensures Safari actually has the font available
    if (document.fonts && document.fonts.load) {
      try {
        const fontSpec = `16px "${exactFontName}"`;
        console.log('[Fonternate] Attempting to load font:', fontSpec);
        await document.fonts.load(fontSpec);
        const isLoaded = document.fonts.check(fontSpec);
        console.log('[Fonternate] Font load result:', isLoaded ? '✅ Loaded' : '❌ Not loaded');
        
        // Also try with font-weight
        const fontSpecWithWeight = `${fontWeightValue} 16px "${exactFontName}"`;
        await document.fonts.load(fontSpecWithWeight);
        const isLoadedWithWeight = document.fonts.check(fontSpecWithWeight);
        console.log('[Fonternate] Font with weight load result:', isLoadedWithWeight ? '✅ Loaded' : '❌ Not loaded');

        if (italicOn) {
          const fontSpecItalic = `italic ${fontWeightValue} 16px "${exactFontName}"`;
          await document.fonts.load(fontSpecItalic);
          const italicLoaded = document.fonts.check(fontSpecItalic);
          console.log('[Fonternate] Italic face load:', italicLoaded ? '✅ Loaded' : '❌ Not loaded');
        }
      } catch (error) {
        console.warn('[Fonternate] Font loading failed (may not be available):', error);
      }
    }
    
    this.styleElement.textContent = css;
    
    // Ensure document.head exists
    if (!document.head) {
      console.error('[Fonternate] document.head does not exist! Retrying...');
      setTimeout(() => this.handleApplyFont(payload), 10);
      return;
    }
    
    // Remove any existing style element first
    const existingStyle = document.getElementById('font-override-style');
    if (existingStyle) {
      existingStyle.remove();
      console.log('[Fonternate] Removed existing style element');
    }
    
    // Safari-specific: Use insertBefore to ensure style is at the beginning of head
    // This can help with CSS specificity in Safari
    const firstChild = document.head.firstChild;
    if (firstChild) {
      document.head.insertBefore(this.styleElement, firstChild);
      console.log('[Fonternate] ✅ Style element inserted at beginning of document.head (Safari optimization)');
    } else {
      document.head.appendChild(this.styleElement);
      console.log('[Fonternate] ✅ Style element appended to document.head');
    }
    
    // Force immediate reflow to ensure Safari applies styles
    void document.documentElement.offsetHeight;
    void document.body?.offsetHeight;
    
    // Verify style was injected immediately
    const injectedStyle = document.getElementById('font-override-style');
    if (!injectedStyle) {
      console.error('[Fonternate] ❌ CRITICAL: Failed to inject style element - element not found after appendChild');
      console.error('[Fonternate] document.head exists:', !!document.head);
      console.error('[Fonternate] document.head children:', document.head?.children.length || 0);
      console.error('[Fonternate] This is a critical error - CSS will not be applied!');
    } else {
      console.log('[Fonternate] ✅ Style element verified in DOM');
      console.log('[Fonternate] Style element content length:', injectedStyle.textContent?.length || 0);
      console.log('[Fonternate] Style element position in head:', Array.from(document.head.children).indexOf(injectedStyle));
      
      // Safari-specific: Log the actual CSS content for debugging
      const cssContent = injectedStyle.textContent || '';
      console.log('[Fonternate] Actual CSS in DOM (first 200 chars):', cssContent.substring(0, 200));
      
      // Force a reflow to ensure styles are applied
      void document.body?.offsetHeight;
      
      // Check what font is actually being used after a brief delay
      // Use the same selector as the CSS to test on the right elements
      setTimeout(() => {
        if (document.body) {
          // Use the actual selector from the CSS (e.g., "h1" or "*")
          const testSelector = selector;
          let testEl: HTMLElement | null = null;
          
          // Try to find an existing element matching the selector
          if (testSelector !== '*') {
            const existingElements = document.querySelectorAll(testSelector);
            if (existingElements.length > 0) {
              testEl = existingElements[0] as HTMLElement;
            }
          }
          
          // If no existing element, create one with the right tag
          if (!testEl) {
            const tagName = testSelector === '*' ? 'span' : testSelector.split(',')[0].trim();
            testEl = document.createElement(tagName);
            testEl.style.position = 'absolute';
            testEl.style.visibility = 'hidden';
            testEl.textContent = 'Ag';
            document.body.appendChild(testEl);
          }
          
          // Force reflow
          void testEl.offsetWidth;
          
          const computed = window.getComputedStyle(testEl).fontFamily;
          console.log('[Fonternate] Computed font-family after application:', computed);
          console.log('[Fonternate] Expected font:', payload.fontName);
          console.log('[Fonternate] CSS selector used:', selector);
          
          // Check if font is actually being used (not synthesized)
          const computedLower = computed.toLowerCase();
          const expectedLower = payload.fontName.toLowerCase();
          
          // Check for exact match or variations
          const expectedVariants = [
            expectedLower,
            expectedLower.replace(/\s+/g, ''),
            expectedLower.replace(/\s+/g, '-'),
            expectedLower.replace(/\s+/g, '_'),
          ];
          
          // For SF Pro, also check for system font names
          if (expectedLower.includes('sf pro') || expectedLower === 'sfpro') {
            expectedVariants.push('sf pro text', 'sf pro display', 'sfpro text', 'sfpro display');
          }
          
          const fontMatch = expectedVariants.some(variant => computedLower.includes(variant)) ? '✅ YES' : '❌ NO';
          console.log('[Fonternate] Font match:', fontMatch);
          
          // Check if font is synthesized by comparing dimensions with fallback
          const fallbackEl = document.createElement(testEl.tagName);
          fallbackEl.style.position = 'absolute';
          fallbackEl.style.visibility = 'hidden';
          fallbackEl.style.fontSize = '72px';
          fallbackEl.style.whiteSpace = 'nowrap';
          fallbackEl.style.fontFamily = 'monospace';
          fallbackEl.textContent = 'Ag';
          document.body.appendChild(fallbackEl);
          
          testEl.style.fontSize = '72px';
          testEl.style.whiteSpace = 'nowrap';
          void testEl.offsetWidth;
          void fallbackEl.offsetWidth;
          
          const testWidth = testEl.offsetWidth;
          const testHeight = testEl.offsetHeight;
          const fallbackWidth = fallbackEl.offsetWidth;
          const fallbackHeight = fallbackEl.offsetHeight;
          
          const widthDiffers = Math.abs(testWidth - fallbackWidth) > 2;
          const heightDiffers = Math.abs(testHeight - fallbackHeight) > 0.5;
          const dimensionsDiffer = widthDiffers || heightDiffers;
          
          const isActuallyUsed = dimensionsDiffer;
          const isSynthesized = !dimensionsDiffer && fontMatch === '❌ NO';
          
          console.log('[Fonternate] Font rendering check:', {
            testDimensions: `${testWidth}x${testHeight}`,
            fallbackDimensions: `${fallbackWidth}x${fallbackHeight}`,
            dimensionsDiffer,
            isActuallyUsed: isActuallyUsed ? '✅ YES (font is rendering)' : '❌ NO (font not rendering - using fallback)',
            isSynthesized: isSynthesized ? '⚠️ YES (likely synthesized)' : '✅ NO (real font)',
            computedFont: computed,
            expectedFont: payload.fontName,
          });
          
          // If font isn't actually being used, log detailed diagnostics
          if (!isActuallyUsed) {
            console.error('[Fonternate] ❌ Font is NOT being used! Diagnostics:');
            console.error('[Fonternate] 1. CSS injected:', css.substring(0, 100) + '...');
            console.error('[Fonternate] 2. Computed font:', computed);
            console.error('[Fonternate] 3. Expected font:', payload.fontName);
            console.error('[Fonternate] 4. Dimensions match fallback:', !dimensionsDiffer, '- Font is falling back!');
            console.error('[Fonternate] 5. Possible causes:');
            console.error('[Fonternate]    - Font name mismatch (check exact system name)');
            console.error('[Fonternate]    - Site styles overriding with higher specificity');
            console.error('[Fonternate]    - Font not available in Safari context');
            console.error('[Fonternate]    - Need to use PostScript name instead of family name');
          }
          
          // If font didn't match, log a warning with suggestions
          if (fontMatch === '❌ NO') {
            console.warn('[Fonternate] ⚠️ Font name not in computed style! Possible issues:');
            console.warn('[Fonternate] 1. Font name might be different in system. Check native messaging logs.');
            console.warn('[Fonternate] 2. Font might need PostScript name instead of family name.');
            console.warn('[Fonternate] 3. CSS selector might be too specific or overridden by site styles.');
          }
          
          // Clean up only if we created the element
          if (testEl.parentElement === document.body && testEl.tagName.toLowerCase() !== testSelector.split(',')[0].trim().toLowerCase()) {
            document.body.removeChild(testEl);
          }
          document.body.removeChild(fallbackEl);
        } else {
          console.warn('[Fonternate] document.body not available for font verification');
        }
      }, 200);
    }
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

    await this.waitForBody();

    // IMPORTANT: Check if font exists first before detecting capabilities
    // Use the exact font name as provided (may include weight suffix)
    const testText = 'Ag';
    const fontSize = '72px';
    const fontExists = this.checkFontExists(fontName, testText, fontSize);
    
    // For system fonts, be more lenient - they might be available even if detection is strict
    const isSystemFont = /^(sf|helvetica|arial|times|georgia|verdana|courier|system)/i.test(fontName.toLowerCase());
    const shouldProceed = fontExists || isSystemFont;
    
    console.log('[Fonternate] Detecting capabilities for font:', fontName);
    console.log('[Fonternate] Font exists:', fontExists);
    if (isSystemFont && !fontExists) {
      console.log('[Fonternate] System font detected - proceeding with capability detection despite strict check');
    }
    
    // If font doesn't exist and it's not a system font, return default capabilities
    // This prevents false positives from fallback fonts
    if (!shouldProceed) {
      console.warn('[Fonternate] Font does not exist - returning default capabilities');
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

  private async handleCheckFontWeights(
    payload: { baseFontName: string; weightSuffixes: string[]; userTypedFontName?: string; userWeightSuffix?: string | null },
    sendResponse: (response: any) => void
  ) {
    const { baseFontName, weightSuffixes, userTypedFontName, userWeightSuffix } = payload;
    
    console.log('========================================');
    console.log('[Fonternate] === FONT WEIGHT DETECTION START ===');
    console.log('[Fonternate] Base font name:', baseFontName);
    console.log('[Fonternate] User typed font name:', userTypedFontName || '(none)');
    console.log('[Fonternate] User weight suffix:', userWeightSuffix || '(none)');
    console.log('[Fonternate] Weight suffixes to check:', weightSuffixes);
    
    if (!baseFontName?.trim() || !weightSuffixes || weightSuffixes.length === 0) {
      console.log('[Fonternate] ✗ Invalid input - returning empty weights');
      console.log('[Fonternate] === FONT WEIGHT DETECTION END ===');
      console.log('========================================');
      sendResponse({ availableWeights: [] });
      return;
    }

    await this.waitForBody();

    const availableWeights: string[] = [];
    const testText = 'Ag';
    const fontSize = '72px';
    // Capture whether the user-typed font (with suffix) exists and supports CSS weights
    const typedFontExists = userTypedFontName
      ? this.checkFontExists(userTypedFontName, testText, fontSize)
      : false;
    const typedFontSupportsWeights = typedFontExists && userTypedFontName
      ? this.checkFontSupportsWeights(userTypedFontName, testText, fontSize)
      : null;
    console.log('[Fonternate] │  User-typed font exists:', typedFontExists);
    console.log('[Fonternate] │  User-typed font supports weights via CSS:', typedFontSupportsWeights);

    console.log('[Fonternate] ┌─ Unified weight detection (numeric first)');
    console.log('[Fonternate] │  Detecting all available weights...');

    // First, check if base font exists
    console.log('[Fonternate] │  Checking if base font exists:', baseFontName);
    const baseFontExists = this.checkFontExists(baseFontName, testText, fontSize);
    console.log('[Fonternate] │  Base font exists:', baseFontExists);
    
    const baseFontSupportsWeights = baseFontExists ? this.checkFontSupportsWeights(baseFontName, testText, fontSize) : null;
    console.log('[Fonternate] │  Base font supports weights via CSS:', baseFontSupportsWeights);

    // If either base font or the exact user-typed font supports CSS weights, allow all weights
    if (
      (baseFontExists && baseFontSupportsWeights) ||
      (typedFontExists && typedFontSupportsWeights)
    ) {
      const fontUsed = (baseFontExists && baseFontSupportsWeights)
        ? baseFontName
        : (userTypedFontName || baseFontName);
      console.log('[Fonternate] │  ✓ Font supports weights via CSS:', fontUsed);
      console.log('[Fonternate] │  → Enabling ALL weights:', weightSuffixes);
      console.log('[Fonternate] └─ Returning all weights');
      console.log('[Fonternate] === FONT WEIGHT DETECTION END ===');
      console.log('========================================');
      sendResponse({ availableWeights: weightSuffixes });
      return;
    }

    // If base font doesn't exist, try to find ANY weight-specific font name that exists
    // This helps detect fonts that only exist with weight suffixes (e.g., "ytfmillie-regular" exists but "ytfmillie" doesn't)
    let existingWeightFontName: string | null = null;
    if (!baseFontExists && typedFontExists && userTypedFontName) {
      existingWeightFontName = userTypedFontName;
    } else if (!baseFontExists) {
      console.log('[Fonternate] │  Base font does not exist - checking for weight-specific font names');
      // Try common weight suffixes to find an existing font name
      const commonWeights = ['regular', 'normal', 'medium', 'bold', 'light', 'thin'];
      for (const weight of commonWeights) {
        const testFontName = `${baseFontName}-${weight}`;
        console.log('[Fonternate] │  Checking:', testFontName);
        if (this.checkFontExists(testFontName, testText, fontSize)) {
          console.log('[Fonternate] │  ✓ Found existing weight-specific font:', testFontName);
          existingWeightFontName = testFontName;
          // Check if this font supports weights via CSS
          const supportsWeights = this.checkFontSupportsWeights(testFontName, testText, fontSize);
          console.log('[Fonternate] │  Supports weights via CSS:', supportsWeights);
          if (supportsWeights) {
            console.log('[Fonternate] │  → Enabling ALL weights via CSS');
            console.log('[Fonternate] └─ Returning all weights');
            console.log('[Fonternate] === FONT WEIGHT DETECTION END ===');
            console.log('========================================');
            sendResponse({ availableWeights: weightSuffixes });
            return;
          }
          break;
        }
      }
    }

    // Build candidates for CSS-based weight checks, preferring ones that actually respond to weights
    const cssCheckCandidates: Array<{ name: string; supports: boolean | null; exists: boolean }> = [];
    if (baseFontExists) {
      cssCheckCandidates.push({ name: baseFontName, supports: baseFontSupportsWeights, exists: true });
    }
    if (typedFontExists && userTypedFontName && userTypedFontName !== baseFontName) {
      cssCheckCandidates.push({ name: userTypedFontName, supports: typedFontSupportsWeights, exists: true });
    }
    if (existingWeightFontName && existingWeightFontName !== baseFontName && existingWeightFontName !== userTypedFontName) {
      const supports = this.checkFontSupportsWeights(existingWeightFontName, testText, fontSize);
      cssCheckCandidates.push({ name: existingWeightFontName, supports, exists: true });
    }

    const cssCapable = cssCheckCandidates.find(c => c.supports);
    const fontNameForCSSChecks: string = cssCapable?.name
      || cssCheckCandidates[0]?.name
      || baseFontName;
    const fontExistsForCSSChecks = cssCheckCandidates.length > 0;
    
    console.log('[Fonternate] │  Font name for CSS checks:', fontNameForCSSChecks);
    console.log('[Fonternate] │  Font exists for CSS checks:', fontExistsForCSSChecks);
    console.log('[Fonternate] │  Checking each weight individually (numeric first) ...');

    // Check each weight suffix
    // Prioritize CSS font-weight checks FIRST, then fall back to font name variations
    for (const suffix of weightSuffixes) {
      // Get the numeric weight value for this suffix
      const weightValue = this.getWeightValueForSuffix(suffix);
      
      if (weightValue === null) {
        console.log(`[Fonternate] │  ✗ Weight ${suffix} has no numeric value - skipping`);
        continue;
      }
      
      let isAvailable = false;
      
      // METHOD 1 (PRIORITY): Check CSS font-weight support FIRST
      if (fontExistsForCSSChecks && fontNameForCSSChecks) {
        console.log(`[Fonternate] │  [${suffix} (${weightValue})] Checking CSS font-weight using: ${fontNameForCSSChecks}`);
        if (this.checkFontWeightSupported(fontNameForCSSChecks, weightValue, testText, fontSize)) {
          console.log(`[Fonternate] │  [${suffix} (${weightValue})] ✓ Supported via CSS font-weight`);
          isAvailable = true;
        } else {
          console.log(`[Fonternate] │  [${suffix} (${weightValue})] ✗ Not supported via CSS font-weight`);
        }
      }
      
      // METHOD 2 (FALLBACK): Check font name variations if CSS font-weight check failed
      if (!isAvailable) {
        const fontNameVariations = Array.from(new Set([
          userTypedFontName,
          userTypedFontName ? this.capitalizeFontName(userTypedFontName) : null,
          `${baseFontName}-${suffix}`,
          `${baseFontName} ${suffix}`,
          this.capitalizeFontName(`${baseFontName}-${suffix}`),
          this.capitalizeFontName(`${baseFontName} ${suffix}`),
          existingWeightFontName,
        ].filter(Boolean) as string[]));
        
        console.log(`[Fonternate] │  [${suffix} (${weightValue})] Trying font name variations...`);
        for (const fontName of fontNameVariations) {
          if (this.checkFontExists(fontName, testText, fontSize)) {
            console.log(`[Fonternate] │  [${suffix} (${weightValue})] ✓ Found: "${fontName}"`);
            isAvailable = true;
            break;
          }
        }
        if (!isAvailable) {
          console.log(`[Fonternate] │  [${suffix} (${weightValue})] ✗ Not found in any variation`);
        }
      }
      
      if (isAvailable) {
        availableWeights.push(suffix);
        console.log(`[Fonternate] │  [${suffix}] → ENABLED`);
      } else {
        console.log(`[Fonternate] │  [${suffix}] → DISABLED`);
      }
    }

    console.log('[Fonternate] │  Available weights detected:', availableWeights);
    
    // If no weights detected, err on the side of enabling rather than disabling
    if (availableWeights.length === 0) {
      console.log('[Fonternate] │  No weights detected - enabling all weights to avoid fallback disabling');
      availableWeights.push(...weightSuffixes);
    }
    
    console.log('[Fonternate] └─ Final available weights:', availableWeights);
    console.log('[Fonternate] === FONT WEIGHT DETECTION END ===');
    console.log('========================================');
    
    sendResponse({ availableWeights });
  }

  /**
   * Get numeric weight value for a suffix
   */
  private getWeightValueForSuffix(suffix: string): number | null {
    const weightMap: Record<string, number> = {
      'thin': 100,
      'hairline': 100,
      'extralight': 200,
      'ultra-light': 200,
      'light': 300,
      'regular': 400,
      'normal': 400,
      'medium': 500,
      'semibold': 600,
      'demi-bold': 600,
      'bold': 700,
      'extrabold': 800,
      'ultra-bold': 800,
      'black': 900,
      'heavy': 900,
    };
    return weightMap[suffix.toLowerCase()] || null;
  }

  /**
   * Check if base font supports weights via CSS font-weight
   */
  private checkFontSupportsWeights(baseFontName: string, testText: string, fontSize: string): boolean {
    // Check if font responds to different font-weight values
    // Test with weight 400 (normal) and weight 700 (bold)
    // Also test with weight 800 (extrabold/heavy) to catch fonts like ytfmillie-heavy
    const normalWorks = this.checkFontWeightSupported(baseFontName, 400, testText, fontSize);
    const boldWorks = this.checkFontWeightSupported(baseFontName, 700, testText, fontSize);
    const heavyWorks = this.checkFontWeightSupported(baseFontName, 800, testText, fontSize);
    
    // If font responds to at least two different weights, it supports weight variations
    // This is more lenient - allows fonts that support weights even if not all weights work
    const weightCount = [normalWorks, boldWorks, heavyWorks].filter(Boolean).length;
    const supportsWeights = weightCount >= 2;
    
    console.log('[Fonternate] Font weight support check:', {
      fontName: baseFontName,
      normal: normalWorks,
      bold: boldWorks,
      heavy: heavyWorks,
      supportsWeights
    });
    
    return supportsWeights;
  }

  /**
   * Check if a font supports a specific CSS font-weight value
   */
  private checkFontWeightSupported(fontFamily: string, weight: number, testText: string, fontSize: string): boolean {
    if (!document.body) return false;

    // Create test element with the font and specific weight
    const testElement = document.createElement('span');
    testElement.style.fontFamily = `"${fontFamily}"`;
    testElement.style.fontWeight = weight.toString();
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.fontSize = fontSize;
    testElement.style.whiteSpace = 'nowrap';
    testElement.style.fontStyle = 'normal';
    testElement.style.fontVariant = 'normal';
    testElement.style.fontStretch = 'normal';
    testElement.textContent = testText;
    
    // Create comparison element with a different weight (100 for light weights, 700 for heavy weights)
    const comparisonWeight = weight < 400 ? 100 : weight > 400 ? 700 : 400;
    const comparisonElement = document.createElement('span');
    comparisonElement.style.fontFamily = `"${fontFamily}"`;
    comparisonElement.style.fontWeight = comparisonWeight.toString();
    comparisonElement.style.position = 'absolute';
    comparisonElement.style.visibility = 'hidden';
    comparisonElement.style.fontSize = fontSize;
    comparisonElement.style.whiteSpace = 'nowrap';
    comparisonElement.style.fontStyle = 'normal';
    comparisonElement.style.fontVariant = 'normal';
    comparisonElement.style.fontStretch = 'normal';
    comparisonElement.textContent = testText;
    
    // Create fallback element
    const fallbackElement = document.createElement('span');
    fallbackElement.style.fontFamily = 'monospace';
    fallbackElement.style.fontWeight = weight.toString();
    fallbackElement.style.position = 'absolute';
    fallbackElement.style.visibility = 'hidden';
    fallbackElement.style.fontSize = fontSize;
    fallbackElement.style.whiteSpace = 'nowrap';
    fallbackElement.style.fontStyle = 'normal';
    fallbackElement.textContent = testText;
    
    document.body.appendChild(testElement);
    document.body.appendChild(comparisonElement);
    document.body.appendChild(fallbackElement);
    
    // Force reflow
    void testElement.offsetWidth;
    void comparisonElement.offsetWidth;
    void fallbackElement.offsetWidth;
    
    const computedFont = window.getComputedStyle(testElement).fontFamily.toLowerCase();
    const computedWeight = parseInt(window.getComputedStyle(testElement).fontWeight, 10);
    const testWidth = testElement.offsetWidth;
    const testHeight = testElement.offsetHeight;
    const comparisonWidth = comparisonElement.offsetWidth;
    const comparisonHeight = comparisonElement.offsetHeight;
    const fallbackWidth = fallbackElement.offsetWidth;
    const fallbackHeight = fallbackElement.offsetHeight;
    
    // Clean up
    document.body.removeChild(testElement);
    document.body.removeChild(comparisonElement);
    document.body.removeChild(fallbackElement);
    
    // Font supports this weight if:
    // 1. Font name is in computed style (not fallback)
    // 2. Computed font-weight matches requested weight (or is close - browser may round)
    // 3. Width/height differs from fallback (font is actually used, not synthesized)
    const fontNameLower = fontFamily.toLowerCase();
    const hasFontName = computedFont.includes(fontNameLower) && 
                       !computedFont.startsWith('monospace') &&
                       !computedFont.startsWith('sans-serif');
    
    // Check if computed weight matches requested (allow some rounding)
    const weightMatches = Math.abs(computedWeight - weight) <= 100 || 
                         (weight >= 400 && computedWeight >= 400) ||
                         (weight < 400 && computedWeight < 400);
    
    // Check if dimensions differ from fallback (font is actually used)
    const widthDiffers = Math.abs(testWidth - fallbackWidth) > 1;
    const heightDiffers = Math.abs(testHeight - fallbackHeight) > 1;
    const differsFromFallback = widthDiffers || heightDiffers;
    
    // For non-400 weights, also check if it differs from comparison weight
    // This ensures the weight actually changes the rendering
    const differsFromComparison = weight === comparisonWeight || 
                                 Math.abs(testWidth - comparisonWidth) > 1 ||
                                 Math.abs(testHeight - comparisonHeight) > 1;
    
    const isSupported = hasFontName && weightMatches && differsFromFallback && differsFromComparison;
    
    if (!isSupported) {
      console.log(`[Fonternate] Weight ${weight} not supported for ${fontFamily}:`, {
        hasFontName,
        weightMatches,
        computedWeight,
        requestedWeight: weight,
        differsFromFallback,
        differsFromComparison
      });
    }
    
    return isSupported;
  }

  /**
   * Capitalizes font name parts (e.g., "fontname-extralight" -> "FontName-ExtraLight")
   */
  private capitalizeFontName(fontName: string): string {
    return fontName
      .split(/[\s-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(fontName.includes('-') ? '-' : ' ');
  }

  /**
   * Converts weight suffix to numeric CSS font-weight value
   */
  private getFontWeightValue(weightSuffix: string): number {
    const weightMap: Record<string, number> = {
      'thin': 100,
      'hairline': 100,
      'extralight': 200,
      'ultra-light': 200,
      'light': 300,
      'regular': 400,
      'normal': 400,
      'medium': 500,
      'semibold': 600,
      'demi-bold': 600,
      'bold': 700,
      'extrabold': 800,
      'ultra-bold': 800,
      'black': 900,
      'heavy': 900,
    };
    return weightMap[weightSuffix.toLowerCase()] || 400;
  }

  private checkFontExists(fontFamily: string, testText: string, fontSize: string): boolean {
    if (!document.body) return false;

    // Method 1: Use Font Loading API if available (most reliable)
    if (document.fonts && document.fonts.check) {
      try {
        // Check if the font is loaded with the exact name
        const fontSpec = `"${fontFamily}"`;
        if (document.fonts.check(fontSpec)) {
          return true;
        }
        
        // Also try checking with font-weight: normal to see if font exists
        // Some fonts might not be registered until used with a specific weight
        if (document.fonts.check(`"${fontFamily}"`, 'normal')) {
          return true;
        }
        
        // Try case variations (some fonts are registered with different casing)
        const fontVariations = [
          fontFamily, // Original
          this.capitalizeFontName(fontFamily), // Capitalized
          fontFamily.charAt(0).toUpperCase() + fontFamily.slice(1), // First letter capitalized
        ];
        
        for (const variation of fontVariations) {
          if (variation !== fontFamily) {
            const variationSpec = `"${variation}"`;
            if (document.fonts.check(variationSpec)) {
              return true;
            }
          }
        }
      } catch (e) {
        // Continue to fallback method
      }
    }

    // Method 2: Create test elements and compare rendering
    // This method checks if the font actually renders differently from fallback
    // IMPORTANT: We do NOT use fallback fonts - if font doesn't exist, return false
    const testElement = document.createElement('span');
    testElement.style.fontFamily = `"${fontFamily}"`; // NO FALLBACK - if font doesn't exist, browser will use default
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.fontSize = fontSize;
    testElement.style.whiteSpace = 'nowrap';
    testElement.style.fontWeight = 'normal';
    testElement.style.fontStyle = 'normal';
    testElement.style.fontVariant = 'normal';
    testElement.style.fontStretch = 'normal';
    testElement.textContent = testText;
    
    // Create a fallback element with a known fallback font
    const fallbackElement = document.createElement('span');
    fallbackElement.style.fontFamily = 'monospace';
    fallbackElement.style.position = 'absolute';
    fallbackElement.style.visibility = 'hidden';
    fallbackElement.style.fontSize = fontSize;
    fallbackElement.style.whiteSpace = 'nowrap';
    fallbackElement.style.fontWeight = 'normal';
    fallbackElement.style.fontStyle = 'normal';
    fallbackElement.textContent = testText;
    
    // Create a third element with a different fallback to compare
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
    
    // Force a reflow to ensure styles are applied
    void testElement.offsetWidth;
    void fallbackElement.offsetWidth;
    void sansFallbackElement.offsetWidth;
    
    // Get computed font families
    const computedFont = window.getComputedStyle(testElement).fontFamily.toLowerCase();
    const fallbackFont = window.getComputedStyle(fallbackElement).fontFamily.toLowerCase();
    const sansFallbackFont = window.getComputedStyle(sansFallbackElement).fontFamily.toLowerCase();
    
    // Get widths and heights (checking both dimensions for more accuracy)
    const testWidth = testElement.offsetWidth;
    const testHeight = testElement.offsetHeight;
    const fallbackWidth = fallbackElement.offsetWidth;
    const fallbackHeight = fallbackElement.offsetHeight;
    const sansFallbackWidth = sansFallbackElement.offsetWidth;
    const sansFallbackHeight = sansFallbackElement.offsetHeight;
    
    // Clean up
    document.body.removeChild(testElement);
    document.body.removeChild(fallbackElement);
    document.body.removeChild(sansFallbackElement);
    
    // Font is available if:
    // 1. The computed font includes the font name (not just fallback)
    // 2. The font renders differently from both fallbacks (width AND height)
    // 3. The font is NOT synthesized (browser didn't create a fake weight)
    const fontNameLower = fontFamily.toLowerCase();
    const fontNameParts = fontNameLower.split(/[\s-]/);
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedFontName = normalize(fontNameLower);
    const normalizedComputedFont = normalize(computedFont);
    const computedFontParts = computedFont.split(/,\s*/).map(f => f.trim());
    
    // Check if computed font includes any part of our font name
    // This handles cases where font name might be slightly different in computed style
    // Be more lenient - check if ANY meaningful part matches
    const hasFontNameDirect = fontNameParts.some(part => {
      if (part.length <= 2) return false; // Skip very short parts
      // Check if computed font contains this part (case-insensitive)
      return computedFont.includes(part);
    }) && !computedFont.startsWith('monospace') &&
       !computedFont.startsWith('sans-serif') &&
       !computedFont.startsWith('serif');
    const hasFontNameNormalized = normalizedFontName.length > 2 && normalizedComputedFont.includes(normalizedFontName);
    const hasFontNameSplit = computedFontParts.some(part => normalize(part).includes(normalizedFontName));
    const hasFontName = hasFontNameDirect || hasFontNameNormalized || hasFontNameSplit;
    
    // Check if dimensions differ significantly (more lenient thresholds)
    // The test font should differ from both fallbacks in width OR height
    const widthDiffersFromMonospace = Math.abs(testWidth - fallbackWidth) > 2; // Reduced from 3
    const heightDiffersFromMonospace = Math.abs(testHeight - fallbackHeight) > 0.5; // Reduced from 1
    const widthDiffersFromSans = Math.abs(testWidth - sansFallbackWidth) > 2; // Reduced from 3
    const heightDiffersFromSans = Math.abs(testHeight - sansFallbackHeight) > 0.5; // Reduced from 1
    
    const differsFromMonospace = widthDiffersFromMonospace || heightDiffersFromMonospace;
    const differsFromSans = widthDiffersFromSans || heightDiffersFromSans;
    const dimensionsDiffer = differsFromMonospace || differsFromSans;
    
    // Check if font was synthesized (browser created fake weight)
    // If the computed font doesn't match our requested font, it might be synthesized
    const isSynthesized = computedFont === fallbackFont || 
                         computedFont === sansFallbackFont;
    
    // Special handling for system fonts (SF Pro, SF Mono, etc.)
    // These are often available but might not match exactly in computed style
    const isSystemFont = /^(sf|helvetica|arial|times|georgia|verdana|courier)/i.test(fontNameLower);
    
    // If computed font contains any of our requested font names, it's likely available
    // This handles cases where browser echoes back our font-family stack
    const requestedNames = fontFamily.split(/[\s,]+/).map(n => n.toLowerCase().replace(/['"]/g, ''));
    const computedContainsRequested = requestedNames.some(reqName => {
      if (reqName.length <= 2) return false;
      return computedFontParts.some(part => {
        const partLower = normalize(part);
        const reqNormalized = normalize(reqName);
        return partLower.includes(reqNormalized) || reqNormalized.includes(partLower);
      });
    });
    
    const isLikelySystemFont = (hasFontName || computedContainsRequested) && !isSynthesized && (
      computedFontParts.some(part => {
        const partLower = part.toLowerCase();
        return partLower.includes('sf') || 
               partLower.includes('helvetica') || 
               partLower.includes('arial') ||
               partLower.includes('system') ||
               partLower.includes('mono');
      })
    );
    
    // Font is available if:
    // 1. Font name is in computed style OR dimensions differ OR computed contains our requested names
    // 2. Font is NOT synthesized
    // 3. For system fonts, be even more lenient - if computed contains our names and it's not synthesized, trust it
    const isAvailable = (hasFontName || dimensionsDiffer || computedContainsRequested || (isSystemFont && isLikelySystemFont)) && !isSynthesized;
    
    if (!isAvailable) {
      console.log(`[Fonternate] Font "${fontFamily}" not available:`, {
        hasFontName,
        dimensionsDiffer,
        isSynthesized,
        computedFont,
        fallbackFont,
        sansFallbackFont,
        testWidth,
        fallbackWidth,
        sansFallbackWidth,
        testHeight,
        fallbackHeight,
        sansFallbackHeight
      });
    } else {
      console.log(`[Fonternate] Font "${fontFamily}" is available`);
    }
    
    return isAvailable;
  }

  private waitForBody(): Promise<void> {
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

  private handleDetectPageFonts(sendResponse: (response: any) => void) {
    try {
      if (!document.body) {
        sendResponse({ fonts: [], error: 'Document body not ready' });
        return;
      }

      // Collect unique font families from all elements
      const fontFamilies = new Set<string>();
      const allElements = document.querySelectorAll('*');
      
      // Also check computed styles of common text elements
      const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, div, a, li, td, th, label, button, input, textarea');
      
      // Combine both sets
      const elementsToCheck = new Set([...Array.from(allElements), ...Array.from(textElements)]);
      
      elementsToCheck.forEach((element) => {
        try {
          const computedStyle = window.getComputedStyle(element);
          const fontFamily = computedStyle.fontFamily;
          
          if (fontFamily) {
            // Parse font-family string (can contain multiple fonts with fallbacks)
            // Format: "Font Name", "Another Font", sans-serif
            const fonts = fontFamily
              .split(',')
              .map(f => f.trim().replace(/^["']|["']$/g, '')) // Remove quotes
              .filter(f => {
                // Filter out generic font families
                const lower = f.toLowerCase();
                return !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', '-apple-system', 'blinkmacsystemfont'].includes(lower) &&
                       f.length > 0;
              });
            
            fonts.forEach(font => {
              if (font.trim()) {
                fontFamilies.add(font.trim());
              }
            });
          }
        } catch (e) {
          // Ignore errors for individual elements
        }
      });

      // Also check @font-face declarations in stylesheets
      try {
        Array.from(document.styleSheets).forEach((sheet) => {
          try {
            if (sheet.cssRules) {
              Array.from(sheet.cssRules).forEach((rule) => {
                if (rule instanceof CSSFontFaceRule) {
                  const fontFamily = rule.style.fontFamily;
                  if (fontFamily) {
                    const cleanFont = fontFamily.replace(/^["']|["']$/g, '').trim();
                    if (cleanFont && cleanFont.length > 0) {
                      fontFamilies.add(cleanFont);
                    }
                  }
                }
              });
            }
          } catch (e) {
            // Cross-origin stylesheets may throw errors
          }
        });
      } catch (e) {
        // Ignore stylesheet errors
      }

      const fontsArray = Array.from(fontFamilies).sort();
      
      // Get the most common font (primary font used on the page)
      const fontCounts = new Map<string, number>();
      textElements.forEach((element) => {
        try {
          const computedStyle = window.getComputedStyle(element);
          const fontFamily = computedStyle.fontFamily;
          if (fontFamily) {
            const primaryFont = fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
            if (primaryFont && !['serif', 'sans-serif', 'monospace'].includes(primaryFont.toLowerCase())) {
              fontCounts.set(primaryFont, (fontCounts.get(primaryFont) || 0) + 1);
            }
          }
        } catch (e) {
          // Ignore
        }
      });

      // Find most common font
      let primaryFont = '';
      let maxCount = 0;
      fontCounts.forEach((count, font) => {
        if (count > maxCount) {
          maxCount = count;
          primaryFont = font;
        }
      });

      sendResponse({
        fonts: fontsArray,
        primaryFont: primaryFont || (fontsArray.length > 0 ? fontsArray[0] : ''),
        count: fontsArray.length
      });
    } catch (error) {
      console.error('[Fonternate] Error detecting page fonts:', error);
      sendResponse({
        fonts: [],
        primaryFont: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private applyFontFromAppState(appState: AppState) {
    if (!appState.fontName?.trim()) {
      this.removeFontStyle();
      return;
    }

    this.handleApplyFont({
      fontName: appState.fontName,
      fontWeight: this.getFontWeightValue(appState.fontWeight || 'regular'),
      fontStyle: appState.fontStyle,
      textTransform: appState.textTransform,
      stylisticSets: Array.from(appState.stylisticSets),
      swashLevel: appState.swashLevel,
      liga: appState.liga,
      dlig: appState.dlig,
      calt: appState.calt,
      textStyles: Array.from(appState.textStyles),
      tracking: appState.tracking,
      fontSize: appState.fontSize,
      leading: appState.leading,
    });
  }
}

// Initialize the font injector
const fontInjector = new FontInjector(); 