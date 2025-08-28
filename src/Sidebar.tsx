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
  organization: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m2.25-18v18m13.5-18v18m2.25-18v18M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3" /></svg>,
  orgSettings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  userManagement: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>,
};

const navItems = [
  { name: 'Panel Principal', icon: ICONS.dashboard, href: '#', adminOnly: false },
  { name: 'Recepción y Transporte', icon: ICONS.truck, href: '#', adminOnly: false },
  { name: 'Almacenamiento', icon: ICONS.fridge, href: '#', adminOnly: false },
  { name: 'Fichas Técnicas', icon: ICONS.chef, href: '#', adminOnly: false },
  { name: 'Limpieza e Higiene', icon: ICONS.clean, href: '#', adminOnly: false },
  { name: 'Trazabilidad', icon: ICONS.trace, href: '#', adminOnly: false },
  { name: 'Escandallos', icon: ICONS.calculator, href: '#', adminOnly: false },
  { name: 'Usuarios', icon: ICONS.users, href: '#', adminOnly: true },
  { name: 'Configuración', icon: ICONS.config, href: '#', adminOnly: true },
  // Separador visual para sección de organización
  { name: 'separator', icon: null, href: '#', adminOnly: true },
  { name: 'Dashboard Organización', icon: ICONS.organization, href: '#', adminOnly: true },
  { name: 'Configuración Organización', icon: ICONS.orgSettings, href: '#', adminOnly: true },
  { name: 'Gestión de Usuarios', icon: ICONS.userManagement, href: '#', adminOnly: true },
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
            .map((item) => {
              if (item.name === 'separator') {
                return (
                  <li key="org-separator" className="nav-separator">
                    <hr />
                    <span className="separator-label">Organización</span>
                  </li>
                );
              }
              
              return (
                <li key={item.name} className={`nav-item ${activePage === item.name ? 'active' : ''}`}>
                  <a href={item.href} onClick={(e) => handleNavClick(e, item.name)}>
                    <span className="nav-icon">{item.icon}</span>
                    {item.name}
                  </a>
                </li>
              );
            })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;