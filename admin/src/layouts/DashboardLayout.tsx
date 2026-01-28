import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Ticket, 
  Users, 
  RefreshCcw, 
  FileText, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  XCircle,
  Shield,
  UserCheck,
  Trophy,
  DollarSign,
  Coffee
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import styles from './DashboardLayout.module.css';

const DashboardLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className={styles.dashboardContainer}>
      <aside className={`${styles.sidebar} ${sidebarOpen ? '' : styles.collapsed}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.logoText}>
            {sidebarOpen ? 'Rondo Admin' : 'RA'}
          </h2>
          <button className={styles.toggleButton} onClick={toggleSidebar} title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}>
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <div className={styles.sidebarContent}>
          <nav className={styles.sidebarNav}>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
              <LayoutDashboard size={20} />
              {sidebarOpen && <span>Dashboard</span>}
            </NavLink>

            {user && (
              <NavLink to="/bookings" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <Ticket size={20} />
                {sidebarOpen && <span>Event Bookings</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/admin-users" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <Users size={20} />
                {sidebarOpen && <span>Admin Users</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/customer-management" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <UserCheck size={20} />
                {sidebarOpen && <span>Customer Management</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/team-credentials" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <Trophy size={20} />
                {sidebarOpen && <span>Team Credentials</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/ticket-markup" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <DollarSign size={20} />
                {sidebarOpen && <span>Ticket Markup Pricing</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/hospitality" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <Coffee size={20} />
                {sidebarOpen && <span>Hospitality Services</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/roles-management" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <Shield size={20} />
                {sidebarOpen && <span>Roles & Permissions</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/refunds" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <RefreshCcw size={20} />
                {sidebarOpen && <span>Refunds</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/cancellation-requests" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <XCircle size={20} />
                {sidebarOpen && <span>Cancellation Requests</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/content" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <FileText size={20} />
                {sidebarOpen && <span>Content Management</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/reports" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <BarChart3 size={20} />
                {sidebarOpen && <span>Reports</span>}
              </NavLink>
            )}

            {user && (
              <NavLink to="/settings" className={({ isActive }) => isActive ? styles.activeLink : styles.navLink}>
                <Settings size={20} />
                {sidebarOpen && <span>Settings</span>}
              </NavLink>
            )}
          </nav>
        </div>

        <div className={styles.sidebarFooter}>
          <button className={styles.logoutButton} onClick={handleLogout}>
            <LogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>      <main className={styles.mainContent}>
        <header className={styles.header}>          <div className={styles.headerLeft}>
            <button className={styles.mobileSidebarToggle} onClick={toggleSidebar}>
              <Menu size={24} />
            </button>
          </div><div className={styles.headerRight}>
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userRole}>{user?.role?.replace('_', ' ')}</span>
            </div>
            <button 
              className={styles.logoutButtonHeader} 
              onClick={handleLogout}
              title="Logout"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <div className={`${styles.content} ${location.pathname === '/team-credentials' ? styles.fullWidth : ''}`}>
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
