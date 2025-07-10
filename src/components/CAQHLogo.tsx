import React from 'react';
import caqhLogo from '../assets/CAQH-logo.svg';

export const CAQHLogo = ({ className = "h-auto w-auto" }: { className?: string }) => {
  return (
    <img 
      src={caqhLogo} 
      alt="CAQH Logo" 
      className={className}
    />
  );
};