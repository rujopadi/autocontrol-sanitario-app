import React from 'react';

// Enhanced SVG icons specifically designed for food safety control modules
const ICONS = {
  // Dashboard - Modern grid with analytics elements
  dashboard: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h6v6H3V4zM15 4h6v6h-6V4zM3 14h6v6H3v-6zM15 14h6v6h-6v-6z"/>
      <circle cx="6" cy="7" r="1" fill="currentColor"/>
      <circle cx="18" cy="7" r="1" fill="currentColor"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 17l2-2 2 2M17 17l2-2 2 2"/>
    </svg>
  ),
  
  // Reception & Transport - Delivery truck with food safety elements
  truck: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 17h2l.5-2h13l.5 2h2v-2c0-1.1-.9-2-2-2h-1V7c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2z"/>
      <circle cx="7.5" cy="17.5" r="1.5"/>
      <circle cx="16.5" cy="17.5" r="1.5"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 9h4M8 11h3"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 8l1 1-1 1"/>
    </svg>
  ),
  
  // Storage - Refrigerator with temperature control
  fridge: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 10h14"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6v2M8 14v2"/>
      <circle cx="16" cy="7" r="1" fill="currentColor"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 16h4M14 18h3"/>
    </svg>
  ),
  
  // Technical Sheets - Document with food/recipe elements
  chef: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6M9 16h6M9 8h6"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2h12a2 2 0 012 2v16a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z"/>
      <circle cx="7" cy="8" r="0.5" fill="currentColor"/>
      <circle cx="7" cy="12" r="0.5" fill="currentColor"/>
      <circle cx="7" cy="16" r="0.5" fill="currentColor"/>
    </svg>
  ),
  
  // Cleaning & Hygiene - Spray bottle with sparkles
  clean: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 3h3v4l-1 1v11a1 1 0 01-1 1H9a1 1 0 01-1-1V8l-1-1V3z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 7h2l1-1V3h-3"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 8l2-2M19 8l-2-2M17 6l2 2M17 10l2-2"/>
      <circle cx="4" cy="12" r="0.5" fill="currentColor"/>
      <circle cx="20" cy="16" r="0.5" fill="currentColor"/>
      <circle cx="3" cy="18" r="0.5" fill="currentColor"/>
    </svg>
  ),
  
  // Traceability - Connected chain with checkmarks
  trace: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12l2 2 4-4"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2 12h4M18 12h4"/>
      <circle cx="6" cy="12" r="2"/>
      <circle cx="18" cy="12" r="2"/>
    </svg>
  ),
  
  // Calculations - Calculator with percentage symbol
  calculator: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <rect x="4" y="2" width="16" height="20" rx="2"/>
      <rect x="6" y="6" width="12" height="3" rx="1" fill="currentColor" fillOpacity="0.1"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h2M12 12h2M16 12h2"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 15h2M12 15h2M16 15h4v4h-4v-4z"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 18h2M12 18h2"/>
      <circle cx="9" cy="7" r="0.5" fill="currentColor"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 6.5l1 1M13 6.5l-1 1"/>
    </svg>
  ),
  
  // Users - People with security shield
  users: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 1l2 2-2 2-2-2 2-2z"/>
    </svg>
  ),
  
  // Incidents - Alert triangle with exclamation
  incident: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      <circle cx="12" cy="16" r="1" fill="currentColor"/>
    </svg>
  ),
  
  // Configuration - Gear with settings elements
  config: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <circle cx="12" cy="12" r="3"/>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
};

const navItems = [
  { name: 'Panel Principal', icon: ICONS.dashboard, href: '#', adminOnly: false },
  { name: 'Recepción y Transporte', icon: ICONS.truck, href: '#', adminOnly: false },
  { name: 'Almacenamiento', icon: ICONS.fridge, href: '#', adminOnly: false },
  { name: 'Fichas Técnicas', icon: ICONS.chef, href: '#', adminOnly: false },
  { name: 'Limpieza e Higiene', icon: ICONS.clean, href: '#', adminOnly: false },
  { name: 'Trazabilidad', icon: ICONS.trace, href: '#', adminOnly: false },
  { name: 'Escandallos', icon: ICONS.calculator, href: '#', adminOnly: false },
  { name: 'Incidencias', icon: ICONS.incident, href: '#', adminOnly: false },
  { name: 'Usuarios', icon: ICONS.users, href: '#', adminOnly: true },
  { name: 'Configuración', icon: ICONS.config, href: '#', adminOnly: true },
];

interface SidebarProps {
  isCurrentUserAdmin: boolean;
  activePage: string;
  onNavChange: (page: string) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isCurrentUserAdmin, activePage, onNavChange, isOpen }) => {
  const handleNavClick = (e: React.MouseEvent, page: string) => {
    e.preventDefault();
    onNavChange(page);
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <h2>Autocontrol Pro</h2>
      </div>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navItems
            .filter(item => !item.adminOnly || isCurrentUserAdmin)
            .map((item) => (
             <li key={item.name} className={`nav-item ${activePage === item.name ? 'active' : ''}`}>
              <a href={item.href} onClick={(e) => handleNavClick(e, item.name)}>
                <span className="nav-icon">{item.icon}</span>
                {item.name}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;