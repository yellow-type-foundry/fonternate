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
  const isAvailable = availableLevels.length > 0 || availableLevels.includes(0);

  const lineIcon = chrome.runtime.getURL('assets/1691347d42a6c2278c21073ecc433cdb4d6f8d0d.svg');
  const circleIcon = chrome.runtime.getURL('assets/a16ce7203007e07c1a38449dd51461a86c4e5a98.svg');

  return (
    <div className="opentype-feature-row">
      <div className="opentype-feature-label">Swash</div>
      <div className="opentype-feature-toggle">
        <button
          onClick={() => !disabled && onChange(1)}
          className={`opentype-toggle-btn ${isOn ? 'active' : ''}`}
          disabled={disabled || !isAvailable}
        >
          <div className="toggle-icon-wrapper toggle-icon-line">
            <img src={lineIcon} alt="" className="toggle-icon" />
          </div>
        </button>
        <button
          onClick={() => !disabled && onChange(0)}
          className={`opentype-toggle-btn ${!isOn ? 'active' : ''}`}
          disabled={disabled || !isAvailable}
        >
          <div className="toggle-icon-wrapper">
            <img src={circleIcon} alt="" className="toggle-icon" />
          </div>
        </button>
      </div>
    </div>
  );
};

