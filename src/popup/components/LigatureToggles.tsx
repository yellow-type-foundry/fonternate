import React from 'react';
import { SegmentedControl, SegmentedControlOption } from './SegmentedControl';

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
      // Toggle .liga, keep .dlig as is (allow multiple selections)
      onChange(!liga, dlig);
    }
  };

  const handleDligClick = () => {
    if (!disabled && isEnabled) {
      // Toggle .dlig, keep .liga as is (allow multiple selections)
      onChange(liga, !dlig);
    }
  };

  // Determine which ligatures are "active" for the segmented control
  // Both can be active at the same time
  const activeLigatures: ('liga' | 'dlig')[] = [];
  if (liga) activeLigatures.push('liga');
  if (dlig) activeLigatures.push('dlig');

  const ligatureOptions: SegmentedControlOption<'liga' | 'dlig'>[] = [
    {
      value: 'liga',
      label: '.LIGA',
      disabled: !isEnabled || (!supportsLIGA && supportsLIGA !== undefined),
      title: !supportsLIGA && supportsLIGA !== undefined ? 'Not detected for this font' : '',
    },
    {
      value: 'dlig',
      label: '.DLIG',
      disabled: !isEnabled || (!supportsDLIG && supportsDLIG !== undefined),
      title: !supportsDLIG && supportsDLIG !== undefined ? 'Not detected for this font' : '',
    },
  ];

  const handleSegmentedChange = (value: 'liga' | 'dlig') => {
    if (value === 'liga') {
      handleLigaClick();
    } else {
      handleDligClick();
    }
  };

  return (
    <div className="opentype-feature-row">
      <div className="opentype-feature-label">Ligatures</div>
      <div className="opentype-feature-toggle">
        {isEnabled && (
          <SegmentedControl
            options={ligatureOptions}
            value={activeLigatures}
            onChange={handleSegmentedChange}
            disabled={disabled}
            multiple={true}
          />
        )}
        <button
          onClick={handleToggleSwitch}
          className={`toggle-switch ${isEnabled ? 'active' : ''}`}
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

