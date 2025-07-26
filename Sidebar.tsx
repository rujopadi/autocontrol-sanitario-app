import React from 'react';

// Using inline SVGs for icons to avoid external dependencies
const ICONS = {
  dashboard: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>,
  truck: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a3.375 3.375 0 013.375-3.375h9.75a3.375 3.375 0 013.375 3.375v1.875M10.5 6h9M10.5 6a2.25 2.25 0 00-2.25 2.25v4.5a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-4.5a2.25 2.25 0 00-2.25-2.25H10.5z" /></svg>,
  fridge: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 3.75v16.5M7.5 3.75v16.5M4.5 5.25h3V3.75h-3v1.5zM4.5 12h3V10.5h-3V12zm4.5 8.25h3V20.25h-3v1.5zm0-16.5h3V3.75h-3v1.5zM12 20.25h3V18.75h-3v1.5zm0-16.5h3V3.75h-3v1.5zm4.5 16.5h3v-1.5h-3v1.5zm0-16.5h3v-1.5h-3v1.5zM10.5 12h3V10.5h-3V12z" /></svg>,
  chef: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12.75 3.03v.568c0 .334.148.65.405.864l1.068.89c.442.369.535 1.01.216 1.49l-.51.766a2.25 2.25 0 01-1.161.886l-.143.048a1.107 1.107 0 00-.57 1.664l.143.258a1.107 1.107 0 001.664.57l.143-.048a2.25 2.25 0 011.161.886l.51.766c.319.48.226 1.121-.216 1.49l-1.068.89a1.125 1.125 0 00-.405.864v.568m-6 0v-.568c0-.334-.148-.65-.405-.864l-1.068-.89c-.442-.369-.535-1.01-.216-1.49l.51-.766a2.25 2.25 0 011.161-.886l.143-.048a1.107 1.107 0 00.57-1.664l-.143-.258a1.107 1.107 0 00-1.664-.57l-.143.048a2.25 2.25 0 01-1.161-.886l-.51-.766c-.319.48-.226 1.121.216-1.49l1.068-.89a1.125 1.125 0 00.405.864v.568m0 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25m-7.5 0a2.25 2.25 0 002.25 2.25h1.5a2.25 2.25 0 002.25-2.25m0 0a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25m9 4.5l.393.829a.75.75 0 01-1.12 1.026l-1.07-1.071a1.125 1.125 0 00-1.591 0l-1.07 1.07a.75.75 0 01-1.027 1.12l-.392-.829m12.342-4.12a.75.75 0 01-1.027-1.12l1.07-1.071a1.125 1.125 0 000-1.591l-1.07-1.071a.75.75 0 011.12-1.026l.829.393m-4.12 12.342a.75.75 0 01-1.12 1.026l-1.071-1.07a1.125 1.125 0 00-1.591 0l-1.071 1.07a.75.75 0 01-1.026-1.12l.393-.829" /></svg>,
  clean: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v5.25m-4.5-5.25v5.25m-4.5-5.25v5.25m13.5-5.25v5.25M9 21.75h6c.621 0 1.125-.504 1.125-1.125V9.75M9 21.75H3c-.621 0-1.125-.504-1.125-1.125V9.75M9 21.75v-13.5a1.125 1.125 0 011.125-1.125h3.75a1.125 1.125 0 011.125 1.125v13.5m-6-13.5V6.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v1.875m-6-1.875h3.75" /></svg>,
  trace: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  config: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.995s.145.755.438.995l1.003.827c.48.398.668 1.03.26 1.431l-1.296 2.247a1.125 1.125 0 01-1.37.49l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.333.183-.582.495-.645.87l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.995s-.145-.755-.437-.995l-1.004-.827a1.125 1.125 0 01-.26-1.431l1.296-2.247a1.125 1.125 0 011.37-.49l1.217.456c.355.133.75.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.87l.213-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  calculator: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm0 3h.008v.008H8.25v-.008zm3-6h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm0 3h.008v.008H11.25v-.008zm3-6h.008v.008H14.25v-.008zm0 3h.008v.008H14.25v-.008zm0 3h.008v.008H14.25v-.008zM4.5 3.75v16.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V3.75m-15 0h15M5.25 6h13.5" /></svg>,
  users: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 00-10.256 0M15 19.128a9.38 9.38 0 01-10.256 0M15 19.128v-1.018c0-1.76-1.433-3.197-3.197-3.197S8.606 16.35 8.606 18.11v1.018M7.5 10.5a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0zM12.75 10.5a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z" /></svg>,
  incident: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>,
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