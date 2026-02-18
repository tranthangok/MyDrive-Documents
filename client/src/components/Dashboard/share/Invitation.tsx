import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, User, Eye, Edit3, AlertCircle, ArrowRight, Loader } from 'lucide-react';
import './Invitation.css';

const AcceptInvitation: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<any>(null);
  const [requiresSignup, setRequiresSignup] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  // Form signup if not exists
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', confirmPassword: ''});
  const [signupError, setSignupError] = useState('');
  // Load dark mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setDarkMode(true);
      document.body.classList.add('dark-mode');
    } else {
      setDarkMode(false);
      document.body.classList.remove('dark-mode');
    }
  }, []);

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    const response = await fetch(`http://localhost:5000/api/documents/invitation/${token}`);
    
    if (!response.ok) {
      throw new Error('Invitation not found or expired');
    }
    
    const data = await response.json();
    setInvitation(data.invitation);
    setSignupData(prev => ({ ...prev, email: data.invitation.email }));
    setLoading(false);
  };

  const handleAcceptInvitation = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`http://localhost:5000/api/documents/invitation/${token}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }
      if (data.requiresSignup) {
        // User need signup
        setRequiresSignup(true);
        setProcessing(false);
      } else {
        // User has account, directly login and navigate to document
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate(`/document/${data.documentId}`);
      }
    } catch (err: any) {
      setError(err.message);
      setProcessing(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');
    // Validate
    if (!signupData.name.trim()) {
      setSignupError('Name is required');
      return;
    }
    if (signupData.password.length < 6) {
      setSignupError('Password must be at least 6 characters');
      return;
    }
    if (signupData.password !== signupData.confirmPassword) {
      setSignupError('Passwords do not match');
      return;
    }
    setProcessing(true);
    try {
      // signup
      const signupResponse = await fetch('http://localhost:5000/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          password: signupData.password
        })
      });
      const signupData_res = await signupResponse.json();
      if (!signupResponse.ok) {
        throw new Error(signupData_res.error || 'Failed to create account');
      }
      
      // Signup successful, claim invitation
      const claimResponse = await fetch(`http://localhost:5000/api/documents/invitation/${token}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const claimData = await claimResponse.json();
      
      if (!claimResponse.ok) {
        throw new Error(claimData.error || 'Failed to accept invitation');
      }
      // Đăng nhập và chuyển đến document
      localStorage.setItem('token', claimData.token);
      localStorage.setItem('user', JSON.stringify(claimData.user));
      navigate(`/document/${claimData.documentId}`);
    } catch (err: any) {
      setSignupError(err.message);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={`invitation-container ${darkMode ? 'dark' : ''}`}>
        <div className="loading-spinner">Loading invitation...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`invitation-container ${darkMode ? 'dark' : ''}`}>
        <div className="invitation-card error-card">
          <AlertCircle size={64} className="error-icon" />
          <h2>Invalid Invitation</h2>
          <p>{error}</p>
          <button className="back-home-btn" onClick={() => navigate('/')}>Go to Home</button>
        </div>
      </div>
    );
  }

  if (requiresSignup) {
    return (
      <div className={`invitation-container ${darkMode ? 'dark' : ''}`}>
        <div className="invitation-card signup-card">
          <div className="invitation-header">
            <Mail size={32} className="invitation-icon" />
            <h2>You're Invited!</h2>
            <p className="invitation-message">
              <strong>{invitation?.email}</strong> has been invited to collaborate on 
              <strong> "{invitation?.documentTitle}"</strong>
            </p>
          </div>

          <div className="permission-badge">
            {invitation?.permission === 'edit' ? (
              <>
                <Edit3 size={16} />
                <span>You will have edit access</span>
              </>
            ) : (
              <>
                <Eye size={16} />
                <span>You will have view access</span>
              </>
            )}
          </div>

          <p className="signup-prompt">Create an account to accept this invitation</p>

          <form onSubmit={handleSignup} className="signup-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input type="text" id="name" placeholder="John Doe" value={signupData.name} onChange={(e) => setSignupData({ ...signupData, name: e.target.value })} disabled={processing}/>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input type="email" id="email" value={signupData.email} disabled className="email-disabled"/>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input type="password" id="password" placeholder="Create a password" value={signupData.password} onChange={(e) => setSignupData({ ...signupData, password: e.target.value })} disabled={processing}/>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input type="password" id="confirmPassword" placeholder="Confirm your password" value={signupData.confirmPassword} onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })} disabled={processing}/>
              </div>
            </div>

            {signupError && (
              <div className="error-message">{signupError}</div>
            )}

            <button type="submit" className="accept-btn"disabled={processing}>
              {processing ? (
                <>
                  <Loader size={18} className="spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account & Accept
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="login-prompt">
            Already have an account? 
            <button className="text-link"onClick={handleAcceptInvitation}disabled={processing}>Login instead</button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`invitation-container ${darkMode ? 'dark' : ''}`}>
      <div className="invitation-card">
        <div className="invitation-header">
          <Mail size={48} className="invitation-icon" />
          <h2>Document Invitation</h2>
        </div>

        <div className="invitation-content">
          <p className="invitation-message">You have been invited to collaborate on document:</p>
          <h3 className="document-title">{invitation?.documentTitle}</h3>
          <div className="permission-badge large">
            {invitation?.permission === 'edit' ? (
              <>
                <Edit3 size={20} />
                <span>Edit access</span>
              </>
            ) : (
              <>
                <Eye size={20} />
                <span>View access</span>
              </>
            )}
          </div>
          <p className="invitation-email">
            Invitation sent to: <strong>{invitation?.email}</strong>
          </p>
          <button className="accept-btn"onClick={handleAcceptInvitation}disabled={processing}>
            {processing ? (
              <>
                <Loader size={18} className="spin" />
                Processing...
              </>
            ) : (
              <>
                Accept Invitation
                <ArrowRight size={18} />
              </>
            )}
          </button>
          <button className="decline-link"onClick={() => navigate('/')}>Maybe later</button>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;