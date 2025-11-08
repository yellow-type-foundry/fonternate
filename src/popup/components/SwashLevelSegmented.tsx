import React from 'react';

interface SwashLevelSegmentedProps {
  value: number;
  availableLevels: number[];
  onChange: (level: number) => void;
  disabled?: boolean;
}

export const SwashLevelSegmented: React.FC<SwashLevelSegmentedProps> = ({
  value,
  availableLevels,
  onChange,
  disabled = false,
}) => {
  // Swash is always ON/OFF toggle (0 = OFF, 1 = ON)
  const isOn = value > 0;
  // Swash is available if there are any levels available (including level 0 for OFF)
  const isAvailable = availableLevels.length > 0 || availableLevels.includes(0) || availableLevels.length === 0;
  const toggleIcon = chrome.runtime.getURL('assets/f83045a8da0c6eaee8edbbd12f6c188c923b60be.svg');

  const handleToggle = () => {
    if (!disabled) {
      onChange(isOn ? 0 : 1);
    }
  };

  return (
    <div className="opentype-feature-row">
      <div className="opentype-feature-label">Swash</div>
      <div className="opentype-feature-toggle">
        <button
          onClick={handleToggle}
          className={`toggle-switch ${isOn ? 'active' : ''}`}
          disabled={disabled}
          type="button"
        >
          <div className="toggle-switch-handle"></div>
          <img src={toggleIcon} alt="" className="toggle-switch-icon" />
        </button>
      </div>
    </div>
  );
};

