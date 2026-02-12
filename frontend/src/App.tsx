import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ToastProvider } from './components/ui/toast';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ProtectedRoute, PublicRoute } from './components/auth/ProtectedRoute';
import { Shell } from './components/layout/Shell';
import Dashboard from './pages/Dashboard';
import Books from './pages/Books';
import Borrowings from './pages/Borrowings';
import Reservations from './pages/Reservations';
import Statistics from './pages/Statistics';
import Users from './pages/Users';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css'; 
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
              
              <Route path="/*" element={
                <ProtectedRoute>
                  <Shell>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/books" element={<Books />} />
                      <Route path="/borrowings" element={<Borrowings />} />
                      <Route path="/reservations" element={<Reservations />} />
                      <Route path="/statistics" element={<ProtectedRoute requiredRole="ADMIN"><Statistics /></ProtectedRoute>} />
                      <Route path="/users" element={<ProtectedRoute requiredRole="ADMIN"><Users /></ProtectedRoute>} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Shell>
                </ProtectedRoute>
              } />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
