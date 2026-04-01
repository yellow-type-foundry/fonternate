/**
 * Detect installed system fonts
 */

export interface InstalledFont {
  family: string;
  fullName: string;
  postscriptName?: string;
  style?: string;
}

function mergeUniqueByFamily(a: InstalledFont[], b: InstalledFont[]): InstalledFont[] {
  const map = new Map<string, InstalledFont>();
  for (const f of [...a, ...b]) {
    const k = f.family.toLowerCase();
    if (!map.has(k)) {
      map.set(k, f);
    }
  }
  return Array.from(map.values()).sort((x, y) => x.family.localeCompare(y.family));
}

/**
 * Get list of installed system fonts
 * Uses multiple methods in order of preference:
 * 1. Native messaging (Safari) - gets ALL fonts from macOS
 * 2. Font Access API (Chrome/Edge) - gets ALL fonts
 * 3. Dynamic detection methods (no hardcoded lists)
 */
function installedFontsFromFontData(fonts: Iterable<{ family?: string; fullName?: string; postscriptName?: string; style?: string }>): InstalledFont[] {
  const uniqueFamilies = new Map<string, InstalledFont>();
  for (const font of fonts) {
    const family = font.family || font.postscriptName?.split('-')[0] || 'Unknown';
    const key = family.toLowerCase();
    if (!uniqueFamilies.has(key)) {
      uniqueFamilies.set(key, {
        family,
        fullName: font.fullName || font.postscriptName || family,
        postscriptName: font.postscriptName,
        style: font.style,
      });
    }
  }
  return Array.from(uniqueFamilies.values()).sort((a, b) => a.family.localeCompare(b.family));
}

export async function getInstalledFonts(): Promise<InstalledFont[]> {
  console.log('[Fonternate] Starting font detection...');

  // Chrome/Edge: queryLocalFonts() must be *invoked* synchronously in the same user-activation
  // stack as the gesture (focus/click). Any await before the call drops activation and the API
  // throws SecurityError or fails. Start the request first, then await anything else.
  let localFontsPromise: Promise<Iterable<{ family?: string; fullName?: string; postscriptName?: string; style?: string }>> | null = null;
  if ('queryLocalFonts' in window && typeof (window as any).queryLocalFonts === 'function') {
    try {
      localFontsPromise = (window as any).queryLocalFonts();
    } catch (syncErr) {
      console.warn('[Fonternate] queryLocalFonts threw synchronously:', syncErr);
    }
  }

  // Let @font-face / web fonts register before DOM-based fallback (popup is tiny otherwise)
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch {
    // ignore
  }

  // Method 1: Try native messaging (Safari) - gets ALL system fonts from macOS
  try {
    console.log('[Fonternate] Attempting native messaging...');
    const nativeFonts = await getFontsViaNativeMessaging();
    if (nativeFonts.length > 0) {
      console.log(`[Fonternate] ✅ Found ${nativeFonts.length} fonts via native messaging`);
      return nativeFonts;
    }
    console.log('[Fonternate] Native messaging returned 0 fonts, trying other methods...');
  } catch (error) {
    console.log('[Fonternate] Native messaging failed:', error);
    console.log('[Fonternate] Falling back to other methods...');
  }

  // Method 2: Font Access API — await the promise started above (web `local-fonts` permission; no Chrome manifest key).
  if (localFontsPromise) {
    try {
      const fonts = await localFontsPromise;
      let result = installedFontsFromFontData(fonts);
      console.log(`[Fonternate] Found ${result.length} fonts via Font Access API`);

      if (result.length === 0) {
        const extra = getSystemFontsFallback();
        if (extra.length > 0) {
          console.log('[Fonternate] Merging DOM/CSS fallback with empty queryLocalFonts result');
          result = mergeUniqueByFamily(result, extra);
        }
      }
      return result;
    } catch (error) {
      console.warn('[Fonternate] Font Access API failed:', error);
    }
  }

  // Method 3: Dynamic detection (no hardcoded lists)
  console.log('[Fonternate] Using dynamic font detection methods (fallback)');
  const fallbackFonts = getSystemFontsFallback();
  console.log(`[Fonternate] Found ${fallbackFonts.length} fonts via fallback methods`);
  return fallbackFonts;
}

