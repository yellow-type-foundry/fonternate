import React from 'react';
import { AppState } from '../types';
import { buildFontName } from '../utils/fontUtils';

interface DevLayoutProps {
  children: React.ReactNode;
  state: AppState;
}

const PANGRAMS = [
  'The quick brown fox jumps over the lazy dog',
  'Pack my box with five dozen liquor jugs',
  'How vexingly quick daft zebras jump!',
  'Sphinx of black quartz, judge my vow',
  'Waltz, bad nymph, for quick jigs vex',
];

const NUMBERS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const LIGATURES = 'fi fl ff ffi ffl';

export const DevLayout: React.FC<DevLayoutProps> = ({ children, state }) => {
  // Use font name as-is - don't add weight suffixes
  const fullFontName = state.fontName;
  
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
  
  // Build font-feature-settings CSS
  const features: string[] = [];
  
  // Add stylistic sets
  if (state.stylisticSets.size > 0) {
    Array.from(state.stylisticSets).forEach(num => {
      features.push(`"ss${num.toString().padStart(2, '0')}" 1`);
    });
  }
  
  // Add swash
  if (state.swashLevel > 0) {
    features.push('"swsh" 1');
  }
  
  // Add ligatures
  features.push(`"liga" ${state.liga ? '1' : '0'}`);
  features.push(`"dlig" ${state.dlig ? '1' : '0'}`);
  
  // Add contextual alternates
  features.push(`"calt" ${state.calt ? '1' : '0'}`);
  
  const fontFeatureSettings = features.length > 0 ? features.join(', ') : 'normal';
  
  const textTransform = state.textTransform !== 'none' ? state.textTransform : undefined;
  
  const fontStyle: React.CSSProperties = {
    fontFamily: fullFontName ? `"${fullFontName}"` : 'inherit',
    fontWeight: getFontWeightValue(state.fontWeight),
    fontFeatureSettings: fontFeatureSettings,
    textTransform: textTransform,
  };

  return (
    <div className="dev-layout-container">
      <div className="dev-layout-sidebar">
        {children}
      </div>
      <div className="dev-layout-preview">
        <div className="dev-preview-header">Type Preview</div>
        <div className="dev-preview-content">
          <div className="dev-preview-section">
            <div className="dev-preview-label">Pangrams</div>
            <div className="dev-preview-text" style={fontStyle}>
              {PANGRAMS.map((pangram, index) => (
                <div key={index} className="dev-preview-line">
                  {pangram}
                </div>
              ))}
            </div>
          </div>
          
          <div className="dev-preview-section">
            <div className="dev-preview-label">Numbers & Symbols</div>
            <div className="dev-preview-text" style={fontStyle}>
              <div className="dev-preview-line">{NUMBERS}</div>
              <div className="dev-preview-line">{SYMBOLS}</div>
            </div>
          </div>
          
          <div className="dev-preview-section">
            <div className="dev-preview-label">Ligatures</div>
            <div className="dev-preview-text" style={fontStyle}>
              <div className="dev-preview-line">{LIGATURES}</div>
            </div>
          </div>
          
          <div className="dev-preview-section">
            <div className="dev-preview-label">Font Info</div>
            <div className="dev-preview-info">
              <div className="dev-preview-info-line">
                <span className="dev-preview-info-label">Font:</span>
                <span className="dev-preview-info-value">{fullFontName || 'None'}</span>
              </div>
              <div className="dev-preview-info-line">
                <span className="dev-preview-info-label">Weight:</span>
                <span className="dev-preview-info-value">{state.fontWeight}</span>
              </div>
              {state.stylisticSets.size > 0 && (
                <div className="dev-preview-info-line">
                  <span className="dev-preview-info-label">Stylistic Sets:</span>
                  <span className="dev-preview-info-value">
                    {Array.from(state.stylisticSets).sort().map(n => `ss${n.toString().padStart(2, '0')}`).join(', ')}
                  </span>
                </div>
              )}
              <div className="dev-preview-info-line">
                <span className="dev-preview-info-label">Ligatures:</span>
                <span className="dev-preview-info-value">
                  {state.liga ? 'Standard' : 'Off'}{state.dlig ? ' + Discretionary' : ''}
                </span>
              </div>
              {state.calt && (
                <div className="dev-preview-info-line">
                  <span className="dev-preview-info-label">Contextual Alternates:</span>
                  <span className="dev-preview-info-value">On</span>
                </div>
              )}
              {state.swashLevel > 0 && (
                <div className="dev-preview-info-line">
                  <span className="dev-preview-info-label">Swash:</span>
                  <span className="dev-preview-info-value">Level {state.swashLevel}</span>
                </div>
              )}
              {textTransform && (
                <div className="dev-preview-info-line">
                  <span className="dev-preview-info-label">Transform:</span>
                  <span className="dev-preview-info-value">{textTransform}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
