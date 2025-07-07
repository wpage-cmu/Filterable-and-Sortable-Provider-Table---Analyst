import React from 'react';

export const CAQHLogo = ({ className = "w-8 h-8" }: { className?: string }) => {
  return (
    <div className={`${className} bg-white rounded-lg p-2 flex items-center justify-center shadow-sm`}>
      <svg
        viewBox="0 0 100 40" 
        className="w-full h-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background */}
        <rect width="100" height="40" rx="4" fill="#1e40af"/>
        
        {/* CAQH text */}
        <text
          x="50"
          y="25"
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="white"
          fontFamily="Arial, sans-serif"
        >
          CAQH
        </text>
        
        {/* Decorative elements */}
        <circle cx="15" cy="12" r="3" fill="#60a5fa" opacity="0.8"/>
        <circle cx="85" cy="28" r="2" fill="#60a5fa" opacity="0.6"/>
        <rect x="75" y="8" width="3" height="8" rx="1.5" fill="#60a5fa" opacity="0.7"/>
      </svg>
    </div>
  );
};