import React from 'react';

interface DevLayoutProps {
  children: React.ReactNode;
}

/** Webpack dev UI (non-extension context): centered panel without Chrome popup chrome. */
export const DevLayout: React.FC<DevLayoutProps> = ({ children }) => (
  <div className="dev-layout-container dev-layout-single">
    <div className="dev-layout-sidebar">{children}</div>
  </div>
);
