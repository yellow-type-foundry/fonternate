import React, { useState, useRef, useEffect, useCallback } from 'react';

interface TrackingSliderProps {
  value: number;              // Current tracking value in em (e.g., 0, 0.05, -0.1)
  onChange: (value: number) => void;
  disabled?: boolean;
}

export const TrackingSlider: React.FC<TrackingSliderProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const sliderRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  
  // Tracking range: -0.1em to 0.5em
  const MIN_VALUE = -0.1;
  const MAX_VALUE = 0.5;
  const STEP = 0.01;
  
  const isDisabled = disabled;
  
  // Calculate handle position based on value
  const getHandlePosition = useCallback((val: number): number => {
    const normalized = (val - MIN_VALUE) / (MAX_VALUE - MIN_VALUE);
    return Math.max(0, Math.min(100, normalized * 100));
  }, []);
  
  const [handlePosition, setHandlePosition] = useState(() => getHandlePosition(value));
  const [handleLeftPosition, setHandleLeftPosition] = useState('0px');
  
  // Calculate handle left position relative to tracker
  const updateHandlePosition = useCallback(() => {
    if (!trackerRef.current || !innerContainerRef.current || !handleRef.current) return;
    
    const trackerRect = trackerRef.current.getBoundingClientRect();
    const innerContainerRect = innerContainerRef.current.getBoundingClientRect();
    const trackerWidth = trackerRect.width;
    const trackerLeft = trackerRect.left - innerContainerRect.left;
    const innerContainerWidth = innerContainerRect.width;
    const handleWidth = 16;
    
    const percentage = getHandlePosition(value);
    const handleCenterPosition = trackerLeft + (percentage / 100) * trackerWidth;
    let left = handleCenterPosition - 8;
    
    const maxLeft = innerContainerWidth - handleWidth;
    left = Math.max(0, Math.min(left, maxLeft));
    
    setHandleLeftPosition(`${left}px`);
  }, [value, getHandlePosition]);
  
  useEffect(() => {
    updateHandlePosition();
    
    const resizeObserver = new ResizeObserver(updateHandlePosition);
    if (innerContainerRef.current) {
      resizeObserver.observe(innerContainerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [updateHandlePosition]);
  
  useEffect(() => {
    updateHandlePosition();
  }, [value, updateHandlePosition]);
  
  // Convert pixel position to value
  const getValueFromPosition = useCallback((clientX: number): number => {
    if (!trackerRef.current) return value;
    const rect = trackerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const normalized = percentage / 100;
    const newValue = MIN_VALUE + normalized * (MAX_VALUE - MIN_VALUE);
    // Round to nearest step
    return Math.round(newValue / STEP) * STEP;
  }, [value]);
  
  const handleValueChange = useCallback((newValue: number) => {
    if (isDisabled) return;
    const clamped = Math.max(MIN_VALUE, Math.min(MAX_VALUE, newValue));
    onChange(clamped);
  }, [onChange, isDisabled]);
  
  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [isDisabled]);
  
  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !trackerRef.current) return;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(() => {
        const newValue = getValueFromPosition(e.clientX);
        if (Math.abs(newValue - value) > STEP / 2) {
          handleValueChange(newValue);
        }
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
    
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isDragging, value, handleValueChange, getValueFromPosition]);
  
  // Handle track click
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (isDisabled) return;
    if ((e.target as HTMLElement).closest('.slider-handle')) {
      return;
    }
    const newValue = getValueFromPosition(e.clientX);
    handleValueChange(newValue);
  }, [isDisabled, getValueFromPosition, handleValueChange]);
  
  const handleImg = chrome.runtime.getURL('assets/cdbebb17f3c80ce9ed3e39f742a8b05f7af6467b.svg');
  
  return (
    <div className="font-weight-slider-container">
      {/* Tracking Label */}
      <div className="opentype-label-header">
        Tracking: {value >= 0 ? '+' : ''}{value.toFixed(2)}em
      </div>
      
      {/* Slider Track Container */}
      <div 
        ref={sliderRef}
        className={`font-weight-slider-track ${isDisabled ? 'disabled' : ''}`}
        onClick={handleTrackClick}
      >
        <div ref={innerContainerRef} className="slider-inner-container">
          <div ref={trackerRef} className="slider-tracker">
            {/* No tick dots - just the track */}
          </div>
          <div
            ref={handleRef}
            className={`slider-handle ${isDragging ? 'dragging' : ''} ${isDisabled ? 'disabled' : ''}`}
            style={{ left: handleLeftPosition }}
            onMouseDown={handleMouseDown}
          >
            <img 
              src={handleImg} 
              alt="Slider handle" 
              className="slider-handle-svg"
              style={{ 
                width: '16px', 
                height: '24px',
                objectFit: 'cover',
                display: 'block'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
