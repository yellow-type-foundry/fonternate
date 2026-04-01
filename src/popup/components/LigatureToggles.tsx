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
  const toggleIcon = chrome.runtime.getURL('assets/bb8b02ee61663c03686c8906db3c0ef84f6a282f.svg');
  const ligaDisabled = disabled || (!supportsLIGA && supportsLIGA !== undefined);
  const dligDisabled = disabled || (!supportsDLIG && supportsDLIG !== undefined);

  const handleLigaClick = () => {
    if (!ligaDisabled) {
      onChange(!liga, dlig);
    }
  };

  const handleDligClick = () => {
    if (!dligDisabled) {
      onChange(liga, !dlig);
    }
  };

  return (
    <div className="opentype-subfeature-group">
      <div className="opentype-feature-row">
        <div className="opentype-feature-sub-label">Standard Ligature (.liga)</div>
        <div className="opentype-feature-toggle">
          <button
            onClick={handleLigaClick}
            className={`toggle-switch ${liga ? 'active' : ''}`}
            disabled={ligaDisabled}
            title={!supportsLIGA && supportsLIGA !== undefined ? 'Not detected for this font' : ''}
            type="button"
          >
            <div className="toggle-switch-handle"></div>
            <img src={toggleIcon} alt="" className="toggle-switch-icon" />
          </button>
        </div>
      </div>
      <div className="opentype-feature-row">
        <div className="opentype-feature-sub-label">Rare Ligature (.dlig)</div>
        <div className="opentype-feature-toggle">
          <button
            onClick={handleDligClick}
            className={`toggle-switch ${dlig ? 'active' : ''}`}
            disabled={dligDisabled}
            title={!supportsDLIG && supportsDLIG !== undefined ? 'Not detected for this font' : ''}
            type="button"
          >
            <div className="toggle-switch-handle"></div>
            <img src={toggleIcon} alt="" className="toggle-switch-icon" />
          </button>
        </div>
      </div>
    </div>
  );
};

