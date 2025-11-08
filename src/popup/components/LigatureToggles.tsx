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
  const handleLigaClick = () => {
    if (!disabled) {
      // Toggle .liga, keep .dlig as is
      // Allow clicking even if not detected as available - detection might not be perfect
      onChange(!liga, dlig);
    }
  };

  const handleDligClick = () => {
    if (!disabled) {
      // Toggle .dlig, keep .liga as is
      // Allow clicking even if not detected as available - detection might not be perfect
      onChange(liga, !dlig);
    }
  };

  return (
    <div className="opentype-feature-row">
      <div className="opentype-feature-label">Ligatures</div>
      <div className="opentype-feature-toggle">
        <button
          onClick={handleLigaClick}
          className={`opentype-toggle-btn ${liga ? 'active' : ''} ${!supportsLIGA && supportsLIGA !== undefined ? 'unsupported' : ''}`}
          disabled={disabled}
          title={!supportsLIGA && supportsLIGA !== undefined ? 'Not detected for this font' : ''}
        >
          .liga
        </button>
        <button
          onClick={handleDligClick}
          className={`opentype-toggle-btn ${dlig ? 'active' : ''} ${!supportsDLIG && supportsDLIG !== undefined ? 'unsupported' : ''}`}
          disabled={disabled}
          title={!supportsDLIG && supportsDLIG !== undefined ? 'Not detected for this font' : ''}
        >
          .dlig
        </button>
      </div>
    </div>
  );
};

