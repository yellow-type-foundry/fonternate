import React from 'react';

export interface SegmentedControlOption<T = string> {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
}

interface SegmentedControlProps<T = string> {
  options: SegmentedControlOption<T>[];
  value: T | T[];
  onChange: (value: T) => void;
  disabled?: boolean;
  className?: string;
  multiple?: boolean;
}

export const SegmentedControl = <T extends string | number>({
  options,
  value,
  onChange,
  disabled = false,
  className = '',
  multiple = false,
}: SegmentedControlProps<T>) => {
  const isSelected = (optionValue: T): boolean => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <div className={`segmented-control ${className}`}>
      {options.map((option, index) => {
        const isActive = isSelected(option.value);
        const isFirst = index === 0;
        const isLast = index === options.length - 1;
        const isOptionDisabled = disabled || option.disabled;

        return (
          <button
            key={`${option.value}-${index}`}
            onClick={() => !isOptionDisabled && onChange(option.value)}
            className={`segmented-control-btn ${isActive ? 'active' : ''} ${
              isFirst ? 'first' : ''
            } ${isLast ? 'last' : ''} ${isOptionDisabled ? 'disabled' : ''}`}
            disabled={isOptionDisabled}
            title={option.title}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