/**
 * Get fonts via native messaging (Safari Web Extension)
 * This communicates with the macOS app to get ALL system fonts using CTFontManager
 * Note: Safari Web Extensions native messaging works differently than Chrome
 */
async function getFontsViaNativeMessaging(): Promise<InstalledFont[]> {
  return new Promise((resolve, reject) => {
    // Check if native messaging is available
    const chromeAPI = typeof chrome !== 'undefined' ? chrome : ((window as any).chrome || (window as any).browser || null);
    if (!chromeAPI || !chromeAPI.runtime || !chromeAPI.runtime.sendNativeMessage) {
      reject(new Error('Native messaging not available'));
      return;
    }
    
    try {
      // Safari Web Extensions: The native app identifier is the app's bundle ID
      // Try different possible bundle identifiers
      const possibleIdentifiers = [
        'lambao.fonternate',  // Main app bundle ID (from Xcode)
        'lambao.fonternate.SafariExtension',  // Extension bundle ID
        'com.yellowtypefoundry.fonternate',
        'fonternate',
      ];
      
      let attempts = 0;
      const tryNext = () => {
        if (attempts >= possibleIdentifiers.length) {
          console.warn('[Fonternate] Native messaging failed - trying all identifiers failed');
          reject(new Error('Native messaging failed - no valid identifier'));
          return;
        }
        
        const identifier = possibleIdentifiers[attempts];
        attempts++;
        
        console.log(`[Fonternate] Trying native messaging with identifier: ${identifier}`);
        
        chromeAPI.runtime.sendNativeMessage(
          identifier,
          { action: 'getSystemFonts' },
          (response: any) => {
            if (chromeAPI.runtime.lastError) {
              console.log(`[Fonternate] Native messaging failed for ${identifier}:`, chromeAPI.runtime.lastError.message);
              // Try next identifier
              if (attempts < possibleIdentifiers.length) {
                tryNext();
              } else {
                reject(new Error(chromeAPI.runtime.lastError.message));
              }
              return;
            }
            
            if (response && response.fonts && Array.isArray(response.fonts)) {
              // CRITICAL: Use the EXACT font family name from the system
              // The 'family' field from macOS CTFontManager is the exact name we need
              const fonts: InstalledFont[] = response.fonts.map((f: any) => {
                // Use 'family' as primary - this is the exact font family name from macOS
                const family = f.family || f.fullName || 'Unknown';
                return {
                  family: family, // EXACT name from system - use this in CSS!
                  fullName: f.fullName || family,
                  postscriptName: f.postscriptName || '',
                  style: f.style || '',
                };
              });
              
              console.log(`[Fonternate] ✅ Got ${fonts.length} fonts from native app via ${identifier}`);
              console.log('[Fonternate] Sample fonts (EXACT names from system):', fonts.slice(0, 10).map(f => f.family));
              
              // Log a few random fonts to verify we're getting real system fonts
              const randomSample = fonts.slice(0, 20).map(f => f.family);
              console.log('[Fonternate] Font names are EXACT system names:', randomSample);
              
              resolve(fonts);
            } else {
              console.log(`[Fonternate] Invalid response from ${identifier}, trying next...`);
              // Try next identifier
              if (attempts < possibleIdentifiers.length) {
                tryNext();
              } else {
                reject(new Error('Invalid response from native app'));
              }
            }
          }
        );
      };
      
      tryNext();
    } catch (error) {
      console.error('[Fonternate] Native messaging error:', error);
      reject(error);
    }
  });
}

