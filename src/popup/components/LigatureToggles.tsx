import React from 'react';

interface LigatureTogglesProps {
  liga: boolean;
  dlig: boolean;
  supportsLIGA: boolean;
  supportsDLIG: boolean;
  onChange: (liga: boolean, dlig: boolean) => void;
  disabled?: boolean;
}

export const LigatureToggles: React.FC<LigatureTogglesProps> = ({
  liga,
  dlig,
  supportsLIGA,
  supportsDLIG,
  onChange,
  disabled = false,
}) => {
  const isEnabled = liga || dlig;
  const toggleIcon = chrome.runtime.getURL('assets/bb8b02ee61663c03686c8906db3c0ef84f6a282f.svg');

  const handleToggleSwitch = () => {
    if (!disabled) {
      // Toggle both ligatures on/off
      if (isEnabled) {
        onChange(false, false);
      } else {
        onChange(true, false); // Default to .liga when enabling
      }
    }
  };

  const handleLigaClick = () => {
    if (!disabled && isEnabled) {
      // Toggle .liga, keep .dlig as is
      onChange(!liga, dlig);
    }
  };

  const handleDligClick = () => {
    if (!disabled && isEnabled) {
      // Toggle .dlig, keep .liga as is
      onChange(liga, !dlig);
    }
  };

  return (
    <div className="opentype-feature-row">
      <div className="opentype-feature-label">Ligatures</div>
      <div className="opentype-feature-toggle">
        <button
          onClick={handleToggleSwitch}
          className={`toggle-switch ${isEnabled ? 'active' : ''}`}
          disabled={disabled}
          type="button"
        >
          <div className="toggle-switch-handle"></div>
          <img src={toggleIcon} alt="" className="toggle-switch-icon" />
        </button>
        <div className="ligature-buttons-container">
          <button
            onClick={handleLigaClick}
            className={`ligature-button ${liga ? 'active' : ''} ${!supportsLIGA && supportsLIGA !== undefined ? 'unsupported' : ''} ${!isEnabled ? 'disabled' : ''}`}
            disabled={disabled || !isEnabled}
            title={!supportsLIGA && supportsLIGA !== undefined ? 'Not detected for this font' : ''}
            type="button"
          >
            .LIGA
          </button>
          <button
            onClick={handleDligClick}
            className={`ligature-button ${dlig ? 'active' : ''} ${!supportsDLIG && supportsDLIG !== undefined ? 'unsupported' : ''} ${!isEnabled ? 'disabled' : ''}`}
            disabled={disabled || !isEnabled}
            title={!supportsDLIG && supportsDLIG !== undefined ? 'Not detected for this font' : ''}
            type="button"
          >
            .DLIG
          </button>
        </div>
      </div>
    </div>
  );
};

