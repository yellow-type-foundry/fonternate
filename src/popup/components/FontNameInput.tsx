import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getInstalledFonts, InstalledFont } from '../../utils/fontDetection';

/** queryLocalFonts() requires a user gesture in Chrome; call only from pointer/focus handlers, not on mount. */

interface FontNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onDetectCapabilities: (fontName: string) => Promise<void>;
  onApplyFont?: (fontName?: string) => void;
  onDetectPageFont?: () => Promise<void>;
  loading: boolean;
  error?: string | null;
}

export const FontNameInput: React.FC<FontNameInputProps> = ({
  value,
  onChange,
  onDetectCapabilities,
  onApplyFont,
  onDetectPageFont,
  loading,
  error,
}) => {
  // Use local state that syncs with prop when prop changes externally (e.g., after Reset)
  const [localValue, setLocalValue] = useState(value);
  const [installedFonts, setInstalledFonts] = useState<InstalledFont[]>([]);
  const [fontsLoading, setFontsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredFonts, setFilteredFonts] = useState<InstalledFont[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);
  const hasLoadedFontListRef = useRef(false);
  const fontListLoadInFlightRef = useRef(false);
  const loadAttemptsRef = useRef(0);

  const loadInstalledFontsWithGesture = useCallback(async () => {
    if (hasLoadedFontListRef.current || fontListLoadInFlightRef.current) return;
    if (loadAttemptsRef.current >= 2) return;
    loadAttemptsRef.current += 1;
    fontListLoadInFlightRef.current = true;
    setFontsLoading(true);
    try {
      const fonts = await getInstalledFonts();
      setInstalledFonts(fonts);
      setFilteredFonts(fonts.slice(0, 10));
      if (fonts.length > 0) {
        hasLoadedFontListRef.current = true;
      }
    } catch (err) {
      console.error('[Fonternate] Failed to load installed fonts:', err);
    } finally {
      setFontsLoading(false);
      fontListLoadInFlightRef.current = false;
    }
  }, []);

  // Sync localValue with prop when prop changes, but only if input is not focused (user not typing)
  useEffect(() => {
    if (!isFocusedRef.current && value !== localValue) {
      // Sync when prop changes and input is not focused
      setLocalValue(value);
    }
  }, [value, localValue]);

  // Filter fonts based on input
  useEffect(() => {
    if (localValue.trim()) {
      const filter = localValue.toLowerCase();
      const filtered = installedFonts.filter(font =>
        font.family.toLowerCase().includes(filter) ||
        font.fullName.toLowerCase().includes(filter)
      );
      setFilteredFonts(filtered.slice(0, 10)); // Limit to 10 results
    } else {
      setFilteredFonts(installedFonts.slice(0, 10));
    }
  }, [localValue, installedFonts]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    setShowDropdown(true);
    
    // Try to match user input to exact system font name (case-insensitive)
    // This ensures we use the exact font name from the system, not user-typed variations
    if (newValue.trim() && installedFonts.length > 0) {
      const lowerInput = newValue.trim().toLowerCase();
      const exactMatch = installedFonts.find(font => 
        font.family.toLowerCase() === lowerInput ||
        font.fullName.toLowerCase() === lowerInput
      );
      
      if (exactMatch) {
        // Use the EXACT font name from the system (with correct capitalization)
        console.log('[Fonternate] Matched user input to exact system font:', exactMatch.family);
        onChange(exactMatch.family);
        setLocalValue(exactMatch.family);
        return;
      }
    }
    
    // If no exact match, use what user typed (they might be typing a new name)
    onChange(newValue);

    // REMOVED: Automatic capability detection while typing causes refresh issues
    // Capabilities will be detected when user presses Enter or changes other settings
  };

  const handleFontSelect = (font: InstalledFont) => {
    setLocalValue(font.family);
    onChange(font.family);
    setShowDropdown(false);
    if (onDetectCapabilities) {
      onDetectCapabilities(font.family).then(() => {
        if (onApplyFont) {
          onApplyFont(font.family);
        }
      });
    } else if (onApplyFont) {
      onApplyFont(font.family);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && localValue.trim()) {
      e.preventDefault();
      
      // Try to match to exact system font name first (case-insensitive)
      const lowerInput = localValue.trim().toLowerCase();
      const exactMatch = installedFonts.find(font => 
        font.family.toLowerCase() === lowerInput ||
        font.fullName.toLowerCase() === lowerInput
      );
      
      const fontNameToApply = exactMatch ? exactMatch.family : localValue.trim();
      
      if (exactMatch) {
        console.log('[Fonternate] Enter pressed - using exact system font name:', fontNameToApply);
        setLocalValue(fontNameToApply);
        onChange(fontNameToApply);
      }
      
      // Detect capabilities first, then apply font with exact name
      if (onDetectCapabilities) {
        onDetectCapabilities(fontNameToApply).then(() => {
          if (onApplyFont) {
            onApplyFont(fontNameToApply);
          }
        });
      } else if (onApplyFont) {
        onApplyFont(fontNameToApply);
      }
    }
  };

  return (
    <div className="font-input-container" style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPointerDown={() => {
          // Pointer counts as user activation for queryLocalFonts(); focus alone can be flaky.
          void loadInstalledFontsWithGesture();
        }}
        onFocus={() => {
          isFocusedRef.current = true;
          setShowDropdown(true);
          void loadInstalledFontsWithGesture();
        }}
        onBlur={() => {
          isFocusedRef.current = false;
          // Delay closing dropdown so mousedown + click on items can run first
          setTimeout(() => setShowDropdown(false), 180);
        }}
        placeholder="Select or type font name"
        className={`font-input ${error ? 'error' : ''} ${loading ? 'loading' : ''}`}
        disabled={loading}
      />
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="font-dropdown"
          onMouseDown={(e) => e.preventDefault()}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'white',
            border: '1px solid #e9e4e2',
            borderRadius: '8px',
            marginTop: '4px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {fontsLoading ? (
            <div className="font-dropdown-message">Loading fonts…</div>
          ) : filteredFonts.length > 0 ? (
            filteredFonts.map((font, index) => (
              <div
                key={`${font.family}-${index}`}
                role="option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleFontSelect(font)}
                style={{
                  padding: '10px 14px',
                  cursor: 'pointer',
                  fontFamily: `"${font.family}"`,
                  fontSize: '14px',
                  borderBottom: index < filteredFonts.length - 1 ? '1px solid #f5f5f5' : 'none',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '#f9f6f5';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'white';
                }}
              >
                {font.family}
              </div>
            ))
          ) : (
            <div className="font-dropdown-message">
              {localValue.trim()
                ? 'No matching fonts'
                : installedFonts.length === 0
                  ? fontsLoading
                    ? 'Loading fonts…'
                    : 'Click the field above — local fonts load after you interact (Chrome requires this). Or type a name and press Enter.'
                  : 'No fonts to show'}
            </div>
          )}
        </div>
      )}
      {error && (
        <div className="font-error show">
          {error}
        </div>
      )}
    </div>
  );
};

