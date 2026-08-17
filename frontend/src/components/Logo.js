import React from 'react';

export default function Logo({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Base / Shadow */}
      <ellipse cx="50" cy="112" rx="16" ry="5" fill="#047857" opacity="0.8" />

      {/* Map Pin Base - Emerald Green */}
      <path 
        d="M50 5 C25.147 5 5 25.147 5 50 C5 75 50 105 50 105 C50 105 95 75 95 50 C95 25.147 74.853 5 50 5 Z" 
        fill="#10B981" 
      />
      
      {/* Inner Circle - Adapts to surface color */}
      <circle 
        cx="50" 
        cy="46" 
        r="24" 
        fill="var(--color-surface)" 
      />
      
      {/* Pulse / Heartbeat Line - Amber/Orange */}
      <path 
        d="M 32 46 H 40 L 44 32 L 53 66 L 58 46 H 68" 
        stroke="#F59E0B" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
}
