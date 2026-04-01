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
  const [localValue, setLocalValue] = useState(value);
  const isFocusedRef = useRef(false);

  useEffect(() => {
    if (!isFocusedRef.current && value !== localValue) {
      setLocalValue(value);
    }
  }, [value, localValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && localValue.trim()) {
      e.preventDefault();
      const fontNameToApply = localValue.trim();
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
        onFocus={() => {
          isFocusedRef.current = true;
        }}
        onBlur={() => {
          isFocusedRef.current = false;
        }}
        placeholder="Type font name"
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
