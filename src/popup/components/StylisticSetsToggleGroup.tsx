import React, { useState, useEffect, useRef } from 'react';

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
  const isEnabled = selected.size > 0;
  const toggleIcon = chrome.runtime.getURL('assets/bb8b02ee61663c03686c8906db3c0ef84f6a282f.svg');
  const dropdownIcon = chrome.runtime.getURL('assets/b6f0a6492b53cadfb99ebbc4fe6556306ce1a6b9.svg');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Get the first selected set for display, or default to SS03 if none selected
  const displaySet = selected.size > 0 ? Array.from(selected).sort()[0] : 3;
  const displayText = `SS0${displaySet}`;

  // Available sets (1-9)
  const allSets = [1, 2, 3, 4, 5, 6, 7, 8, 9];

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
      // Toggle stylistic sets on/off
      if (isEnabled) {
        // Turn off all selected sets
        selected.forEach(num => onChange(num));
        setShowDropdown(false);
      } else {
        // Turn on SS03 by default
        onChange(3);
      }
    }
  };

  const handleDropdownClick = () => {
    if (!disabled && isEnabled) {
      setShowDropdown(!showDropdown);
    }
  };

  const handleSetSelect = (num: number) => {
    if (!disabled && isEnabled) {
      // Clear all current selections and select the new one
      selected.forEach(currentNum => {
        if (currentNum !== num) {
          onChange(currentNum);
        }
      });
      // Toggle the selected one (if already selected, deselect it; otherwise select it)
      onChange(num);
      setShowDropdown(false);
    }
  };

  return (
    <div className="stylistic-sets-container">
      <div className="opentype-label-header">Stylistic sets</div>
      <div className="stylistic-sets-controls">
        {isEnabled && (
          <div className="stylistic-sets-dropdown-wrapper" ref={dropdownRef}>
            <button
              onClick={handleDropdownClick}
              className="stylistic-sets-dropdown"
              disabled={disabled}
              type="button"
            >
              <span className="stylistic-sets-dropdown-text">{displayText}</span>
              <img src={dropdownIcon} alt="" className="stylistic-sets-dropdown-icon" />
            </button>
            {showDropdown && (
              <div className="stylistic-sets-dropdown-menu">
                {allSets.map((num) => {
                  const isSelected = selected.has(num);
                  return (
                    <button
                      key={num}
                      onClick={() => handleSetSelect(num)}
                      className={`stylistic-sets-dropdown-item ${isSelected ? 'active' : ''}`}
                      type="button"
                    >
                      SS0{num}
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


