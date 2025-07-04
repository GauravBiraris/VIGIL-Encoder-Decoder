import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Settings, Eye, Unlock, LogOut, Database } from 'lucide-react';

interface NavigationProps {
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ onLogout }) => {
  const location = useLocation();

  const navItems = [
    { path: '/configuration', label: 'Configuration', icon: Settings },
    { path: '/view', label: 'View Data', icon: Eye },
    { path: '/decoding', label: 'Decoding', icon: Unlock },
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <Database size={24} />
          <span>Data Encoder</span>
        </div>
        
        <div className="nav-links">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => 
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>

        <button className="logout-btn" onClick={onLogout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;