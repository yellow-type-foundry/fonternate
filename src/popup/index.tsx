import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AppState, FontCapabilities, TextTransform } from '../types';
import { getAppState, saveAppState, sendMessage, defaultAppState } from '../utils/chrome';
import { parseFontName, buildFontName, getAvailableWeightSuffixes } from '../utils/fontUtils';
import pkg from '../../package.json';
import {
  FontNameInput,
  FontWeightSelector,
  TextTransformSegmented,
  StylisticSetsToggleGroup,
  SwashLevelSegmented,
  LigatureToggles,
  ContextualAltToggle,
  TextStylesToggleGroup,
} from './components';
import { DevLayout } from './DevLayout';
import { isExtensionContext } from '../utils/chromeDev';
import './popup.css';

const Panel: React.FC = () => {
  const [state, setState] = useState<AppState>(defaultAppState);
  const [availableWeightSuffixes, setAvailableWeightSuffixes] = useState<Set<string> | undefined>(undefined);

  useEffect(() => {
    initializePanel();
  }, []);

  const initializePanel = async () => {
    try {
      const savedState = await getAppState();
      setState(savedState);
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

        if (!currentState.fontName?.trim()) {
          resolve();
          return prev;
        }

        // Debug logging removed for production

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
              fontName: targetFontName,
              fontWeight: getFontWeightValue(currentState.fontWeight),
              textTransform: currentState.textTransform,
              stylisticSets: Array.from(currentState.stylisticSets),
              swashLevel: currentState.swashLevel,
              liga: currentState.liga,
              dlig: currentState.dlig,
              calt: currentState.calt,
              textStyles: Array.from(currentState.textStyles),
            },
          })
            .then(() => {
              // Save state without updating React state
              // When switching fonts, save the previous font as lastFontName
              // Parse fontName first in case it already includes a weight suffix
              const prevParsed = parseFontName(prev.fontName);
              const prevBaseName = prevParsed?.baseName || prev.fontName;
              // Store font name as-is (don't add suffixes)
              const newLastFontName = (prev.fontName && prev.fontName !== targetFontName) 
                ? prev.fontName 
                : prev.lastFontName;
              
              const stateForSave: AppState = {
                ...prev,
                lastFontName: newLastFontName,
                textTransform: currentState.textTransform,
                stylisticSets: currentState.stylisticSets,
                swashLevel: currentState.swashLevel,
                liga: currentState.liga,
                dlig: currentState.dlig,
                calt: currentState.calt,
                textStyles: currentState.textStyles,
              };
              saveAppState(stateForSave);
              
              // Update React state for lastFontName so Previous Font button works correctly
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
            fontName: targetFontName,
            fontWeight: getFontWeightValue(currentState.fontWeight),
            textTransform: currentState.textTransform,
            stylisticSets: Array.from(currentState.stylisticSets),
            swashLevel: currentState.swashLevel,
            liga: currentState.liga,
            dlig: currentState.dlig,
            calt: currentState.calt,
            textStyles: Array.from(currentState.textStyles),
          },
        })
          .then(() => {
            setState(prevState => {
              // When switching fonts, save the previous font as lastFontName
              // Store font name as-is (don't add suffixes)
              const newLastFontName = (prevState.fontName && prevState.fontName !== targetFontName) 
                ? prevState.fontName 
                : prevState.lastFontName;
              
              const newState: AppState = {
                ...prevState,
                lastFontName: newLastFontName,
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
  }, []);

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

  const handlePreviousFont = async () => {
    // Toggle between current font and previous font
    // Use font names as-is - don't add suffixes
    const currentFontName = state.fontName;
    if (!state.lastFontName && !state.fontName) return;

    try {
      // If we have a current font and a previous font, swap them
      if (state.fontName && state.lastFontName) {
        // Use font names as-is - don't add suffixes
        const newFontName = state.lastFontName;
        // Parse to extract weight if present, otherwise use current weight
        const parsed = parseFontName(newFontName);
        const newWeight = parsed?.weightSuffix || state.fontWeight;
        
        // Get numeric font-weight value
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

        await sendMessage({
          type: 'APPLY_FONT',
          payload: {
            fontName: newFontName,
            fontWeight: getFontWeightValue(newWeight),
            textTransform: state.textTransform,
            stylisticSets: Array.from(state.stylisticSets),
            swashLevel: state.swashLevel,
            liga: state.liga,
            dlig: state.dlig,
            calt: state.calt,
            textStyles: Array.from(state.textStyles),
          },
        });

        const newState: AppState = {
          ...state,
          fontName: newFontName,
          fontWeight: newWeight,
          lastFontName: currentFontName,
          loading: false,
          error: null,
        };

        setState(newState);
        await saveAppState(newState);
        await detectCapabilities(newFontName);
      } else if (state.lastFontName && !state.fontName) {
        // No current font, apply the previous one
        // Use font name as-is - don't add suffixes
        const newFontName = state.lastFontName;
        // Parse to extract weight if present, otherwise use regular
        const parsed = parseFontName(newFontName);
        const newWeight = parsed?.weightSuffix || 'regular';
        
        // Get numeric font-weight value
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
        
        await sendMessage({
          type: 'APPLY_FONT',
          payload: {
            fontName: newFontName,
            fontWeight: getFontWeightValue(newWeight),
            textTransform: state.textTransform,
            stylisticSets: Array.from(state.stylisticSets),
            swashLevel: state.swashLevel,
            liga: state.liga,
            dlig: state.dlig,
            calt: state.calt,
            textStyles: Array.from(state.textStyles),
          },
        });

        const newState: AppState = {
          ...state,
          fontName: newFontName,
          fontWeight: newWeight,
          lastFontName: '', // Clear last since we're using it now
          loading: false,
          error: null,
        };

        setState(newState);
        await saveAppState(newState);
        await detectCapabilities(newFontName);
      } else if (state.fontName && !state.lastFontName) {
        // We have a current font but no previous - remove current font
        await sendMessage({ type: 'RESET_ALL' });

        const newState: AppState = {
          ...state,
          fontName: '',
          fontWeight: 'regular',
          lastFontName: currentFontName, // Save current as previous
          loading: false,
          error: null,
        };

        setState(newState);
        await saveAppState(newState);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to revert to previous font',
      }));
    }
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
        stylisticSets: new Set<number>(),
        swashLevel: 0,
        liga: false,
        dlig: false,
        calt: false,
        textStyles: new Set<string>(),
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

  const popupContent = (
    <div className="popup-content">
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
        <div className="feature-gap"></div>
        <div className="feature-row-wrapper">
          <FontWeightSelector
            fontName={state.fontName}
            fontWeight={state.fontWeight}
            onChange={async (newFontName, newWeight) => {
              // FontWeightSelector returns base font name and weight separately
              // Update both fontName and fontWeight state
              setState(prev => ({
                ...prev,
                fontName: newFontName,
                fontWeight: newWeight,
              }));
              // Apply font directly without re-detecting capabilities
              // Weight detection should only run once when font name changes, not on every weight change
              await applyFont(undefined, true); // Use current state
            }}
            disabled={state.loading}
            availableWeightSuffixes={availableWeightSuffixes}
          />
        </div>
        <div className="feature-gap"></div>

        <div className="feature-row-wrapper">
          <TextTransformSegmented
            value={state.textTransform}
            onChange={handleTextTransformChange}
            disabled={state.loading || !state.fontName?.trim()}
          />
        </div>
        <div className="feature-gap"></div>

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
        <div className="feature-gap"></div>
        <hr className="feature-divider" />
        <div className="feature-gap"></div>
      </div>

      <div className="button-section">
        <button
          onClick={handleReset}
          className="reset-button"
          disabled={state.loading || !state.fontName?.trim()}
        >
          <img 
            src={chrome.runtime.getURL((state.loading || !state.fontName?.trim()) ? 'assets/refresh-disabled.svg' : 'assets/refresh.svg')} 
            alt="Reset" 
            className="reset-button-icon" 
          />
        </button>
        <button
          onClick={handlePreviousFont}
          className="previous-font-button"
          disabled={(!state.lastFontName && !state.fontName) || state.loading || !state.fontName?.trim()}
        >
          PREVIOUS
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
      <div className="footer-note">
        Fonternate v{pkg.version} © 2026 LAMBAO. Find me at{' '}
        <a href="https://instagram.com/lamg.bao" target="_blank" rel="noopener noreferrer">
          @lamg.bao
        </a>
      </div>
    </div>
  );

  // In dev mode, wrap with DevLayout to show pangrams on the side
  if (!isExtensionContext()) {
    return <DevLayout state={state}>{popupContent}</DevLayout>;
  }

  return popupContent;
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Panel />);
}
