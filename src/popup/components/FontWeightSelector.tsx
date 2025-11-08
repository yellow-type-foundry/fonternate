import React from 'react';
import { buildFontName, getAvailableWeightSuffixes } from '../../utils/fontUtils';

interface FontWeightSelectorProps {
  fontName: string;              // Base font family name (without weight)
  fontWeight: string;             // Current weight suffix (e.g., "regular", "bold")
  onChange: (newFontName: string) => void;  // Called with full font name (baseName-weight)
  disabled?: boolean;
}

export const FontWeightSelector: React.FC<FontWeightSelectorProps> = ({
  fontName,
  fontWeight,
  onChange,
  disabled = false,
}) => {
  const availableWeights = getAvailableWeightSuffixes();
  
  // Always show the selector, even when no font name is provided
  // When disabled (no font name), still show it but with disabled state
  const isDisabled = disabled || !fontName || !fontName.trim();

  const handleWeightChange = (newSuffix: string) => {
    if (!fontName || !fontName.trim()) {
      return;
    }
    const newFontName = buildFontName(fontName, newSuffix);
    onChange(newFontName);
  };

  return (
    <div className="segmented-control font-weight-control">
      {availableWeights.map((weight, index) => {
        const isActive = weight.suffix === fontWeight;
        const isFirst = index === 0;
        const isLast = index === availableWeights.length - 1;

        return (
          <button
            key={weight.suffix}
            onClick={() => !isDisabled && handleWeightChange(weight.suffix)}
            className={`segmented-control-btn ${isActive ? 'active' : ''} ${
              isFirst ? 'first' : ''
            } ${isLast ? 'last' : ''} ${isDisabled ? 'disabled' : ''}`}
            disabled={isDisabled}
            type="button"
            title={weight.label}
          >
            {weight.label}
          </button>
        );
      })}
    </div>
  );
};

