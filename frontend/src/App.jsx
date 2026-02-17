import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import AccountSetup from './pages/AccountSetup';
import Dashboard from './pages/Dashboard';
import IncidentReport from './pages/IncidentReport';
import ViewIncidents from './pages/ViewIncidents';
import IncidentDetails from './pages/IncidentDetails';
import Notifications from './pages/Notifications';
import MapView from './pages/MapView';
import AdminCreateUser from './pages/AdminCreateUser';
import AdminVerifyResidents from './pages/AdminVerifyResidents';
import AdminManageSoundAlerts from './pages/AdminManageSoundAlerts';
import AdminManageAccounts from './pages/AdminManageAccounts';
import Landing from './pages/Landing';
import './styles/main.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route
            path="/account/setup"
            element={
              <ProtectedRoute>
                <AccountSetup />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/incidents/report"
            element={
              <ProtectedRoute>
                <IncidentReport />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/incidents"
            element={
              <ProtectedRoute>
                <ViewIncidents />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/incidents/:id"
            element={
              <ProtectedRoute>
                <IncidentDetails />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/map"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'municipal_admin', 'admin', 'mdrrmo']}>
                <MapView />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/create-user"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'municipal_admin', 'admin']}>
                <AdminCreateUser />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/verify-residents"
            element={
              <ProtectedRoute allowedRoles={['super_admin', 'municipal_admin', 'admin', 'mdrrmo']}>
                <AdminVerifyResidents />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/admin/sound-alerts"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminManageSoundAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/accounts"
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <AdminManageAccounts />
              </ProtectedRoute>
            }
          />
          
          <Route path="/" element={<Landing />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
