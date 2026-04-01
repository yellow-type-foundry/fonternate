import React from 'react';
import { FontStyle } from '../../types';

interface FontStyleSegmentedProps {
  value: FontStyle;
  onChange: (value: FontStyle) => void;
  disabled?: boolean;
}

export const FontStyleSegmented: React.FC<FontStyleSegmentedProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const isItalic = value === 'italic';

  return (
    <div className="font-style-section">
      <div className="font-style-single">
        <button
          type="button"
          className={`segmented-control-btn first last ${isItalic ? 'active' : ''} ${
            disabled ? 'disabled' : ''
          }`}
          onClick={() => !disabled && onChange(isItalic ? 'normal' : 'italic')}
          disabled={disabled}
          title="Italic"
        >
          Aa
        </button>
      </div>
    </div>
  );
};