/**
 * Fallback method: Dynamic font detection (NO hardcoded lists)
 * Uses multiple detection methods to find fonts without hardcoding names
 */
function getSystemFontsFallback(): InstalledFont[] {
  const availableFonts = new Map<string, InstalledFont>();
  
  // Method 1: Get fonts from document.fonts (Font Loading API)
  // This includes fonts that have been loaded/used on the page
  if (document.fonts && document.fonts.size > 0) {
    for (const fontFace of document.fonts.values()) {
      const family = fontFace.family;
      if (family && !availableFonts.has(family.toLowerCase())) {
        availableFonts.set(family.toLowerCase(), {
          family: family,
          fullName: family,
        });
      }
    }
  }
  
  // Method 2: Extract fonts from CSS (dynamic - no hardcoded list)
  const cssFonts = extractFontsFromCSS();
  for (const fontFamily of cssFonts) {
    const key = fontFamily.toLowerCase();
    if (!availableFonts.has(key)) {
      availableFonts.set(key, {
        family: fontFamily,
        fullName: fontFamily,
      });
    }
  }
  
  // Method 3: Dynamic font discovery by testing computed styles
  // This discovers fonts by checking what fonts are actually available
  const discoveredFonts = discoverFontsDynamically();
  for (const font of discoveredFonts) {
    const key = font.family.toLowerCase();
    if (!availableFonts.has(key)) {
      availableFonts.set(key, font);
    }
  }
  
  return Array.from(availableFonts.values()).sort((a, b) => 
    a.family.localeCompare(b.family)
  );
}

/**
 * Dynamically discover fonts by analyzing computed styles
 * NO hardcoded font names - discovers fonts from actual usage
 * Also tests common system font patterns to find installed fonts
 */
