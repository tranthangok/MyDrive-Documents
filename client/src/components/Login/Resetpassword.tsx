import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, Key } from 'lucide-react';
import './Resetpassword.css';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: ''});
  
  const [errors, setErrors] = useState({ newPassword: '', confirmPassword: ''});

  // Verify token when load
  useEffect(() => {
    if (!token) {
      setServerError('Invalid reset link');
      setIsVerifying(false);
      return;
    }
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/reset/verify-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Invalid or expired token');
      }
      setIsVerifying(false); 
    } catch (error: any) {
      setServerError(error.message);
      setIsVerifying(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    setServerError('');
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {
      newPassword: '',
      confirmPassword: '',
    };
    // Validate password 
    if (!formData.newPassword) {
      newErrors.newPassword = 'Password is required';
      isValid = false;
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain uppercase, lowercase and number';
      isValid = false;
    }
    // Validate confirm password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const response = await fetch('http://localhost:5000/api/reset/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: formData.newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password');
      }
      setSuccessMessage('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      setServerError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="reset-container">
        <div className="reset-card">
          <div className="verifying-spinner">
            <div className="spinner"></div>
            <p>Verifying your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-container">
      <div className="reset-card">
        <div className="reset-header">
          <Key size={48} className="reset-icon" />
          <h1>Reset Password</h1>
          <p>Enter your new password below</p>
        </div>

        {serverError && (
          <div className="error-message server-error">
            {serverError}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        {!serverError && !successMessage && (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className={`input-wrapper ${errors.newPassword ? 'error' : ''}`}>
                <Lock className="input-icon" />
                <input type={showPassword ? 'text' : 'password'} id="newPassword" name="newPassword" placeholder="Enter new password" value={formData.newPassword} onChange={handleChange} disabled={isLoading}/>
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <small className="input-hint">At least 6 characters with uppercase, lowercase and number</small>
              {errors.newPassword && (
                <span className="field-error">{errors.newPassword}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={`input-wrapper ${errors.confirmPassword ? 'error' : ''}`}>
                <Lock className="input-icon" />
                <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" placeholder="Re-enter new password" value={formData.confirmPassword} onChange={handleChange} disabled={isLoading}/>
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} disabled={isLoading}>
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <span className="field-error">{errors.confirmPassword}</span>
              )}
            </div>

            {/* Reset Button */}
            <button type="submit" className="btn-reset" disabled={isLoading}> {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Resetting...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;