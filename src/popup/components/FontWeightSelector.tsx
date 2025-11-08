import React, { useState, useRef, useEffect, useCallback } from 'react';
import { buildFontName, getAvailableWeightSuffixes } from '../../utils/fontUtils';

interface FontWeightSelectorProps {
  fontName: string;              // Base font family name (without weight)
  fontWeight: string;             // Current weight suffix (e.g., "regular", "bold")
  onChange: (newFontName: string) => void;  // Called with full font name (baseName-weight)
  disabled?: boolean;
}

export const FontWeightSelector: React.FC<FontWeightSelectorProps> = ({
  fontName,
  fontWeight,
  onChange,
  disabled = false,
}) => {
  const availableWeights = getAvailableWeightSuffixes();
  const sliderRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  
  // Always show the selector, even when no font name is provided
  // When disabled (no font name), still show it but with disabled state
  const isDisabled = disabled || !fontName || !fontName.trim();

  // Find current weight index
  const currentWeightIndex = availableWeights.findIndex(w => w.suffix === fontWeight);
  const currentWeight = currentWeightIndex >= 0 ? availableWeights[currentWeightIndex] : availableWeights[0];

  // Calculate handle position based on weight index
  const getHandlePosition = useCallback((weightIndex: number): number => {
    if (weightIndex < 0) return 0;
    if (weightIndex >= availableWeights.length - 1) return 100;
    // Map index to percentage (0 to 100)
    return (weightIndex / (availableWeights.length - 1)) * 100;
  }, [availableWeights.length]);

  const [handlePosition, setHandlePosition] = useState(() => 
    getHandlePosition(currentWeightIndex >= 0 ? currentWeightIndex : 0)
  );
  
  const [handleLeftPosition, setHandleLeftPosition] = useState('0px');
  
  // Exact tick mark positions from the SVG (viewBox width: 321px)
  // These are the center x positions of each tick mark
  const TICK_POSITIONS = [13, 49.875, 86.75, 123.625, 160.5, 197.375, 234.25, 271.125, 308];
  const SVG_WIDTH = 321;

  // Calculate handle left position relative to tracker using exact tick positions
  const updateHandlePosition = useCallback(() => {
    if (!trackerRef.current || !innerContainerRef.current || !handleRef.current) return;
    
    const trackerRect = trackerRef.current.getBoundingClientRect();
    const innerContainerRect = innerContainerRef.current.getBoundingClientRect();
    const trackerWidth = trackerRect.width;
    const trackerLeft = trackerRect.left - innerContainerRect.left;
    const innerContainerWidth = innerContainerRect.width;
    const handleWidth = 16; // Handle is 16px wide
    
    // Get the current weight index
    const currentWeightIndex = availableWeights.findIndex(w => w.suffix === fontWeight);
    if (currentWeightIndex < 0 || currentWeightIndex >= TICK_POSITIONS.length) return;
    
    // Get the exact tick position from SVG (as percentage of SVG width)
    const tickPositionInSVG = TICK_POSITIONS[currentWeightIndex] / SVG_WIDTH;
    
    // Convert to actual pixel position on the rendered tracker
    const handleCenterPosition = trackerLeft + (tickPositionInSVG * trackerWidth);
    
    // Handle is 16px wide, so subtract 8px to center it
    let left = handleCenterPosition - 8;
    
    // Ensure handle stays within inner container bounds
    const maxLeft = innerContainerWidth - handleWidth;
    left = Math.max(0, Math.min(left, maxLeft));
    
    setHandleLeftPosition(`${left}px`);
  }, [fontWeight, availableWeights]);
  
  useEffect(() => {
    updateHandlePosition();
    
    // Update on resize
    const resizeObserver = new ResizeObserver(updateHandlePosition);
    if (innerContainerRef.current) {
      resizeObserver.observe(innerContainerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [updateHandlePosition]);

  // Update handle position when fontWeight prop changes
  useEffect(() => {
    updateHandlePosition();
  }, [fontWeight, updateHandlePosition]);

  // Convert pixel position to weight index - relative to tracker
  const getWeightIndexFromPosition = useCallback((clientX: number): number => {
    if (!trackerRef.current) return 0;
    const rect = trackerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    // Snap to nearest weight index
    const index = Math.round((percentage / 100) * (availableWeights.length - 1));
    return Math.max(0, Math.min(availableWeights.length - 1, index));
  }, [availableWeights.length]);

  const handleWeightChange = useCallback((newSuffix: string) => {
    if (!fontName || !fontName.trim() || isDisabled) {
      return;
    }
    const newFontName = buildFontName(fontName, newSuffix);
    onChange(newFontName);
  }, [fontName, onChange, isDisabled]);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isDisabled) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [isDisabled]);

  // Handle mouse move with smooth animation
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !trackerRef.current) return;
      
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // Use requestAnimationFrame for smooth updates
      animationFrameRef.current = requestAnimationFrame(() => {
        const index = getWeightIndexFromPosition(e.clientX);
        
        // Update weight if changed
        const newWeight = availableWeights[index];
        if (newWeight && newWeight.suffix !== fontWeight) {
          handleWeightChange(newWeight.suffix);
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
  }, [isDragging, fontWeight, availableWeights, handleWeightChange, getWeightIndexFromPosition, getHandlePosition]);

  // Handle track click
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (isDisabled) return;
    // Don't handle click if clicking on the handle
    if ((e.target as HTMLElement).closest('.slider-handle')) {
      return;
    }
    const index = getWeightIndexFromPosition(e.clientX);
    const newWeight = availableWeights[index];
    if (newWeight) {
      handleWeightChange(newWeight.suffix);
    }
  }, [isDisabled, getWeightIndexFromPosition, availableWeights, handleWeightChange]);

  const sliderTrackImg = chrome.runtime.getURL('assets/88754b7aa6e213158064d6f64ddb13191b883271.svg');
  const handleImg = chrome.runtime.getURL('assets/cdbebb17f3c80ce9ed3e39f742a8b05f7af6467b.svg');

  return (
    <div className="font-weight-slider-container">
      {/* Weight Labels */}
      <div className="font-weight-labels">
        {availableWeights.map((weight) => {
          const isActive = weight.suffix === fontWeight;
          return (
            <span
              key={weight.suffix}
              className={`font-weight-label ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
            >
              {weight.label}
            </span>
          );
        })}
      </div>

      {/* Slider Track Container */}
      <div 
        ref={sliderRef}
        className={`font-weight-slider-track ${isDisabled ? 'disabled' : ''}`}
        onClick={handleTrackClick}
      >
        {/* Inner container with padding - handle sits here */}
        <div ref={innerContainerRef} className="slider-inner-container">
          {/* Tracker SVG - absolutely positioned in the middle */}
          <div ref={trackerRef} className="slider-tracker">
            <img 
              src={sliderTrackImg} 
              alt="Slider track" 
              className="slider-track-svg"
            />
          </div>
          {/* Handle - absolutely positioned to align with tracker */}
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

