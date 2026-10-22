import React from 'react';

/**
 * B.I.R.D brand mark — two intersecting rings: founders and capital,
 * meeting at a single point. Jade + antique gold on the ink canvas.
 */
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 40, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className} aria-hidden="true">
    <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="11" fill="#0B0E0D" stroke="#22352D" strokeWidth="1.5" />
    <circle cx="16" cy="20" r="7.25" stroke="#22A170" strokeWidth="2" />
    <circle cx="24" cy="20" r="7.25" stroke="#D0A54F" strokeWidth="2" />
    <circle cx="20" cy="20" r="2.4" fill="#EDECE7" />
  </svg>
);

export default LogoMark;