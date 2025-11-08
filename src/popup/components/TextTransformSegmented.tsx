import React from 'react';
import { TextTransform } from '../../types';
import { SegmentedControl, SegmentedControlOption } from './SegmentedControl';

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
  const options: SegmentedControlOption<TextTransform>[] = [
    { value: 'none', label: 'Aa' },
    { value: 'uppercase', label: 'AA' },
    { value: 'lowercase', label: 'aa' },
  ];

  return (
    <div className="text-transform-section">
      <div className="text-transform-label">Text transform</div>
      <SegmentedControl
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
};


