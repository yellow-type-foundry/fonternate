import React from 'react';
import { TextTransform } from '../../types';

interface TextTransformSegmentedProps {
  value: TextTransform;
  onChange: (value: TextTransform) => void;
  disabled?: boolean;
}

export const TextTransformSegmented: React.FC<TextTransformSegmentedProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const options: { value: TextTransform; label: string }[] = [
    { value: 'none', label: 'Aa' },
    { value: 'uppercase', label: 'AA' },
    { value: 'lowercase', label: 'aa' },
  ];

  return (
    <div className="text-transform-section">
      <div className="text-transform-label">Text transform</div>
      <div className="text-transform-buttons">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => !disabled && onChange(option.value)}
            className={`text-transform-btn ${value === option.value ? 'active' : ''}`}
            disabled={disabled}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};


