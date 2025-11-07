import React, { useEffect, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { FontTestState, FontSettings, TextTransform } from '../types';
import { getFontSettings, saveFontSettings, sendMessage } from '../utils/chrome';
import './popup.css';

const Popup: React.FC = () => {
  const [state, setState] = useState<FontTestState>({
    settings: {
      fontFamily: '',
      isEnabled: false,
      textTransform: 'none',
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
    },
    isLoading: true,
    error: null,
  });

  const [inputValue, setInputValue] = useState('');
  const [fontError, setFontError] = useState(false);
  const [unsupportedFeatures, setUnsupportedFeatures] = useState<Set<string>>(new Set());

  useEffect(() => {
    initializePopup();
  }, []);

  useEffect(() => {
    // Check feature support when font is applied and enabled
    if (state.settings.isEnabled && state.settings.fontFamily) {
      checkFeatureSupport();
    } else {
      setUnsupportedFeatures(new Set());
    }
  }, [state.settings.isEnabled, state.settings.fontFamily, state.settings.openTypeFeatures]);

  const initializePopup = async () => {
    try {
      // Load saved settings
      const settings = await getFontSettings();
      
      setState(prev => ({
        ...prev,
        settings,
        isLoading: false,
      }));

      // Set input value to last used font
      setInputValue(settings.fontFamily || '');
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize',
        isLoading: false,
      }));
    }
  };

  const validateFont = (fontFamily: string): boolean => {
    // Create a temporary element to test font availability
    const testElement = document.createElement('span');
    testElement.style.fontFamily = `${fontFamily}, monospace`;
    testElement.style.position = 'absolute';
    testElement.style.visibility = 'hidden';
    testElement.style.fontSize = '72px';
    testElement.textContent = 'abcdefghijklmnopqrstuvwxyz';
    
    document.body.appendChild(testElement);
    
    // Get the computed font family
    const computedFont = window.getComputedStyle(testElement).fontFamily;
    
    // Clean up
    document.body.removeChild(testElement);
    
    // Check if the font was actually applied (not fallback to monospace)
    return computedFont.toLowerCase().includes(fontFamily.toLowerCase());
  };

  const applyFont = async () => {
    if (!inputValue.trim()) return;

    // Validate font
    const isFontValid = validateFont(inputValue.trim());
    setFontError(!isFontValid);

    if (!isFontValid) {
      return; // Don't apply if font is not found
    }

    const newSettings = {
      ...state.settings,
      fontFamily: inputValue.trim(),
      isEnabled: true,
    };
    
    setState(prev => ({
      ...prev,
      settings: newSettings,
    }));

    // Save to storage
    await saveFontSettings(newSettings);
    
    // Apply to current page
    try {
      await sendMessage({
        type: 'UPDATE_FONT_SETTINGS',
        payload: newSettings,
      });
      // Check feature support after applying
      setTimeout(() => checkFeatureSupport(), 100);
    } catch (error) {
      console.error('Failed to apply font:', error);
    }
  };

  const resetFonts = async () => {
    const newSettings = {
      ...state.settings,
      isEnabled: false,
    };
    
    setState(prev => ({
      ...prev,
      settings: newSettings,
    }));

    // Clear font error when resetting
    setFontError(false);

    await saveFontSettings(newSettings);
    
    try {
      await sendMessage({
        type: 'RESET_FONTS',
      });
    } catch (error) {
      console.error('Failed to reset fonts:', error);
    }
  };

  const toggleOpenTypeFeature = async (feature: keyof FontSettings['openTypeFeatures']) => {
    const newSettings = {
      ...state.settings,
      openTypeFeatures: {
        ...state.settings.openTypeFeatures,
        [feature]: !state.settings.openTypeFeatures[feature],
      },
    };
    
    setState(prev => ({
      ...prev,
      settings: newSettings,
    }));

    await saveFontSettings(newSettings);
    
    // Re-apply if currently enabled
    if (newSettings.isEnabled) {
      try {
        await sendMessage({
          type: 'UPDATE_FONT_SETTINGS',
          payload: newSettings,
        });
      } catch (error) {
        console.error('Failed to update OpenType features:', error);
      }
    }
  };

  const handleTextTransformChange = async (transform: TextTransform) => {
    const newSettings = {
      ...state.settings,
      textTransform: transform,
    };
    
    setState(prev => ({
      ...prev,
      settings: newSettings,
    }));

    await saveFontSettings(newSettings);
    
    // Re-apply if currently enabled
    if (newSettings.isEnabled) {
      try {
        await sendMessage({
          type: 'UPDATE_FONT_SETTINGS',
          payload: newSettings,
        });
      } catch (error) {
        console.error('Failed to update text transform:', error);
      }
    }
  };

  const checkFeatureSupport = useCallback(async () => {
    if (!state.settings.fontFamily || !state.settings.isEnabled) return;
    
    const unsupported = new Set<string>();
    
    // Check each active stylistic set
    for (let i = 1; i <= 9; i++) {
      const ssKey = `ss0${i}` as keyof FontSettings['openTypeFeatures'];
      if (state.settings.openTypeFeatures[ssKey]) {
        try {
          const response = await sendMessage({
            type: 'CHECK_FEATURE_SUPPORT',
            payload: {
              fontFamily: state.settings.fontFamily,
              feature: ssKey,
            },
          });
          if (!response?.isSupported) {
            unsupported.add(ssKey);
          }
        } catch (error) {
          console.error(`Failed to check support for ${ssKey}:`, error);
        }
      }
    }
    
    setUnsupportedFeatures(unsupported);
  }, [state.settings.fontFamily, state.settings.isEnabled, state.settings.openTypeFeatures]);

  useEffect(() => {
    // Check feature support when font is applied and enabled
    if (state.settings.isEnabled && state.settings.fontFamily) {
      checkFeatureSupport();
    } else {
      setUnsupportedFeatures(new Set());
    }
  }, [state.settings.isEnabled, state.settings.fontFamily, state.settings.openTypeFeatures, checkFeatureSupport]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      applyFont();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Clear font error when user starts typing
    if (fontError) {
      setFontError(false);
    }
  };

  if (state.isLoading) {
    return (
      <div className="popup-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="popup-container p-4 text-red-600">
        <h3 className="font-semibold mb-2">Error</h3>
        <p className="text-sm">{state.error}</p>
      </div>
    );
  }

  return (
    <div className="popup-container">
      <div className="popup-content">
        {/* Input Section */}
        <div className="input-section">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="ENTER FONT NAME HERE"
            className="font-input"
          />
          {fontError && (
            <div className="font-error show">
              Font not found
            </div>
          )}
        </div>

        {/* Text Transform Section */}
        <div className="text-transform-section">
          <div className="opentype-label-header">TEXT TRANSFORM</div>
          <div className="text-transform-buttons">
            <button
              onClick={() => handleTextTransformChange('none')}
              className={`text-transform-btn ${state.settings.textTransform === 'none' ? 'active' : ''}`}
            >
              NORMAL
            </button>
            <button
              onClick={() => handleTextTransformChange('uppercase')}
              className={`text-transform-btn ${state.settings.textTransform === 'uppercase' ? 'active' : ''}`}
            >
              UPPERCASE
            </button>
            <button
              onClick={() => handleTextTransformChange('lowercase')}
              className={`text-transform-btn ${state.settings.textTransform === 'lowercase' ? 'active' : ''}`}
            >
              LOWERCASE
            </button>
            <button
              onClick={() => handleTextTransformChange('capitalize')}
              className={`text-transform-btn ${state.settings.textTransform === 'capitalize' ? 'active' : ''}`}
            >
              CAPITALIZE
            </button>
          </div>
        </div>

        {/* OpenType Features */}
        <div className="opentype-section">
          {/* Stylistic Sets */}
          <div className="stylistic-sets-container">
            <div className="opentype-label-header">STYLISTIC SETS</div>
            <div className="stylistic-tabs">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const ssKey = `ss0${num}` as keyof FontSettings['openTypeFeatures'];
                const isActive = state.settings.openTypeFeatures[ssKey];
                const isUnsupported = unsupportedFeatures.has(ssKey);
                return (
                  <button
                    key={ssKey}
                    onClick={() => toggleOpenTypeFeature(ssKey)}
                    className={`stylistic-tab ${isActive ? 'active' : ''} ${isUnsupported ? 'unsupported' : ''}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Other Features Grid */}
          <div className="opentype-grid">
            <button
              onClick={() => toggleOpenTypeFeature('swsh')}
              className={`opentype-block ${state.settings.openTypeFeatures.swsh ? 'active' : ''}`}
            >
              <div className="opentype-label">SWASHES</div>
              <div className="opentype-status">{state.settings.openTypeFeatures.swsh ? 'ON' : 'OFF'}</div>
            </button>

            <button
              onClick={() => toggleOpenTypeFeature('liga')}
              className={`opentype-block ${state.settings.openTypeFeatures.liga ? 'active' : ''}`}
            >
              <div className="opentype-label">STANDARD LIGATURES</div>
              <div className="opentype-status">{state.settings.openTypeFeatures.liga ? 'ON' : 'OFF'}</div>
            </button>

            <button
              onClick={() => toggleOpenTypeFeature('calt')}
              className={`opentype-block ${state.settings.openTypeFeatures.calt ? 'active' : ''}`}
            >
              <div className="opentype-label">CONTEXTUAL ALTERNATES</div>
              <div className="opentype-status">{state.settings.openTypeFeatures.calt ? 'ON' : 'OFF'}</div>
            </button>

            <button
              onClick={() => toggleOpenTypeFeature('dlig')}
              className={`opentype-block ${state.settings.openTypeFeatures.dlig ? 'active' : ''}`}
            >
              <div className="opentype-label">DISCRET. LIGATURES</div>
              <div className="opentype-status">{state.settings.openTypeFeatures.dlig ? 'ON' : 'OFF'}</div>
            </button>
          </div>
        </div>

        {/* Button Section */}
        <div className="button-section">
          <button
            onClick={applyFont}
            disabled={!inputValue.trim()}
            className="apply-button"
          >
            APPLY
          </button>
          <button
            onClick={resetFonts}
            className="reset-button"
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  );
};

// Initialize React app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<Popup />);
} 