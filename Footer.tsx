import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <p className="footer-text">
        © {new Date().getFullYear()} Creado por <strong>Sibarilia, S.L.</strong>
      </p>
    </footer>
  );
};

export default Footer;