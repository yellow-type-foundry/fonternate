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
function checkFontWeightsInDevMode(
  baseFontName: string, 
  weightSuffixes: string[], 
  userTypedFontName?: string, 
  userWeightSuffix?: string | null
): string[] {
  if (!document || !document.body) {
    console.warn('[DEV MODE] Cannot check font weights - document.body not available');
    return [];
  }

  const availableWeights: string[] = [];
  const testText = 'Ag';
  const fontSize = '72px';

  // Helper to capitalize font name parts
  const capitalizeFontName = (fontName: string): string => {
    return fontName
      .split(/[\s-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(fontName.includes('-') ? '-' : ' ');
  };

  // Convert common weight suffixes to PascalCase variants (e.g., SemiBold)
  const toPascalWeight = (weight: string): string | null => {
    const map: Record<string, string> = {
      'semibold': 'SemiBold',
      'demi-bold': 'DemiBold',
      'extralight': 'ExtraLight',
      'ultra-light': 'UltraLight',
      'extrabold': 'ExtraBold',
      'ultra-bold': 'UltraBold',
      'hairline': 'Hairline',
      'thin': 'Thin',
      'light': 'Light',
      'regular': 'Regular',
      'normal': 'Normal',
      'medium': 'Medium',
      'bold': 'Bold',
      'black': 'Black',
      'heavy': 'Heavy',
    };
    return map[weight.toLowerCase()] || null;
  };

  // Get weight value for suffix
  const getWeightValueForSuffix = (suffix: string): number | null => {
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
  };

  // LOGIC 1: If user typed font name + weight suffix (e.g., "ytfmillie-heavy")
  // Only enable that specific weight and disable all others
  if (userWeightSuffix && userTypedFontName && userTypedFontName !== baseFontName) {
    console.log('[DEV MODE] User typed weight suffix - checking exact font name:', userTypedFontName);
    const exactFontExists = checkFontExistsInDevMode(userTypedFontName, testText, fontSize);
    
    if (exactFontExists) {
      console.log('[DEV MODE] ✓ User-typed font name exists - enabling only this weight:', userWeightSuffix);
      // User explicitly chose this weight - only enable this one, disable all others
      return [userWeightSuffix];
    } else {
      console.log('[DEV MODE] ✗ User-typed font name does not exist');
      // Font doesn't exist - return empty to disable all weights
      return [];
    }
  }

  // LOGIC 2: User typed just font family name (e.g., "ytfmillie")
  // Detect and enable all available weights

  // Check if base font exists
  const baseFontExists = checkFontExistsInDevMode(baseFontName, testText, fontSize);
  const baseFontSupportsWeights = baseFontExists ? checkFontSupportsWeightsInDevMode(baseFontName, testText, fontSize) : false;

  // If base font supports weights via CSS, allow all weights
  if (baseFontExists && baseFontSupportsWeights) {
    console.log('[DEV MODE] Base font supports weights via CSS - allowing all weights');
    return weightSuffixes;
  }

  for (const suffix of weightSuffixes) {
    const weightValue = getWeightValueForSuffix(suffix);
    
    if (weightValue === null) {
      console.log(`[DEV MODE] ✗ Weight ${suffix} has no numeric value`);
      continue;
    }
    
    let isAvailable = false;
    
    // METHOD 1 (PRIORITY): Check CSS font-weight support FIRST
    if (baseFontExists) {
      console.log(`[DEV MODE] Checking CSS font-weight for ${suffix} (${weightValue})`);
      if (checkFontWeightSupportedInDevMode(baseFontName, weightValue, testText, fontSize)) {
        console.log(`[DEV MODE] ✓ Weight ${suffix} (${weightValue}) supported via CSS font-weight`);
        isAvailable = true;
      }
    }
    
    // METHOD 2 (FALLBACK): Check font name variations if CSS font-weight check failed
    if (!isAvailable) {
      const pascalWeight = toPascalWeight(suffix);
      const fontNameVariations = [
        `${baseFontName}-${suffix}`,
        `${baseFontName} ${suffix}`,
        capitalizeFontName(`${baseFontName}-${suffix}`),
        capitalizeFontName(`${baseFontName} ${suffix}`),
        pascalWeight ? `${baseFontName}-${pascalWeight}` : null,
        pascalWeight ? `${baseFontName} ${pascalWeight}` : null,
        pascalWeight ? capitalizeFontName(`${baseFontName}-${pascalWeight}`) : null,
        pascalWeight ? capitalizeFontName(`${baseFontName} ${pascalWeight}`) : null,
      ];
      
      console.log(`[DEV MODE] CSS font-weight check failed - trying font name variations for ${suffix} (${weightValue})`);
      for (const fontName of fontNameVariations.filter(Boolean) as string[]) {
        if (checkFontExistsInDevMode(fontName, testText, fontSize)) {
          console.log(`[DEV MODE] ✓ Font ${fontName} available (suffix: ${suffix})`);
          isAvailable = true;
          break;
        }
      }
    }
    
    if (!isAvailable) {
      console.log(`[DEV MODE] ✗ Font weight ${suffix} (${weightValue}) NOT available for ${baseFontName}`);
    }
    
    if (isAvailable) {
      availableWeights.push(suffix);
    }
  }

  // If no weights detected, enable all to avoid false disables in dev
  if (availableWeights.length === 0) {
    console.log('[DEV MODE] No weights detected - enabling all weights (dev fallback)');
    return weightSuffixes;
  }

  return availableWeights;
}

/**
 * Check if base font supports weights via CSS font-weight
 */
function checkFontSupportsWeightsInDevMode(baseFontName: string, testText: string, fontSize: string): boolean {
  const normalWorks = checkFontWeightSupportedInDevMode(baseFontName, 400, testText, fontSize);
  const boldWorks = checkFontWeightSupportedInDevMode(baseFontName, 700, testText, fontSize);
  return normalWorks && boldWorks;
}

/**
 * Check if a font supports a specific CSS font-weight value
 */
function checkFontWeightSupportedInDevMode(fontFamily: string, weight: number, testText: string, fontSize: string): boolean {
  if (!document.body) return false;

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
  
  document.body.removeChild(testElement);
  document.body.removeChild(comparisonElement);
  document.body.removeChild(fallbackElement);
  
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
  const differsFromComparison = weight === comparisonWeight || 
                               Math.abs(testWidth - comparisonWidth) > 1 ||
                               Math.abs(testHeight - comparisonHeight) > 1;
  
  const isSupported = hasFontName && weightMatches && differsFromFallback && differsFromComparison;
  
  if (!isSupported) {
    console.log(`[DEV MODE] Weight ${weight} not supported for ${fontFamily}:`, {
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
      
      // Also try checking with font-weight: normal to see if font exists
      // Some fonts might not be registered until used with a specific weight
      if (document.fonts.check(`"${fontFamily}"`, 'normal')) {
        return true;
      }
    } catch (e) {
      // Fall back to other method
    }
  }

  // Create test elements and compare rendering
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
  
  // Font is available if:
  // 1. The computed font includes the font name (not just fallback)
  // 2. The font renders differently from both fallbacks (width AND height)
  // 3. The font is NOT synthesized (browser didn't create a fake weight)
  const fontNameLower = fontFamily.toLowerCase();
  const fontNameParts = fontNameLower.split(/[\s-]/);
  
  // Check if computed font includes any part of our font name
  // This handles cases where font name might be slightly different in computed style
  const hasFontName = fontNameParts.some(part => 
    computedFont.includes(part) && part.length > 2 // Only check meaningful parts
  ) && !computedFont.startsWith('monospace') &&
     !computedFont.startsWith('sans-serif') &&
     !computedFont.startsWith('serif');
  
  // Be more lenient on dimensional differences to reduce false negatives
  // The test font should differ from both fallbacks in width OR height
  const widthDiffersFromMonospace = Math.abs(testWidth - fallbackWidth) > 2;
  const heightDiffersFromMonospace = Math.abs(testHeight - fallbackHeight) > 0.5;
  const widthDiffersFromSans = Math.abs(testWidth - sansFallbackWidth) > 2;
  const heightDiffersFromSans = Math.abs(testHeight - sansFallbackHeight) > 0.5;
  
  const differsFromMonospace = widthDiffersFromMonospace || heightDiffersFromMonospace;
  const differsFromSans = widthDiffersFromSans || heightDiffersFromSans;
  const dimensionsDiffer = differsFromMonospace || differsFromSans;
  
  // Check if font was synthesized (browser created fake weight)
  // If the computed font doesn't match our requested font, it might be synthesized
  const isSynthesized = computedFont === fallbackFont || 
                       computedFont === sansFallbackFont;

  // Font is available if:
  // 1. Font name is in computed style OR dimensions differ (lenient)
  // 2. Font is NOT synthesized
  const isAvailable = (hasFontName || dimensionsDiffer) && !isSynthesized;
  
  if (!isAvailable) {
    console.log(`[DEV MODE] Font "${fontFamily}" not available:`, {
      hasFontName,
      dimensionsDiffer,
      isSynthesized,
      computedFont,
      fallbackFont,
      sansFallbackFont,
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
            const { baseFontName, weightSuffixes, userTypedFontName, userWeightSuffix } = message.payload || {};
            if (baseFontName && weightSuffixes && Array.isArray(weightSuffixes)) {
              console.log(`[DEV MODE] Checking font weights for: ${baseFontName}`);
              const availableWeights = checkFontWeightsInDevMode(
                baseFontName, 
                weightSuffixes,
                userTypedFontName,
                userWeightSuffix
              );
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
