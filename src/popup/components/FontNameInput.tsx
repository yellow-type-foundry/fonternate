import React, { useState, useEffect, useRef } from 'react';

interface FontNameInputProps {
  value: string;
  onChange: (value: string) => void;
  onDetectCapabilities: (fontName: string) => Promise<void>;
  onApplyFont?: (fontName?: string) => void;
  loading: boolean;
  error?: string | null;
}

export const FontNameInput: React.FC<FontNameInputProps> = ({
  value,
  onChange,
  onDetectCapabilities,
  onApplyFont,
  loading,
  error,
}) => {
  // Use local state that syncs with prop when prop changes externally (e.g., after Reset or Previous Font)
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const isFocusedRef = useRef(false);
  
  // Sync localValue with prop when prop changes, but only if input is not focused (user not typing)
  useEffect(() => {
    if (!isFocusedRef.current && value !== localValue) {
      // Sync when prop changes and input is not focused
      setLocalValue(value);
    }
  }, [value, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Update parent state immediately (needed for font swapping)
    onChange(newValue);

    // REMOVED: Automatic capability detection while typing causes refresh issues
    // Capabilities will be detected when user presses Enter or changes other settings
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && localValue.trim()) {
      e.preventDefault();
      const fontNameToApply = localValue.trim();
      // Detect capabilities first, then apply font
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
    <div className="font-input-container">
      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={() => {
          isFocusedRef.current = false;
        }}
        placeholder="Enter font name"
        className={`font-input ${error ? 'error' : ''} ${loading ? 'loading' : ''}`}
        disabled={loading}
      />
      {error && (
        <div className="font-error show">
          {error}
        </div>
      )}
    </div>
  );
};

