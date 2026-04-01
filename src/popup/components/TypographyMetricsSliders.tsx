import React from 'react';
import { TrackingSlider } from './TrackingSlider';
import { LeadingSlider } from './LeadingSlider';

export interface TypographyMetricsSlidersProps {
  tracking: number;
  leading: number;
  onTrackingChange: (value: number) => void;
  onLeadingChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Universal tracking + leading controls. Values apply to all elements on the page
 * (see content script universal metrics rules).
 */
export const TypographyMetricsSliders: React.FC<TypographyMetricsSlidersProps> = ({
  tracking,
  leading,
  onTrackingChange,
  onLeadingChange,
  disabled = false,
}) => (
  <>
    <div className="feature-row-wrapper">
      <TrackingSlider value={tracking} onChange={onTrackingChange} disabled={disabled} />
    </div>
    <div className="feature-gap"></div>
    <div className="feature-row-wrapper">
      <LeadingSlider value={leading} onChange={onLeadingChange} disabled={disabled} />
    </div>
  </>
);
