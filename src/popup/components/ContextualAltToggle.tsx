import React from 'react';

interface ContextualAltToggleProps {
  value: boolean;
  supportsCALT: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const ContextualAltToggle: React.FC<ContextualAltToggleProps> = ({
  value,
  supportsCALT,
  onChange,
  disabled = false,
}) => {
  const toggleIcon = chrome.runtime.getURL('assets/bb8b02ee61663c03686c8906db3c0ef84f6a282f.svg');

  const handleToggle = () => {
    if (!disabled) {
      onChange(!value);
    }
  };

  return (
    <div className="opentype-feature-row">
      <div className="opentype-feature-label">Contextual Alternates</div>
      <div className="opentype-feature-toggle">
        <button
          onClick={handleToggle}
          className={`toggle-switch ${value ? 'active' : ''}`}
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


