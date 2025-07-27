import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FontTestState, FontSettings } from '../types';
import { getFontSettings, saveFontSettings, sendMessage } from '../utils/chrome';
import './popup.css';

const Popup: React.FC = () => {
  const [state, setState] = useState<FontTestState>({
    settings: {
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
    },
    isLoading: true,
    error: null,
  });

  const [inputValue, setInputValue] = useState('');
  const [fontError, setFontError] = useState(false);

  useEffect(() => {
    initializePopup();
  }, []);

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

        {/* OpenType Features Grid */}
        <div className="opentype-grid">
          <button
            onClick={() => toggleOpenTypeFeature('ss01')}
            className={`opentype-block ${state.settings.openTypeFeatures.ss01 ? 'active' : ''}`}
          >
            <div className="opentype-label">STYLISTIC SETS</div>
            <div className="opentype-status">{state.settings.openTypeFeatures.ss01 ? 'ON' : 'OFF'}</div>
          </button>

          <button
            onClick={() => toggleOpenTypeFeature('swsh')}
            className={`opentype-block ${state.settings.openTypeFeatures.swsh ? 'active' : ''}`}
          >
            <div className="opentype-label">SWASHES</div>
            <div className="opentype-status">{state.settings.openTypeFeatures.swsh ? 'ON' : 'OFF'}</div>
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