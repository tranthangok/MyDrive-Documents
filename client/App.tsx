import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Navbar from './src/components/Navbar/Navbar';
import Home from './src/components/Home/Home';
import Login from './src/components/Login/Login';
import SignUp from './src/components/Signup/Signup';
import NotFound from './src/components/NotFound/Notfound';
import Dashboard from './src/components/Dashboard/Dashboard';
import DocumentEditor from './src/components/Dashboard/Documenteditor';
import SharedDocument from './src/components/Dashboard/share/Shareddocument';
import AcceptInvitation from './src/components/Dashboard/share/Invitation';
import Profile from './src/components/Navbar/Profile';
import ResetPassword from './src/components/Login/Resetpassword';
import Trash from './src/components/Dashboard/Trash';
import './App.css';
// Define types
interface User {
  name: string;
  email: string;
}
// Allow only unauthenticated users to access the route
const GuestRoute = ({ children, isAuthenticated, isLoading }: { children: React.ReactNode; isAuthenticated: boolean; isLoading: boolean }) => {
  if (isLoading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
};

// Allow only authenticated users to access the route
const ProtectedRoute = ({ children, isAuthenticated, isLoading }: { children: React.ReactNode; isAuthenticated: boolean; isLoading: boolean }) => {
  if (isLoading) {
    return <div className="loading-spinner">Loading...</div>;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};
function AppContent() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserInfo(token);
    } else {
      setIsAuthenticated(false);
      setUser(null);
      setIsLoading(false);
    }
  }, []);
  const fetchUserInfo = async (token: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/auth/user', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('token');
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  const handleLogin = () => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoading(true);
      fetchUserInfo(token);
    }
  };
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    navigate('/');
  };
  const handleProfileClick = () => {
    navigate('/profile');
  };
  const handleBrandClick = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="App">
      <Navbar 
        brandName="MyDrive Documents"
        onLoginClick={() => navigate('/login')}
        onSignUpClick={() => navigate('/signup')}
        onBrandClick={handleBrandClick}
        onLogout={handleLogout}
        onProfileClick={handleProfileClick}
        isAuthenticated={isAuthenticated}
        user={user}
      />
      <Routes>
        {/* Guest Routes - only for unauthenticated users */}
        <Route 
          path="/" 
          element={
            <GuestRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Home />
            </GuestRoute>
          } 
        />  
        <Route 
          path="/login" 
          element={
            <GuestRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Login onLoginSuccess={handleLogin} />
            </GuestRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <GuestRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <SignUp />
            </GuestRoute>
          } 
        />
        {/* Public Routes - no need authenticat */}
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/shared/:id" element={<SharedDocument />} />
        <Route path="/invitation/:token" element={<AcceptInvitation />} />
        {/* Protected Routes - only for authenticated users */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/document/:id" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <DocumentEditor />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/trash" 
          element={
            <ProtectedRoute isAuthenticated={isAuthenticated} isLoading={isLoading}>
              <Trash />
            </ProtectedRoute>
          } 
        />
        {/* 404 Route */}
        <Route path="*" element={<NotFound isAuthenticated={isAuthenticated} />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;