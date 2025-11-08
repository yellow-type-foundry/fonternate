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
  const lineIcon = chrome.runtime.getURL('assets/1691347d42a6c2278c21073ecc433cdb4d6f8d0d.svg');
  const circleIcon = chrome.runtime.getURL('assets/a16ce7203007e07c1a38449dd51461a86c4e5a98.svg');

  return (
    <div className="opentype-feature-row">
      <div className="opentype-feature-label">
        Contextual<br />Alternates
      </div>
      <div className="opentype-feature-toggle">
        <button
          onClick={() => !disabled && onChange(true)}
          className={`opentype-toggle-btn ${value ? 'active' : ''} ${!supportsCALT && supportsCALT !== undefined ? 'unsupported' : ''}`}
          disabled={disabled}
          title={!supportsCALT && supportsCALT !== undefined ? 'Not detected for this font' : ''}
        >
          <div className="toggle-icon-wrapper toggle-icon-line">
            <img src={lineIcon} alt="" className="toggle-icon" />
          </div>
        </button>
        <button
          onClick={() => !disabled && onChange(false)}
          className={`opentype-toggle-btn ${!value ? 'active' : ''} ${!supportsCALT && supportsCALT !== undefined ? 'unsupported' : ''}`}
          disabled={disabled}
          title={!supportsCALT && supportsCALT !== undefined ? 'Not detected for this font' : ''}
        >
          <div className="toggle-icon-wrapper">
            <img src={circleIcon} alt="" className="toggle-icon" />
          </div>
        </button>
      </div>
    </div>
  );
};


