import React, { useState, useEffect } from 'react';

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
  // Use local state that syncs with prop when prop is cleared (e.g., after Reset)
  const [localValue, setLocalValue] = useState(value);
  
  // Sync localValue with prop when prop is cleared (e.g., after Reset)
  useEffect(() => {
    if (!value && localValue) {
      // Only sync when prop is cleared - don't sync when user is typing
      setLocalValue('');
    }
  }, [value]);

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
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
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

