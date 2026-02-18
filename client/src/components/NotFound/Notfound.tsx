import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';
import './Notfound.css';

interface NotFoundProps {
  isAuthenticated?: boolean;
}

const NotFound: React.FC<NotFoundProps> = ({ isAuthenticated = false }) => {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="not-found-container">
      <div className="not-found-card">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-text">
          The page you are looking for does not exist.
        </p>
        <button className="btn-return-home"onClick={handleReturnHome}>
          <Home size={18} />
          {isAuthenticated ? 'Return to Dashboard' : 'Return to Home'}
        </button>
      </div>
    </div>
  );
};

export default NotFound;