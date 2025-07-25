import React from 'react';

interface HamburgerProps {
  onClick: () => void;
}

const Hamburger: React.FC<HamburgerProps> = ({ onClick }) => (
  <button className="hamburger-btn" onClick={onClick} aria-label="Abrir menú" title="Abrir menú">
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  </button>
);

export default Hamburger;