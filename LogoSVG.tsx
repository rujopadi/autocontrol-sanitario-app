import React from 'react';

const LogoSVG: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      className={className}
      viewBox="0 0 200 200" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Clipboard background */}
      <rect x="40" y="30" width="120" height="140" rx="8" fill="#E85A5A" stroke="#D44545" strokeWidth="3"/>
      <rect x="50" y="45" width="100" height="110" rx="4" fill="white"/>
      
      {/* Clipboard clip */}
      <rect x="80" y="20" width="40" height="20" rx="10" fill="#E85A5A"/>
      
      {/* Document lines */}
      <line x1="65" y1="65" x2="135" y2="65" stroke="#4A5568" strokeWidth="3" strokeLinecap="round"/>
      <line x1="65" y1="80" x2="135" y2="80" stroke="#4A5568" strokeWidth="3" strokeLinecap="round"/>
      
      {/* Meat/Food icon */}
      <ellipse cx="85" cy="110" rx="15" ry="20" fill="#E85A5A" stroke="white" strokeWidth="2"/>
      <circle cx="90" cy="105" r="3" fill="white"/>
      
      {/* Magnifying glass */}
      <circle cx="130" cy="110" r="20" fill="none" stroke="#4A5568" strokeWidth="4"/>
      <line x1="145" y1="125" x2="155" y2="135" stroke="#4A5568" strokeWidth="4" strokeLinecap="round"/>
      
      {/* Checkmark inside magnifying glass */}
      <path d="M 120 110 L 127 117 L 140 104" fill="none" stroke="#4A5568" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export default LogoSVG;