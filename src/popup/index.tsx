import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { AppState, FontCapabilities, TextTransform } from '../types';
import { getAppState, saveAppState, sendMessage, defaultAppState } from '../utils/chrome';
import { parseFontName, buildFontName } from '../utils/fontUtils';
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
import './popup.css';

const Panel: React.FC = () => {
  const [state, setState] = useState<AppState>(defaultAppState);

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
        let targetFontName: string;
        if (typeof stateToUse === 'string') {
          // If a string is provided, parse it to extract base name and weight
          const parsed = parseFontName(stateToUse);
          if (parsed) {
            targetFontName = buildFontName(parsed.baseName, parsed.weightSuffix || 'regular');
          } else {
            targetFontName = stateToUse;
          }
        } else {
          // Combine base name + weight from state
          targetFontName = buildFontName(currentState.fontName, currentState.fontWeight);
        }

        if (!currentState.fontName?.trim()) {
          resolve();
          return prev;
        }

        // Debug logging removed for production

        // If skipStateUpdate is true, don't change any state - just apply the font
        if (skipStateUpdate) {
          sendMessage({
            type: 'APPLY_FONT',
            payload: {
              fontName: targetFontName,
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
              const prevFullFontName = buildFontName(prev.fontName, prev.fontWeight);
              const newLastFontName = (prev.fontName && prevFullFontName !== targetFontName) 
                ? prevFullFontName 
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
        
        // Apply font asynchronously
        sendMessage({
          type: 'APPLY_FONT',
          payload: {
            fontName: targetFontName,
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
              const prevFullFontName = buildFontName(prevState.fontName, prevState.fontWeight);
              const newLastFontName = (prevState.fontName && prevFullFontName !== targetFontName) 
                ? prevFullFontName 
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
    // Parse font name to extract base name and weight
    const parsed = parseFontName(fontName);
    const baseName = parsed?.baseName || fontName;
    const weightSuffix = parsed?.weightSuffix || 'regular';
    const fullFontName = buildFontName(baseName, weightSuffix);

    if (!baseName.trim()) {
      setState(prev => ({
        ...prev,
        capabilities: defaultAppState.capabilities,
        error: null,
        loading: false,
      }));
      return;
    }

    setState(prev => {
      // Don't detect if it's the same font that's already loaded and capabilities are known
      if (prev.fontName === baseName && !prev.loading && prev.capabilities.ss.length > 0) {
        return prev;
      }
      return { ...prev, loading: true, error: null };
    });

    try {
      const response = await sendMessage({
        type: 'DETECT_CAPABILITIES',
        payload: { fontName: fullFontName },
      });

      const capabilities: FontCapabilities = response?.capabilities || defaultAppState.capabilities;
      
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
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to detect font capabilities',
      }));
    }
  }, [applyFont]);

  const handleFontNameChange = (fontName: string) => {
    // Parse font name to extract base name and weight suffix
    const parsed = parseFontName(fontName);
    if (parsed) {
      setState(prev => ({
        ...prev,
        fontName: parsed.baseName,
        fontWeight: parsed.weightSuffix || 'regular',
      }));
    } else {
      // If parsing fails, use the input as-is and default to regular weight
      setState(prev => ({
        ...prev,
        fontName: fontName.trim(),
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
    const currentFullFontName = buildFontName(state.fontName, state.fontWeight);
    if (!state.lastFontName && !state.fontName) return;

    try {
      // If we have a current font and a previous font, swap them
      if (state.fontName && state.lastFontName) {
        // Parse the previous font name to extract base name and weight
        const parsed = parseFontName(state.lastFontName);
        const newBaseName = parsed?.baseName || state.lastFontName;
        const newWeight = parsed?.weightSuffix || 'regular';
        const newFullFontName = buildFontName(newBaseName, newWeight);
        
        // Current font becomes previous
        const newLastFontName = currentFullFontName;

        await sendMessage({
          type: 'APPLY_FONT',
          payload: {
            fontName: newFullFontName,
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
          fontName: newBaseName,
          fontWeight: newWeight,
          lastFontName: newLastFontName,
          loading: false,
          error: null,
        };

        setState(newState);
        await saveAppState(newState);
        await detectCapabilities(newFullFontName);
      } else if (state.lastFontName && !state.fontName) {
        // No current font, apply the previous one
        const parsed = parseFontName(state.lastFontName);
        const newBaseName = parsed?.baseName || state.lastFontName;
        const newWeight = parsed?.weightSuffix || 'regular';
        const newFullFontName = buildFontName(newBaseName, newWeight);
        
        await sendMessage({
          type: 'APPLY_FONT',
          payload: {
            fontName: newFullFontName,
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
          fontName: newBaseName,
          fontWeight: newWeight,
          lastFontName: '', // Clear last since we're using it now
          loading: false,
          error: null,
        };

        setState(newState);
        await saveAppState(newState);
        await detectCapabilities(newFullFontName);
      } else if (state.fontName && !state.lastFontName) {
        // We have a current font but no previous - remove current font
        await sendMessage({ type: 'RESET_ALL' });

        const newState: AppState = {
          ...state,
          fontName: '',
          fontWeight: 'regular',
          lastFontName: currentFullFontName, // Save current as previous
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
      const currentFullFontName = buildFontName(state.fontName, state.fontWeight);
      const resetState: AppState = {
        ...state,
        fontName: '',
        fontWeight: 'regular',
        lastFontName: state.fontName ? currentFullFontName : state.lastFontName, // Save current font as last if it exists
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

  return (
    <div className="popup-content">
      <div className="popup-main-content">
        <FontNameInput
          value={state.fontName}
          onChange={handleFontNameChange}
          onDetectCapabilities={detectCapabilities}
          onApplyFont={(fontName) => {
            // Use the font name from the input if provided, otherwise combine base name + weight
            let fontNameToApply: string;
            if (fontName) {
              fontNameToApply = fontName;
            } else {
              fontNameToApply = buildFontName(state.fontName, state.fontWeight);
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
            onChange={async (newFontName) => {
              // Parse the new font name to extract weight
              const parsed = parseFontName(newFontName);
              if (parsed) {
                setState(prev => ({
                  ...prev,
                  fontWeight: parsed.weightSuffix || 'regular',
                }));
                // Detect capabilities with the full font name, then apply
                await detectCapabilities(newFontName);
                await applyFont(newFontName, true);
              }
            }}
            disabled={state.loading}
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
            const fullFontName = buildFontName(state.fontName, state.fontWeight);
            if (!state.loading && state.fontName?.trim()) {
              detectCapabilities(fullFontName).then(() => {
                applyFont(fullFontName, true);
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
        Fonternate © 2025 LAMBAO. Find me at{' '}
        <a href="https://instagram.com/lamg.bao" target="_blank" rel="noopener noreferrer">
          @lamg.bao
        </a>
      </div>
    </div>
  );
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Panel />);
}
