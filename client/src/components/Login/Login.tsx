import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Eye, EyeOff, X, Send, ArrowLeft, CheckCircle } from 'lucide-react';
import './Login.css';

interface LoginProps {
  onLoginSuccess?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({ email: '', password: '',});
  const [errors, setErrors] = useState({ email: '', password: '',});
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name as keyof typeof errors]) { setErrors(prev => ({ ...prev, [name]: ''}));}
    setServerError('');
    setSuccessMessage('');
  };

  const handleBackToHome = () => { navigate('/'); };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { email: '', password: '' };

    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    setSuccessMessage('');
    
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      // save token before onLoginSuccess
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      setSuccessMessage('Login successful! Redirecting to dashboard...');
      // onLoginSuccess update App state and redirect to dashboard
      if (onLoginSuccess) { onLoginSuccess();}      
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignUpClick = () => { navigate('/signup');};  
  const handleForgotPassword = () => {
    setShowForgotModal(true);
    setForgotEmail(formData.email);
  };

  // handleSendResetLink, endpoint
  const handleSendResetLink = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    if (!forgotEmail) {
      alert('Please enter your email');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(forgotEmail)) {
      alert('Please enter a valid email');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/reset/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset link');
      }
      setSuccessMessage(`Password reset link sent to ${forgotEmail}`);
      setShowForgotModal(false);
    } catch (error: any) {
      alert(error.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <button  className="back-home-btn" onClick={handleBackToHome} aria-label="Back to home" disabled={isLoading}> <ArrowLeft size={20} /> <span>Back to Home</span></button>
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Sign in to your account</p>
        </div>

        {successMessage && (
          <div className="success-message">
            <CheckCircle size={20} />
            {successMessage}
          </div>
        )}

        {serverError && (
          <div className="error-message server-error">
            {serverError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className={`input-wrapper ${errors.email ? 'error' : ''}`}>
              <Mail className="input-icon" />
              <input type="email" id="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} disabled={isLoading}/>
            </div>
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className={`input-wrapper ${errors.password ? 'error' : ''}`}>
              <Lock className="input-icon" />
              <input type={showPassword ? 'text' : 'password'} id="password" name="password" placeholder="Enter your password" value={formData.password} onChange={handleChange} disabled={isLoading}/>
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} disabled={isLoading}>
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <span className="error-message">{errors.password}</span>}
          </div>

          <div className="row-flex">
            <button type="button" className="forgot-password" onClick={handleForgotPassword} disabled={isLoading}> Forgot password?</button>
          </div>

          <button 
            type="submit" 
            className="btn-login"
            disabled={isLoading}>
            {isLoading ? (
              <> <span className="spinner"></span> Signing in... </>
            ) : (
              <> <LogIn className="btn-icon" /> Sign In </>
            )}
          </button>

          <div className="signup-link">
            Do not have an account?
            <button type="button" onClick={handleSignUpClick} disabled={isLoading}>Sign up</button>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Forgot Password</h2>
              <button  className="modal-close" onClick={() => setShowForgotModal(false)}> <X size={20} /></button>
            </div>
            <div className="modal-body">
              <p>Enter your email address and we will send you a link to reset your password.</p>
              <div className="input-wrapper">
                <Mail className="input-icon" />
                <input type="email" placeholder="your@email.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}/>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel"onClick={() => setShowForgotModal(false)}>Cancel</button>
              <button className="btn-confirm"onClick={handleSendResetLink}disabled={isLoading}><Send size={16} style={{ marginRight: '4px' }} />Send Reset Link</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;