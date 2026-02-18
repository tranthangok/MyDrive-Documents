import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle } from 'lucide-react';
import './Signup.css';

interface SignUpProps {
  onSignUpSuccess?: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ onSignUpSuccess }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: ''});
  const [errors, setErrors] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [touched, setTouched] = useState({ name: false, email: false, password: false, confirmPassword: false});

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
    if (serverError) setServerError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleBlur = (field: string) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { name: '', email: '', password: '', confirmPassword: ''};
    // Validate Name
    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required';
      isValid = false;
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
      isValid = false;
    } else if (/\d/.test(formData.name)) {
      newErrors.name = 'Name cannot contain numbers';
      isValid = false;
    } else if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      newErrors.name = 'Name can only contain letters and spaces';
      isValid = false;
    }
    // Validate Email
    if (!formData.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
      isValid = false;
    }
    // Validate Password
    if (!formData.password) {
      newErrors.password = 'Password is required';
      isValid = false;
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
      isValid = false;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase and number';
      isValid = false;
    }
    // Validate Confirm Password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
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
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      // token save
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      setSuccessMessage('Account created successfully! Redirecting to login...');
      // redirect 2 giây
      setTimeout(() => {
        if (onSignUpSuccess) {
          onSignUpSuccess();
        } else {
          navigate('/login');
        }
      }, 2000);
    } catch (error: any) {
      setServerError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignInClick = () => { navigate('/login');}
  const handleBackToHome = () => { navigate('/');};
  // Password strength
  const getPasswordStrength = (password: string) => {
    if (!password) return null;
    let strength = 0;
    if (password.length >= 6) strength++;
    if (/(?=.*[a-z])/.test(password)) strength++;
    if (/(?=.*[A-Z])/.test(password)) strength++;
    if (/(?=.*\d)/.test(password)) strength++;
    if (/(?=.*[!@#$%^&*])/.test(password)) strength++;
    
    if (strength <= 2) return { text: 'Weak', class: 'weak' };
    if (strength <= 4) return { text: 'Medium', class: 'medium' };
    return { text: 'Strong', class: 'strong' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  return (
    <div className="signup-container">
      <div className="signup-card">
        <button className="back-home-btn"onClick={handleBackToHome}aria-label="Back to home"disabled={isLoading}><ArrowLeft size={20} /><span>Back to Home</span></button>
        <div className="signup-header">
          <h1>Create Account</h1>
          <p>Join us and get started today</p>
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
            <label htmlFor="name">Full Name</label>
            <div className={`input-wrapper ${touched.name && errors.name ? 'error' : ''}`}>
              <User className="input-icon" />
              <input type="text" id="name" name="name" placeholder="Enter your full name" value={formData.name} onChange={handleChange} onBlur={() => handleBlur('name')} disabled={isLoading}/>
            </div>
            <small className="input-hint">Letters and spaces only, no numbers</small>
            {touched.name && errors.name && ( <span className="field-error">{errors.name}</span>)}
          </div>
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <div className={`input-wrapper ${touched.email && errors.email ? 'error' : ''}`}>
              <Mail className="input-icon" />
              <input type="email" id="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} onBlur={() => handleBlur('email')} disabled={isLoading}/>
            </div>
            {touched.email && errors.email && (<span className="field-error">{errors.email}</span>)}
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input type={showPassword ? 'text' : 'password'} id="password" name="password" placeholder="Create a password" value={formData.password} onChange={handleChange} onBlur={() => handleBlur('password')} disabled={isLoading}/>
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'} disabled={isLoading}> {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
            <small className="input-hint">Must contain at least 6 characters, one uppercase, one lowercase and one number</small>
            {touched.password && errors.password && (<span className="field-error">{errors.password}</span>)}
            {formData.password && !isLoading && (
              <>
                <div className="password-strength">
                  <div className={`strength-bar ${passwordStrength?.class}`} />
                </div>
                <span className="strength-text">
                  Password strength: {passwordStrength?.text}
                </span>
              </>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <div className={`input-wrapper ${touched.confirmPassword && errors.confirmPassword ? 'error' : ''}`}>
              <Lock className="input-icon" />
              <input type={showConfirmPassword ? 'text' : 'password'} id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" value={formData.confirmPassword} onChange={handleChange} onBlur={() => handleBlur('confirmPassword')} disabled={isLoading}/>
              <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label={showConfirmPassword ? 'Hide password' : 'Show password'} disabled={isLoading}> {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
            </div>
            {touched.confirmPassword && errors.confirmPassword && (  <span className="field-error">{errors.confirmPassword}</span>)}
          </div>
          {/* Sign Up Button */}
          <button type="submit" className="btn-signup"disabled={isLoading}>{isLoading ? (
              <> <span className="spinner"></span>Creating Account...</>
            ) : (
              <><UserPlus className="btn-icon" />Create Account</>
            )}
          </button>
          {/* Sign In Link */}
          <div className="signin-link">
            Already have an account?
            <button type="button" onClick={handleSignInClick}disabled={isLoading}>Sign in</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;