function discoverFontsDynamically(): InstalledFont[] {
  const discovered = new Map<string, InstalledFont>();
  
  // Get fonts from all elements on the page
  const allElements = document.querySelectorAll('*');
  const testElement = document.createElement('span');
  const fallbackElement = document.createElement('span');
  
  testElement.style.position = 'absolute';
  testElement.style.visibility = 'hidden';
  testElement.style.fontSize = '72px';
  testElement.style.whiteSpace = 'nowrap';
  testElement.textContent = 'Ag';
  
  fallbackElement.style.position = 'absolute';
  fallbackElement.style.visibility = 'hidden';
  fallbackElement.style.fontSize = '72px';
  fallbackElement.style.whiteSpace = 'nowrap';
  fallbackElement.style.fontFamily = 'monospace';
  fallbackElement.textContent = 'Ag';
  
  document.body.appendChild(testElement);
  document.body.appendChild(fallbackElement);
  
  const fallbackWidth = fallbackElement.offsetWidth;
  const fallbackHeight = fallbackElement.offsetHeight;
  
  // Collect unique font families from computed styles
  for (const element of allElements) {
    try {
      const computed = window.getComputedStyle(element);
      const fontFamily = computed.fontFamily;
      
      if (fontFamily) {
        // Parse font-family string (can contain multiple fonts)
        const families = fontFamily
          .split(',')
          .map(f => f.trim().replace(/^["']|["']$/g, ''))
          .filter(f => {
            const lower = f.toLowerCase();
            return !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 
                    'system-ui', '-apple-system', 'blinkmacsystemfont'].includes(lower) &&
                   f.length > 0;
          });
        
        for (const family of families) {
          const key = family.toLowerCase().replace(/\s+/g, '');
          if (!discovered.has(key)) {
            // Test if font actually exists and renders differently
            testElement.style.fontFamily = `"${family}"`;
            void testElement.offsetWidth; // Force reflow
            
            const computedFont = window.getComputedStyle(testElement).fontFamily.toLowerCase();
            const testWidth = testElement.offsetWidth;
            const testHeight = testElement.offsetHeight;
            
            // Check if font was actually used (not fallback)
            const fontNameLower = family.toLowerCase();
            const isFontUsed = computedFont.includes(fontNameLower) && 
                               !computedFont.startsWith('monospace') &&
                               !computedFont.startsWith('sans-serif') &&
                               !computedFont.startsWith('serif');
            
            // Also check if dimensions differ (font renders differently)
            const dimensionsDiffer = Math.abs(testWidth - fallbackWidth) > 2 || 
                                     Math.abs(testHeight - fallbackHeight) > 0.5;
            
            if (isFontUsed || dimensionsDiffer) {
              discovered.set(key, {
                family: family, // Use exact name from computed style
                fullName: family,
              });
            }
          }
        }
      }
    } catch (e) {
      // Ignore errors for individual elements
      continue;
    }
  }
  
  // Also test common system font patterns dynamically
  // This helps discover fonts that might not be on the current page
  const commonPatterns = [
    // Test variations of common font names
    (name: string) => name.replace(/([a-z])([A-Z])/g, '$1 $2'), // camelCase to Words
    (name: string) => name.replace(/\s+/g, ''), // Remove spaces
    (name: string) => name.replace(/\s+/g, '-'), // Spaces to hyphens
    (name: string) => name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first
  ];
  
  // Get base names from discovered fonts and test variations
  const baseNames = Array.from(discovered.values()).map(f => f.family);
  for (const baseName of baseNames.slice(0, 20)) { // Limit to avoid too many tests
    for (const pattern of commonPatterns) {
      try {
        const variant = pattern(baseName);
        if (variant !== baseName && variant.length > 2) {
          const key = variant.toLowerCase().replace(/\s+/g, '');
          if (!discovered.has(key)) {
            testElement.style.fontFamily = `"${variant}"`;
            void testElement.offsetWidth;
            
            const computedFont = window.getComputedStyle(testElement).fontFamily.toLowerCase();
            if (computedFont.includes(variant.toLowerCase()) &&
                !computedFont.startsWith('monospace') &&
                !computedFont.startsWith('sans-serif')) {
              discovered.set(key, {
                family: variant,
                fullName: variant,
              });
            }
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
  
  document.body.removeChild(testElement);
  document.body.removeChild(fallbackElement);
  
  return Array.from(discovered.values());
}

/**
 * Extract font families from CSS rules in the document
 */
function extractFontsFromCSS(): string[] {
  const fonts = new Set<string>();
  
  try {
    // Check all stylesheets
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        if (sheet.cssRules) {
          for (let j = 0; j < sheet.cssRules.length; j++) {
            const rule = sheet.cssRules[j];
            if (rule instanceof CSSStyleRule) {
              const fontFamily = rule.style.fontFamily;
              if (fontFamily) {
                // Parse font-family string (can contain multiple fonts)
                const families = fontFamily.split(',').map(f => {
                  return f.trim().replace(/^["']|["']$/g, '');
                }).filter(f => {
                  const lower = f.toLowerCase();
                  return !['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 
                          'system-ui', '-apple-system', 'blinkmacsystemfont'].includes(lower);
                });
                families.forEach(f => fonts.add(f));
              }
            } else if (rule instanceof CSSFontFaceRule) {
              const fontFamily = rule.style.fontFamily;
              if (fontFamily) {
                const clean = fontFamily.replace(/^["']|["']$/g, '').trim();
                if (clean) fonts.add(clean);
              }
            }
          }
        }
      } catch (e) {
        // Cross-origin stylesheets may throw errors, skip them
        continue;
      }
    }
  } catch (e) {
    // Ignore errors
  }
  
  return Array.from(fonts);
}


/**
 * Check if a specific font is installed
 */
export async function isFontInstalled(fontFamily: string): Promise<boolean> {
  const fonts = await getInstalledFonts();
  return fonts.some(font => 
    font.family.toLowerCase() === fontFamily.toLowerCase() ||
    font.fullName.toLowerCase() === fontFamily.toLowerCase()
  );
}
