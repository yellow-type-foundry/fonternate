import React from 'react';

interface StylisticSetsToggleGroupProps {
  selected: Set<number>;
  available: number[];
  onChange: (num: number) => void;
  disabled?: boolean;
}

export const StylisticSetsToggleGroup: React.FC<StylisticSetsToggleGroupProps> = ({
  selected,
  available,
  onChange,
  disabled = false,
}) => {
  const allSets = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const handleClick = (num: number) => {
    if (!disabled) {
      // Allow clicking even if not detected as available - detection might not be perfect
      onChange(num);
    }
  };

  // Always show buttons - allow users to try stylistic sets even if not detected
  // If no capabilities detected yet, show all buttons as clickable

  return (
    <div className="stylistic-sets-container">
      <div className="opentype-label-header">Stylistic sets</div>
      <div className="stylistic-tabs">
        {allSets.map((num) => {
          const isAvailable = available.length === 0 || available.includes(num);
          const isSelected = selected.has(num);
          
          return (
            <button
              key={num}
              onClick={() => handleClick(num)}
              className={`stylistic-tab ${isSelected ? 'active' : ''} ${!isAvailable ? 'unsupported' : ''}`}
              disabled={disabled}
              title={!isAvailable && available.length > 0 ? 'Not detected for this font' : ''}
            >
              {num}
            </button>
          );
        })}
      </div>
    </div>
  );
};


