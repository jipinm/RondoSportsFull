import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Users from './pages/Users';
import AdminUsers from './pages/AdminUsers';
import CustomerManagement from './pages/CustomerManagement';
import Refunds from './pages/Refunds';
import CancellationRequests from './pages/CancellationRequests';
import Content from './pages/Content';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import RoleManagement from './pages/RoleManagement';
import RolesManagement from './pages/RolesManagement';
import TeamCredentials from './pages/TeamCredentials';
import TicketMarkupManagement from './pages/TicketMarkupManagement';
import HospitalityManagement from './pages/HospitalityManagement';
import './App.css';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route element={<ProtectedRoute />}>
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/users" element={<Users />} />
                <Route path="/admin-users" element={<AdminUsers />} />
                <Route path="/customer-management" element={<CustomerManagement />} />
                <Route path="/team-credentials" element={<TeamCredentials />} />
                <Route path="/ticket-markup" element={<TicketMarkupManagement />} />
                <Route path="/hospitality" element={<HospitalityManagement />} />
                <Route path="/refunds" element={<Refunds />} />
                <Route path="/cancellation-requests" element={<CancellationRequests />} />
                <Route path="/content" element={<Content />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/roles" element={<RoleManagement />} />
                <Route path="/roles-management" element={<RolesManagement />} />
              </Route>
            </Route>
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  )
}

export default App
