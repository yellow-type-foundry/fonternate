import React, { useState, useRef, useEffect, useCallback } from 'react';
import { buildFontName, getAvailableWeightSuffixes } from '../../utils/fontUtils';

interface FontWeightSelectorProps {
  fontName: string;              // Base font family name (without weight)
  fontWeight: string;             // Current weight suffix (e.g., "regular", "bold")
  onChange: (newFontName: string) => void;  // Called with full font name (baseName-weight)
  disabled?: boolean;
  availableWeightSuffixes?: Set<string>;  // Set of available weight suffixes (e.g., Set(['regular', 'bold']))
}

export const FontWeightSelector: React.FC<FontWeightSelectorProps> = ({
  fontName,
  fontWeight,
  onChange,
  disabled = false,
  availableWeightSuffixes,
}) => {
  const allWeights = getAvailableWeightSuffixes();
  const sliderRef = useRef<HTMLDivElement>(null);
  const innerContainerRef = useRef<HTMLDivElement>(null);
  const trackerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  
  // Always show the selector, even when no font name is provided
  // When disabled (no font name), still show it but with disabled state
  const isDisabled = disabled || !fontName || !fontName.trim();

  // Filter to only available weights for slider logic
  // If availableWeightSuffixes is not provided, assume all weights are available
  const availableWeights = availableWeightSuffixes
    ? allWeights.filter(w => availableWeightSuffixes.has(w.suffix))
    : allWeights;

  // Debug log
  useEffect(() => {
    if (availableWeightSuffixes) {
      console.log('[FontWeightSelector] Available weights:', Array.from(availableWeightSuffixes));
      console.log('[FontWeightSelector] Filtered availableWeights:', availableWeights.map(w => w.suffix));
    } else {
      console.log('[FontWeightSelector] No weight restrictions - all weights available');
    }
  }, [availableWeightSuffixes, availableWeights]);

  // Helper to check if a weight is available
  const isWeightAvailable = useCallback((suffix: string): boolean => {
    if (!availableWeightSuffixes) return true; // All weights available if not specified
    const isAvailable = availableWeightSuffixes.has(suffix);
    if (!isAvailable) {
      console.log(`[FontWeightSelector] Weight ${suffix} is NOT available`);
    }
    return isAvailable;
  }, [availableWeightSuffixes]);

  // Find nearest available weight index from a given index in allWeights
  // Returns the index in availableWeights array
  const findNearestAvailableWeight = useCallback((targetIndex: number): number => {
    // If no filtering, return the target index (which is already in allWeights, same as availableWeights)
    if (!availableWeightSuffixes || availableWeights.length === 0) {
      return Math.max(0, Math.min(targetIndex, allWeights.length - 1));
    }

    // Clamp target index to valid range
    const clampedTargetIndex = Math.max(0, Math.min(targetIndex, allWeights.length - 1));

    // If target weight is available, use it
    const targetWeight = allWeights[clampedTargetIndex];
    if (isWeightAvailable(targetWeight.suffix)) {
      const availableIndex = availableWeights.findIndex(w => w.suffix === targetWeight.suffix);
      if (availableIndex >= 0) return availableIndex;
    }

    // Find nearest available weight by checking both directions
    let nearestIndex = 0;
    let minDistance = Infinity;

    // Check all weights to find the nearest available one
    for (let i = 0; i < allWeights.length; i++) {
      if (isWeightAvailable(allWeights[i].suffix)) {
        const distance = Math.abs(i - clampedTargetIndex);
        if (distance < minDistance) {
          minDistance = distance;
          const foundIndex = availableWeights.findIndex(w => w.suffix === allWeights[i].suffix);
          if (foundIndex >= 0) {
            nearestIndex = foundIndex;
          }
        }
      }
    }

    return Math.max(0, Math.min(nearestIndex, availableWeights.length - 1));
  }, [availableWeightSuffixes, availableWeights, allWeights, isWeightAvailable]);

  // Find current weight index in available weights
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
    
    // Get the current weight index in all weights array
    let allWeightsIndex = allWeights.findIndex(w => w.suffix === fontWeight);
    
    // If current weight is unavailable, find the nearest available one
    if (allWeightsIndex < 0 || !isWeightAvailable(fontWeight)) {
      // Find nearest available weight
      if (availableWeights.length > 0) {
        // Use the first available weight as fallback, or find nearest
        const firstAvailable = availableWeights[0];
        allWeightsIndex = allWeights.findIndex(w => w.suffix === firstAvailable.suffix);
      } else {
        allWeightsIndex = 0; // Fallback to first weight if no available weights
      }
    }
    
    if (allWeightsIndex < 0 || allWeightsIndex >= TICK_POSITIONS.length) return;
    
    // Get the exact tick position from SVG (as percentage of SVG width)
    const tickPositionInSVG = TICK_POSITIONS[allWeightsIndex] / SVG_WIDTH;
    
    // Convert to actual pixel position on the rendered tracker
    const handleCenterPosition = trackerLeft + (tickPositionInSVG * trackerWidth);
    
    // Handle is 16px wide, so subtract 8px to center it
    let left = handleCenterPosition - 8;
    
    // Ensure handle stays within inner container bounds
    const maxLeft = innerContainerWidth - handleWidth;
    left = Math.max(0, Math.min(left, maxLeft));
    
    setHandleLeftPosition(`${left}px`);
  }, [fontWeight, allWeights, availableWeights, isWeightAvailable]);
  
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
  // Returns index in availableWeights array (not allWeights)
  const getWeightIndexFromPosition = useCallback((clientX: number): number => {
    if (!trackerRef.current) {
      // Return first available weight index
      return availableWeights.length > 0 ? 0 : 0;
    }
    const rect = trackerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    // Snap to nearest weight index in all weights (for visual positioning)
    const allWeightsIndex = Math.round((percentage / 100) * (allWeights.length - 1));
    const clampedIndex = Math.max(0, Math.min(allWeightsIndex, allWeights.length - 1));
    
    // Find nearest available weight and return its index in availableWeights array
    return findNearestAvailableWeight(clampedIndex);
  }, [allWeights.length, availableWeights.length, findNearestAvailableWeight]);

  const handleWeightChange = useCallback((newSuffix: string) => {
    if (!fontName || !fontName.trim() || isDisabled) {
      return;
    }
    // Only allow changing to available weights
    if (!isWeightAvailable(newSuffix)) {
      return;
    }
    const newFontName = buildFontName(fontName, newSuffix);
    onChange(newFontName);
  }, [fontName, onChange, isDisabled, isWeightAvailable]);

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
        const availableIndex = getWeightIndexFromPosition(e.clientX);
        
        // Ensure index is valid and get the weight
        if (availableIndex >= 0 && availableIndex < availableWeights.length) {
          const newWeight = availableWeights[availableIndex];
          if (newWeight && newWeight.suffix !== fontWeight) {
            handleWeightChange(newWeight.suffix);
          }
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
  }, [isDragging, fontWeight, availableWeights, handleWeightChange, getWeightIndexFromPosition, isWeightAvailable]);

  // Handle track click
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (isDisabled) return;
    // Don't handle click if clicking on the handle
    if ((e.target as HTMLElement).closest('.slider-handle')) {
      return;
    }
    const availableIndex = getWeightIndexFromPosition(e.clientX);
    // Ensure index is valid
    if (availableIndex >= 0 && availableIndex < availableWeights.length) {
      const newWeight = availableWeights[availableIndex];
      if (newWeight) {
        handleWeightChange(newWeight.suffix);
      }
    }
  }, [isDisabled, getWeightIndexFromPosition, availableWeights, handleWeightChange]);

  const handleImg = chrome.runtime.getURL('assets/cdbebb17f3c80ce9ed3e39f742a8b05f7af6467b.svg');

  return (
    <div className="font-weight-slider-container">
      {/* Weight Labels */}
      <div className="font-weight-labels">
        {allWeights.map((weight) => {
          const isActive = weight.suffix === fontWeight;
          const isAvailable = isWeightAvailable(weight.suffix);
          return (
            <span
              key={weight.suffix}
              className={`font-weight-label ${isActive ? 'active' : ''} ${isDisabled || !isAvailable ? 'disabled' : ''}`}
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
          {/* Tracker - CSS-based track with tick marks */}
          <div ref={trackerRef} className="slider-tracker">
            {/* Custom tick strokes */}
            <div className="slider-ticks">
              {allWeights.map((weight, index) => {
                const tickPositionInSVG = TICK_POSITIONS[index] / SVG_WIDTH;
                const leftPercent = tickPositionInSVG * 100;
                const available = isWeightAvailable(weight.suffix);
                // Alternating pattern: even index (0,2,4,6,8) = long, odd index (1,3,5,7) = short
                const isLong = index % 2 === 0;
                return (
                  <div
                    key={`tick-${weight.suffix}`}
                    className={`slider-tick-line ${available ? '' : 'disabled'} ${isLong ? 'long' : 'short'}`}
                    style={{
                      left: `${leftPercent}%`,
                    }}
                  />
                );
              })}
            </div>
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

