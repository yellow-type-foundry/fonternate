import React, { useState, useEffect, useRef } from 'react';

interface TextStylesToggleGroupProps {
  selected: Set<string>;
  onChange: (style: string) => void;
  disabled?: boolean;
}

export const TextStylesToggleGroup: React.FC<TextStylesToggleGroupProps> = ({
  selected,
  onChange,
  disabled = false,
}) => {
  const isEnabled = selected.size > 0;
  const toggleIcon = chrome.runtime.getURL('assets/bb8b02ee61663c03686c8906db3c0ef84f6a282f.svg');
  const dropdownIcon = chrome.runtime.getURL('assets/b6f0a6492b53cadfb99ebbc4fe6556306ce1a6b9.svg');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Format display text for multiple selections
  const getDisplayText = () => {
    if (selected.size === 0) return 'H1';
    const sorted = Array.from(selected).sort();
    if (sorted.length === 1) {
      return sorted[0].toUpperCase();
    } else if (sorted.length <= 2) {
      return sorted.map(s => s.toUpperCase()).join(', ');
    } else {
      return `${sorted[0].toUpperCase()} +${sorted.length - 1}`;
    }
  };
  const displayText = getDisplayText();

  // Available text styles
  const allStyles = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'li', 'td', 'th', 'label', 'button', 'input', 'textarea', 'select'];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleToggleSwitch = () => {
    if (!disabled) {
      // Toggle text styles on/off
      if (isEnabled) {
        // Turn off all selected styles
        selected.forEach(style => onChange(style));
        setShowDropdown(false);
      } else {
        // Turn on H1 by default
        onChange('h1');
      }
    }
  };

  const handleDropdownClick = () => {
    if (!disabled && isEnabled) {
      setShowDropdown(!showDropdown);
    }
  };

  const handleStyleSelect = (style: string) => {
    if (!disabled && isEnabled) {
      // Toggle the selected one (if already selected, deselect it; otherwise select it)
      // Allow multiple selections - don't clear others
      onChange(style);
      // Keep dropdown open for multiple selections
    }
  };

  return (
    <div className="stylistic-sets-container">
      <div className="opentype-label-header">Specific styles</div>
      <div className="stylistic-sets-controls">
        {isEnabled && (
          <div className="stylistic-sets-dropdown-wrapper" ref={dropdownRef}>
            <button
              onClick={handleDropdownClick}
              className={`stylistic-sets-dropdown ${showDropdown ? 'open' : ''}`}
              disabled={disabled}
              type="button"
            >
              <span className="stylistic-sets-dropdown-text">{displayText}</span>
              <img src={dropdownIcon} alt="" className="stylistic-sets-dropdown-icon" />
            </button>
            {showDropdown && (
              <div className="stylistic-sets-dropdown-menu">
                {allStyles.map((style) => {
                  const isSelected = selected.has(style);
                  return (
                    <button
                      key={style}
                      onClick={() => handleStyleSelect(style)}
                      className={`stylistic-sets-dropdown-item ${isSelected ? 'active' : ''}`}
                      type="button"
                    >
                      {style.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
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

