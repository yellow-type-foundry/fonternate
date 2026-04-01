import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AppState, FontCapabilities, FontStyle, TextTransform } from '../types';
import { getAppState, saveAppState, sendMessage, defaultAppState } from '../utils/chrome';
import { parseFontName, buildFontName, getAvailableWeightSuffixes } from '../utils/fontUtils';
import {
  FontNameInput,
  FontWeightSelector,
  TextTransformSegmented,
  FontStyleSegmented,
  StylisticSetsToggleGroup,
  SwashLevelSegmented,
  LigatureToggles,
  ContextualAltToggle,
  UnifiedWeightToggle,
  TextStylesToggleGroup,
  TypographyMetricsSliders,
} from './components';
import { DevLayout } from './DevLayout';
import { isExtensionContext } from '../utils/chromeDev';
import './popup.css';

const Panel: React.FC = () => {
  const [state, setState] = useState<AppState>(defaultAppState);
  const [availableWeightSuffixes, setAvailableWeightSuffixes] = useState<Set<string> | undefined>(undefined);
  const [openTypeFeaturesExpanded, setOpenTypeFeaturesExpanded] = useState(false);
  const isPinnedIframe = typeof window !== 'undefined' && window.self !== window.top;
  const isEmbedMode = typeof window !== 'undefined' && window.location.hash === '#embed';
  const isPopupMode = !isEmbedMode;
  const hideFooterForPinnedPanel = isEmbedMode;
  const [isActivated, setIsActivated] = useState(false);
  const getAvailableWeightValues = useCallback((): number[] => {
    const allWeights = getAvailableWeightSuffixes();
    if (!availableWeightSuffixes || availableWeightSuffixes.size === 0) {
      return allWeights.map((w) => w.weight);
    }
    return allWeights
      .filter((w) => availableWeightSuffixes.has(w.suffix))
      .map((w) => w.weight);
  }, [availableWeightSuffixes]);

  useEffect(() => {
    initializePanel();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#embed') {
      document.body.classList.add('fonternate-embed');
    }
  }, []);

  /** In pinned embed mode, proactively report content height to host for reliable iframe resizing. */
  useEffect(() => {
    if (!isPinnedIframe) return;

    let raf1 = 0;
    let raf2 = 0;
    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;

    const postHeight = () => {
      try {
        const root = document.getElementById('root');
        const popupContent = document.querySelector('.popup-content') as HTMLElement | null;
        const mainContent = document.querySelector('.popup-main-content') as HTMLElement | null;
        const rootRectH = root?.getBoundingClientRect().height ?? 0;
        const popupRectH = popupContent?.getBoundingClientRect().height ?? 0;
        const mainRectH = mainContent?.getBoundingClientRect().height ?? 0;
        // Use intrinsic content boxes only so the iframe can shrink back down.
        // Avoid body/html heights because those can mirror the current iframe viewport.
        const height = Math.max(
          popupContent?.scrollHeight ?? 0,
          popupContent?.offsetHeight ?? 0,
          popupRectH,
          mainContent?.scrollHeight ?? 0,
          mainContent?.offsetHeight ?? 0,
          mainRectH,
          root?.scrollHeight ?? 0,
          root?.offsetHeight ?? 0,
          rootRectH
        );
        window.parent.postMessage(
          { type: 'FONTERNATE_EMBED_HEIGHT', height: Math.ceil(height) },
          '*'
        );
      } catch {
        // ignore
      }
    };

    const schedulePost = () => {
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(postHeight);
      });
    };

    schedulePost();
    setTimeout(postHeight, 60);
    setTimeout(postHeight, 180);

    try {
      resizeObserver = new ResizeObserver(() => schedulePost());
      resizeObserver.observe(document.documentElement);
      resizeObserver.observe(document.body);
      const root = document.getElementById('root');
      if (root) resizeObserver.observe(root);
      const popupContent = document.querySelector('.popup-content');
      if (popupContent) resizeObserver.observe(popupContent);
      const mainContent = document.querySelector('.popup-main-content');
      if (mainContent) resizeObserver.observe(mainContent);

      mutationObserver = new MutationObserver(() => schedulePost());
      mutationObserver.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
    } catch {
      // ignore
    }

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
    };
  }, [state.preserveTypesettings, openTypeFeaturesExpanded, isPinnedIframe]);

  const initializePanel = async () => {
    try {
      const savedState = await getAppState();
      setState(savedState);
      if (!isPinnedIframe) {
        const status = await chrome.storage.local.get(['fonternatePopupActivated']);
        setIsActivated(Boolean(status.fonternatePopupActivated));
      }
      
      // Don't auto-apply - let user select from installed fonts
      // The font dropdown will show available installed fonts
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize',
        loading: false,
      }));
    }
  };

  const applyFont = useCallback(async (stateToUse?: AppState | string, skipStateUpdate: boolean = false) => {
    return new Promise<void>((resolve) => {
      // Get current state first
      setState(prev => {
        const currentState: AppState = (stateToUse && typeof stateToUse !== 'string') 
          ? stateToUse 
          : prev;
        
        // Determine the full font name to use
        // IMPORTANT: Use font name exactly as user typed it - don't add suffixes automatically
        let targetFontName: string;
        if (typeof stateToUse === 'string') {
          // If a string is provided, use it as-is (it may already include weight suffix)
          targetFontName = stateToUse;
        } else {
          // Use font name as-is from state (user may have typed it with or without suffix)
          // Don't automatically add weight suffixes - use CSS font-weight instead
          targetFontName = currentState.fontName;
        }

        // Check if we have a font name to apply
        if (!targetFontName?.trim() && !currentState.fontName?.trim()) {
          resolve();
          return prev;
        }
        
        // Use targetFontName if available, otherwise fall back to currentState.fontName
        const fontNameToApply = targetFontName?.trim() || currentState.fontName?.trim();
        if (!fontNameToApply) {
          resolve();
          return prev;
        }

        // Debug logging removed for production

        const detectedAvailableWeights = getAvailableWeightValues();

        // If skipStateUpdate is true, don't change any state - just apply the font
        if (skipStateUpdate) {
          // Get numeric font-weight value from weight suffix
          const getFontWeightValue = (suffix: string): number => {
            const weightMap: Record<string, number> = {
              'thin': 100, 'hairline': 100,
              'extralight': 200, 'ultra-light': 200,
              'light': 300,
              'regular': 400, 'normal': 400,
              'medium': 500,
              'semibold': 600, 'demi-bold': 600,
              'bold': 700,
              'extrabold': 800, 'ultra-bold': 800,
              'black': 900, 'heavy': 900,
            };
            return weightMap[suffix.toLowerCase()] || 400;
          };

          sendMessage({
            type: 'APPLY_FONT',
            payload: {
              fontName: fontNameToApply,
              fontWeight: getFontWeightValue(currentState.fontWeight),
              textTransform: currentState.textTransform,
              fontStyle: currentState.fontStyle,
              stylisticSets: Array.from(currentState.stylisticSets),
              swashLevel: currentState.swashLevel,
              liga: currentState.liga,
              dlig: currentState.dlig,
              calt: currentState.calt,
              textStyles: Array.from(currentState.textStyles),
              tracking: currentState.tracking,
              leading: currentState.leading,
              preserveTypesettings: currentState.preserveTypesettings,
              availableFontWeights: detectedAvailableWeights,
            },
          })
            .then(() => {
              // Save state without updating React state
              // When switching fonts, save the previous font as lastFontName
              // Parse fontName first in case it already includes a weight suffix
              const prevParsed = parseFontName(prev.fontName);
              const prevBaseName = prevParsed?.baseName || prev.fontName;
              // Store font name as-is (don't add suffixes)
              const newLastFontName = (prev.fontName && prev.fontName !== fontNameToApply) 
                ? prev.fontName 
                : prev.lastFontName;
              
              const stateForSave: AppState = {
                ...prev,
                lastFontName: newLastFontName,
                textTransform: currentState.textTransform,
                fontStyle: currentState.fontStyle,
                stylisticSets: currentState.stylisticSets,
                swashLevel: currentState.swashLevel,
                liga: currentState.liga,
                dlig: currentState.dlig,
                calt: currentState.calt,
                textStyles: currentState.textStyles,
                tracking: currentState.tracking,
                leading: currentState.leading,
                availableFontWeights: detectedAvailableWeights,
              };
              saveAppState(stateForSave);
              
              // Update React state for lastFontName
              setState(prevState => ({
                ...prevState,
                lastFontName: newLastFontName,
              }));
              
              resolve();
            })
            .catch((error) => {
              resolve();
            });
          return prev; // Don't update state at all
        }

        // Set loading state
        const loadingState = { ...prev, loading: true, error: null };
        
        // Get numeric font-weight value from weight suffix
        const getFontWeightValue = (suffix: string): number => {
          const weightMap: Record<string, number> = {
            'thin': 100, 'hairline': 100,
            'extralight': 200, 'ultra-light': 200,
            'light': 300,
            'regular': 400, 'normal': 400,
            'medium': 500,
            'semibold': 600, 'demi-bold': 600,
            'bold': 700,
            'extrabold': 800, 'ultra-bold': 800,
            'black': 900, 'heavy': 900,
          };
          return weightMap[suffix.toLowerCase()] || 400;
        };

        // Apply font asynchronously
        sendMessage({
          type: 'APPLY_FONT',
          payload: {
            fontName: fontNameToApply,
            fontWeight: getFontWeightValue(currentState.fontWeight),
            textTransform: currentState.textTransform,
            fontStyle: currentState.fontStyle,
            stylisticSets: Array.from(currentState.stylisticSets),
            swashLevel: currentState.swashLevel,
            liga: currentState.liga,
            dlig: currentState.dlig,
            calt: currentState.calt,
            textStyles: Array.from(currentState.textStyles),
            tracking: currentState.tracking,
            leading: currentState.leading,
            preserveTypesettings: currentState.preserveTypesettings,
            availableFontWeights: detectedAvailableWeights,
          },
        })
          .then(() => {
            setState(prevState => {
              // When switching fonts, save the previous font as lastFontName
              // Store font name as-is (don't add suffixes)
              const newLastFontName = (prevState.fontName && prevState.fontName !== fontNameToApply) 
                ? prevState.fontName 
                : prevState.lastFontName;
              
              const newState: AppState = {
                ...prevState,
                lastFontName: newLastFontName,
                availableFontWeights: detectedAvailableWeights,
                loading: false,
                error: null,
              };
              
              saveAppState(newState);
              resolve();
              return newState;
            });
          })
          .catch((error) => {
            setState(prevState => ({
              ...prevState,
              loading: false,
              error: error instanceof Error ? error.message : 'Failed to apply font',
            }));
            resolve();
          });

        return loadingState;
      });
    });
  }, [getAvailableWeightValues]);

  const detectCapabilities = useCallback(async (fontName: string) => {
    // Use font name as-is - don't add weight suffixes
    // Parse to extract base name for weight detection, but use original name for capabilities
    const parsed = parseFontName(fontName);
    const baseName = parsed?.baseName || fontName;
    const userWeightSuffix = parsed?.weightSuffix; // Weight suffix user typed (e.g., "heavy")
    const fullFontName = fontName; // Use font name as user typed it

    console.log('========================================');
    console.log('[Fonternate] === CAPABILITY DETECTION START ===');
    console.log('[Fonternate] Full font name (as typed):', fullFontName);
    console.log('[Fonternate] Base name (parsed):', baseName);
    console.log('[Fonternate] User weight suffix:', userWeightSuffix || '(none - user typed just font name)');
    console.log('[Fonternate] Has weight suffix?', !!userWeightSuffix);

    if (!baseName.trim()) {
      setState(prev => ({
        ...prev,
        capabilities: defaultAppState.capabilities,
        error: null,
        loading: false,
      }));
      setAvailableWeightSuffixes(undefined);
      return;
    }

    setState(prev => {
      // Don't detect if it's the same font that's already loaded and capabilities are known
      // Also check if we already have weight restrictions set (meaning detection already ran)
      if (prev.fontName === baseName && !prev.loading && prev.capabilities.ss.length > 0) {
        return prev;
      }
      return { ...prev, loading: true, error: null };
    });

    try {
      // Detect capabilities and available weights in parallel
      const [capabilitiesResponse, weightsResponse] = await Promise.all([
        sendMessage({
          type: 'DETECT_CAPABILITIES',
          payload: { fontName: fullFontName },
        }),
        sendMessage({
          type: 'CHECK_FONT_WEIGHTS',
          payload: {
            baseFontName: baseName,
            weightSuffixes: getAvailableWeightSuffixes().map(w => w.suffix),
            userTypedFontName: fullFontName, // Pass the exact font name user typed
            userWeightSuffix: userWeightSuffix, // Pass the weight suffix user typed
          },
        }).catch((error) => {
          // If detection fails, return null to indicate uncertainty (don't disable)
          console.warn('[Fonternate] Font weight detection failed:', error);
          return null; // null means detection failed, undefined means allow all
        }),
      ]);

      const capabilities: FontCapabilities = capabilitiesResponse?.capabilities || defaultAppState.capabilities;
      const availableWeights: string[] = Array.isArray(weightsResponse?.availableWeights)
        ? weightsResponse.availableWeights
        : [];
      
      setState(prev => {
        // Only update capabilities if this is still the current font name (user might have changed it)
        if (prev.fontName === baseName) {
          return {
            ...prev,
            capabilities,
            loading: false,
            error: null,
          };
        }
        return {
          ...prev,
          capabilities,
          loading: false,
          error: null,
        };
      });

      // Update available weights
      const allWeightSuffixes = getAvailableWeightSuffixes().map(w => w.suffix);
      console.log('[Fonternate] === WEIGHT RESTRICTION LOGIC ===');
      console.log('[Fonternate] Weights response:', weightsResponse === null ? 'FAILED' : 'SUCCESS');
      console.log('[Fonternate] Available weights from detection:', availableWeights);
      console.log('[Fonternate] User weight suffix:', userWeightSuffix || '(none)');
      console.log('[Fonternate] All possible weights:', allWeightSuffixes);
      
      // Distinguish between:
      // 1. Detection failed (null) -> allow all weights (uncertain, don't disable)
      // 2. Detection succeeded -> use detected weights (content script already checks base font)
      // IMPORTANT: Only update weights if this is still the current font (user might have changed it)
      setState(prev => {
        if (prev.fontName === baseName) {
          // Only update weights if this is still the current font
          // Fail-open on any detection error or empty result
          if (weightsResponse === null || weightsResponse?.error) {
            console.log('[Fonternate] → Detection failed or errored - allowing all weights (fail-open)');
            setAvailableWeightSuffixes(undefined);
          } else if (availableWeights.length > 0) {
            // Detection succeeded and found weights
            console.log('[Fonternate] → Setting weight restrictions:', availableWeights);
            console.log('[Fonternate] → Enabled weights:', availableWeights);
            const disabledWeights = allWeightSuffixes.filter((w: string) => !availableWeights.includes(w));
            console.log('[Fonternate] → Disabled weights:', disabledWeights);
            setAvailableWeightSuffixes(new Set(availableWeights));
          } else {
            // Empty response – allow all to avoid disabling the control
            console.log('[Fonternate] → No weights reported - allowing all weights (fail-open)');
            setAvailableWeightSuffixes(undefined);
          }
        }
        return prev;
      });
      console.log('[Fonternate] === CAPABILITY DETECTION END ===');
      console.log('========================================');
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to detect font capabilities',
      }));
      setAvailableWeightSuffixes(undefined);
    }
  }, [applyFont]);

  const handleFontNameChange = (fontName: string) => {
    // IMPORTANT: Store font name exactly as user typed it - don't parse or modify
    // If user types "ytfmillie-heavy", store it as-is
    const trimmed = fontName.trim();
    
    // Don't allow font names that start with hyphen (like "-regular")
    if (trimmed && !trimmed.startsWith('-')) {
      // Parse to extract weight if present, but keep full name
      const parsed = parseFontName(trimmed);
      setState(prev => ({
        ...prev,
        fontName: trimmed, // Store full name as user typed it
        fontWeight: parsed?.weightSuffix || 'regular', // Extract weight for slider
      }));
    } else {
      // Invalid input - clear font name
      setState(prev => ({
        ...prev,
        fontName: '',
        fontWeight: 'regular',
      }));
    }
  };

  const handleTextTransformChange = async (textTransform: TextTransform) => {
    setState(prev => {
      const newState = { ...prev, textTransform };
      saveAppState(newState);
      if (prev.fontName) {
        applyFont(newState);
      }
      return newState;
    });
  };

  const handleFontStyleChange = async (fontStyle: FontStyle) => {
    setState(prev => {
      const newState = { ...prev, fontStyle };
      saveAppState(newState);
      if (prev.fontName) {
        applyFont(newState);
      }
      return newState;
    });
  };

  const handleStylisticSetToggle = async (num: number) => {
    setState(prev => {
      const newSets = new Set(prev.stylisticSets);
      const wasSelected = newSets.has(num);
      if (wasSelected) {
        newSets.delete(num);
      } else {
        newSets.add(num);
      }
      
      const newState = { ...prev, stylisticSets: newSets };
      saveAppState(newState);
      
      // Always apply font if fontName exists, even if it hasn't changed
      // This ensures stylistic sets are applied immediately
      if (newState.fontName?.trim()) {
        // Apply font with the new state immediately
        applyFont(newState);
      }
      
      return newState;
    });
  };

  const handleSwashLevelChange = async (level: number) => {
    // Swash is ON/OFF only - normalize to 0 (OFF) or 1 (ON)
    const swashValue = level > 0 ? 1 : 0;
    setState(prev => {
      const newState = { ...prev, swashLevel: swashValue };
      saveAppState(newState);
      if (prev.fontName) {
        applyFont(newState);
      }
      return newState;
    });
  };

  const handleLigatureChange = async (newLiga: boolean, newDlig: boolean) => {
    // Allow both ligature types to be active at the same time
    setState(prev => {
      const newState = {
        ...prev,
        liga: newLiga,
        dlig: newDlig,
      };
      saveAppState(newState);
      if (prev.fontName) {
        applyFont(newState);
      }
      return newState;
    });
  };

  const handleCaltChange = async (value: boolean) => {
    setState(prev => {
      const newState = { ...prev, calt: value };
      saveAppState(newState);
      if (prev.fontName) {
        applyFont(newState);
      }
      return newState;
    });
  };

  const handleTextStyleToggle = async (style: string) => {
    setState(prev => {
      const newStyles = new Set(prev.textStyles);
      const wasSelected = newStyles.has(style);
      if (wasSelected) {
        newStyles.delete(style);
      } else {
        newStyles.add(style);
      }
      
      const newState = { ...prev, textStyles: newStyles };
      saveAppState(newState);
      
      if (newState.fontName?.trim()) {
        applyFont(newState);
      }
      
      return newState;
    });
  };

  const handleTrackingChange = (tracking: number) => {
    setState(prev => {
      const newState = { ...prev, tracking };
      // Apply immediately in real-time
      if (prev.fontName?.trim()) {
        applyFont(newState, true); // Skip state update to avoid re-render loop
      }
      // Save state asynchronously
      saveAppState(newState);
      return newState;
    });
  };

  const handleLeadingChange = (leading: number) => {
    setState(prev => {
      const newState = { ...prev, leading };
      // Apply immediately in real-time
      if (prev.fontName?.trim()) {
        applyFont(newState, true); // Skip state update to avoid re-render loop
      }
      // Save state asynchronously
      saveAppState(newState);
      return newState;
    });
  };

  const handlePreserveTypesettingsChange = (value: boolean) => {
    setState(prev => {
      const newState: AppState = value
        ? {
            ...prev,
            preserveTypesettings: true,
            // Discard manual override inputs when returning to preserve mode.
            fontWeight: 'regular',
            textTransform: 'none',
            fontStyle: 'normal',
            stylisticSets: new Set<number>(),
            swashLevel: 0,
            liga: true,
            dlig: false,
            calt: true,
            textStyles: new Set<string>(),
            tracking: 0,
            leading: 1.2,
          }
        : {
            ...prev,
            preserveTypesettings: false,
          };
      saveAppState(newState);
      if (prev.fontName?.trim()) {
        applyFont(newState, true);
      }
      return newState;
    });
  };

  const handleReset = async () => {
    try {
      await sendMessage({ type: 'RESET_ALL' });

      // Clear font name and reset all settings to defaults
      // Use font name as-is - don't add suffixes
      const resetState: AppState = {
        ...state,
        fontName: '',
        fontWeight: 'regular',
        lastFontName: state.fontName || state.lastFontName, // Save current font as last if it exists
        textTransform: 'none',
        fontStyle: 'normal',
        stylisticSets: new Set<number>(),
        swashLevel: 0,
        liga: false,
        dlig: false,
        calt: false,
        textStyles: new Set<string>(),
        tracking: 0,
        leading: 1.2,
        preserveTypesettings: true,
        capabilities: defaultAppState.capabilities,
        error: null,
        loading: false,
      };

      setState(resetState);
      await saveAppState(resetState);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to reset',
      }));
    }
  };

  const handlePinToPage = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_PINNED_PANEL' });
    } catch (e) {
      console.warn('[Fonternate] Pin to page failed (use a normal webpage tab):', e);
    }
  }, []);

  const detectPageFont = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const response = await sendMessage({ type: 'DETECT_PAGE_FONTS' });
      
      if (response?.primaryFont) {
        const detectedFont = response.primaryFont;
        handleFontNameChange(detectedFont);
        // Auto-detect capabilities and apply
        await detectCapabilities(detectedFont);
        await applyFont(detectedFont, true);
      } else if (response?.fonts && response.fonts.length > 0) {
        // Use first font if no primary font detected
        const detectedFont = response.fonts[0];
        handleFontNameChange(detectedFont);
        await detectCapabilities(detectedFont);
        await applyFont(detectedFont, true);
      } else {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'No fonts detected on this page'
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to detect fonts'
      }));
    }
  }, [detectCapabilities, applyFont]);

  const handleActivate = useCallback(async () => {
    try {
      await sendMessage({ type: 'ACTIVATE_PINNED_PANEL' });
      await chrome.storage.local.set({ fonternatePopupActivated: true });
      setIsActivated(true);
      window.close();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to activate',
      }));
    }
  }, []);

  const handleDisable = useCallback(async () => {
    try {
      await sendMessage({ type: 'DISABLE_EXTENSION_EFFECTS' });
      await chrome.storage.local.set({ fonternatePopupActivated: false });
      setIsActivated(false);
      window.close();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to disable',
      }));
    }
  }, []);

  if (isPopupMode) {
    return (
      <div className="popup-content popup-content-compact">
        <div className="popup-main-content">
          <div className="button-section popup-activation-section">
            <button
              type="button"
              onClick={isActivated ? handleDisable : handleActivate}
              className="apply-button"
            >
              {isActivated ? 'Disable' : 'Activate'}
            </button>
          </div>
          {state.error && <div className="font-error show">{state.error}</div>}
        </div>
      </div>
    );
  }

  const popupContent = (
    <div className={`popup-content ${state.preserveTypesettings ? 'popup-content-compact' : ''}`}>
      <div className="popup-main-content">
        <FontNameInput
          value={state.fontName}
          onChange={handleFontNameChange}
          onDetectCapabilities={detectCapabilities}
          onApplyFont={(fontName) => {
            // Use the font name from the input if provided (use as-is, don't add suffixes)
            // Otherwise use font name from state
            let fontNameToApply: string;
            if (fontName) {
              fontNameToApply = fontName; // Use as-is, don't rebuild
            } else {
              fontNameToApply = state.fontName; // Use state font name as-is
            }
            if (fontNameToApply?.trim()) {
              // Skip all state updates to prevent input refresh when applying via Enter
              applyFont(fontNameToApply, true);
            }
          }}
          loading={state.loading}
          error={state.error || undefined}
        />
        <div className="feature-row-wrapper preserve-typesettings-row">
          <UnifiedWeightToggle
            value={state.preserveTypesettings}
            onChange={handlePreserveTypesettingsChange}
            disabled={state.loading || !state.fontName?.trim()}
          />
        </div>
        {!state.preserveTypesettings && (
          <>
            <div className="feature-gap"></div>
            <div className="feature-row-wrapper">
              <FontWeightSelector
                fontName={state.fontName}
                fontWeight={state.fontWeight}
                onChange={async (newFontName, newWeight) => {
                  // Apply with the updated weight immediately (avoid stale-state apply).
                  const nextState: AppState = {
                    ...state,
                    fontName: newFontName,
                    fontWeight: newWeight,
                  };
                  setState(prev => ({
                    ...prev,
                    fontName: newFontName,
                    fontWeight: newWeight,
                  }));
                  await applyFont(nextState, true);
                }}
                disabled={state.loading || state.preserveTypesettings}
                availableWeightSuffixes={availableWeightSuffixes}
              />
            </div>
            <div className="feature-gap"></div>
            <TypographyMetricsSliders
              tracking={state.tracking}
              leading={state.leading}
              onTrackingChange={handleTrackingChange}
              onLeadingChange={handleLeadingChange}
              disabled={state.loading || !state.fontName?.trim() || state.preserveTypesettings}
            />
            <div className="feature-gap"></div>

            <div className="feature-row-wrapper feature-row-segmented-pair">
              <TextTransformSegmented
                value={state.textTransform}
                onChange={handleTextTransformChange}
                disabled={state.loading || !state.fontName?.trim()}
              />
              <FontStyleSegmented
                value={state.fontStyle}
                onChange={handleFontStyleChange}
                disabled={state.loading || !state.fontName?.trim()}
              />
            </div>
            <div className="feature-gap"></div>

            <div className="feature-row-wrapper opentype-features-section">
              <button
                type="button"
                className="opentype-features-heading-toggle"
                onClick={() => setOpenTypeFeaturesExpanded((e) => !e)}
                aria-expanded={openTypeFeaturesExpanded}
                aria-controls="opentype-features-panel"
                id="opentype-features-heading"
              >
                <span
                  className={`opentype-features-chevron ${openTypeFeaturesExpanded ? 'expanded' : ''}`}
                  aria-hidden
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M3.5 1.5L6.5 5L3.5 8.5"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="opentype-features-heading-label">OpenType Features</span>
              </button>
              {openTypeFeaturesExpanded && (
                <div
                  className="opentype-features-panel"
                  id="opentype-features-panel"
                  role="region"
                  aria-labelledby="opentype-features-heading"
                >
                  <div className="feature-row-wrapper">
                    <StylisticSetsToggleGroup
                      selected={state.stylisticSets}
                      available={state.capabilities.ss}
                      onChange={handleStylisticSetToggle}
                      disabled={state.loading || !state.fontName?.trim()}
                    />
                  </div>
                  <div className="feature-gap"></div>
                  <div className="feature-row-wrapper">
                    <LigatureToggles
                      liga={state.liga}
                      dlig={state.dlig}
                      supportsLIGA={state.capabilities.supportsLIGA}
                      supportsDLIG={state.capabilities.supportsDLIG}
                      onChange={handleLigatureChange}
                      disabled={state.loading || !state.fontName?.trim()}
                    />
                  </div>
                  <div className="feature-gap"></div>
                  <div className="feature-row-wrapper">
                    <SwashLevelSegmented
                      value={state.swashLevel}
                      availableLevels={state.capabilities.swashLevels}
                      onChange={handleSwashLevelChange}
                      disabled={state.loading || !state.fontName?.trim()}
                    />
                  </div>
                  <div className="feature-gap"></div>
                  <div className="feature-row-wrapper">
                    <ContextualAltToggle
                      value={state.calt}
                      supportsCALT={state.capabilities.supportsCALT}
                      onChange={handleCaltChange}
                      disabled={state.loading || !state.fontName?.trim()}
                    />
                  </div>
                  <div className="feature-gap"></div>
                  <div className="feature-row-wrapper">
                    <TextStylesToggleGroup
                      selected={state.textStyles}
                      onChange={handleTextStyleToggle}
                      disabled={state.loading || !state.fontName?.trim()}
                    />
                  </div>
                </div>
              )}
            </div>
            <div className="feature-gap"></div>
          </>
        )}
      </div>

      {!state.preserveTypesettings && (
        <div className="button-section">
          <button
            type="button"
            onClick={handleReset}
            className="reset-button"
            disabled={state.loading || !state.fontName?.trim()}
          >
            Reset
          </button>
          <button
            onClick={() => {
              // Use font name as-is - don't add suffixes
              const fontNameToUse = state.fontName;
              if (!state.loading && fontNameToUse?.trim()) {
                detectCapabilities(fontNameToUse).then(() => {
                  applyFont(fontNameToUse, true);
                });
              }
            }}
            className="apply-button"
            disabled={state.loading || !state.fontName?.trim()}
          >
            APPLY
          </button>
        </div>
      )}
      {!hideFooterForPinnedPanel && isExtensionContext() && (
        <div className="footer-pin-wrap">
          <button type="button" className="pin-to-page-button" onClick={handlePinToPage}>
            Pin to page
          </button>
        </div>
      )}
    </div>
  );

  // Webpack dev UI: centered panel (no extension APIs)
  if (!isExtensionContext()) {
    return <DevLayout>{popupContent}</DevLayout>;
  }

  return popupContent;
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Panel />);
}
