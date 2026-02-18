import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Save, Key, Eye, EyeOff } from 'lucide-react';
import './Profile.css';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // State for password visibility
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false, nameConfirm: false});

  // User info
  const [user, setUser] = useState({ name: '', email: ''});

  // Form name
  const [nameForm, setNameForm] = useState({ newName: '', password: '' });

  // Form password
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: ''});

  // Fetch user info when load 
  useEffect(() => { fetchUserInfo(); }, []);

  const fetchUserInfo = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setUser(data);
      } else {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  // Validate name without numbers and special
  const validateName = (name: string) => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (name.length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (/\d/.test(name)) {
      return 'Name cannot contain numbers';
    }
    if (!/^[a-zA-Z\s]+$/.test(name)) {
      return 'Name can only contain letters and spaces';
    }
    return '';
  };

  // Validate password strength
  const validatePassword = (password: string) => {
    if (!password) {
      return 'Password is required';
    }
    if (password.length < 6) {
      return 'Password must be at least 6 characters';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    return '';
  };

  // Name change handler
  const handleNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    // Validate name
    const nameError = validateName(nameForm.newName);
    if (nameError) {
      setMessage({ type: 'error', text: nameError });
      return;
    }
    if (!nameForm.password) {
      setMessage({ type: 'error', text: 'Please enter password to confirm' });
      return;
    }
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/update-name`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          newName: nameForm.newName,
          password: nameForm.password
        })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Name updated successfully!' });
        setUser(prev => ({ ...prev, name: nameForm.newName }));
        setNameForm({ newName: '', password: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update name' });
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Change password handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    // Validation
    if (!passwordForm.currentPassword) {
      setMessage({ type: 'error', text: 'Please enter current password' });
      return;
    }
    const passwordError = validatePassword(passwordForm.newPassword);
    if (passwordError) {
      setMessage({ type: 'error', text: passwordError });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/auth/update-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: 'Password updated successfully!' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Password strength indicator
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
  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h1 className="profile-title">Profile Settings</h1>
        {/* User Info Display */}
        <div className="user-info-display">
          <div className="info-item">
            <User size={20} className="info-icon" />
            <span className="info-label">Name:</span>
            <span className="info-value">{user.name}</span>
          </div>
          <div className="info-item">
            <Mail size={20} className="info-icon" />
            <span className="info-label">Email:</span>
            <span className="info-value">{user.email}</span>
          </div>
        </div>
        {/* Message */}
        {message.text && (
          <div className={`message ${message.type}`}> {message.text}</div>)}
        {/* Change Name Form */}
        <form onSubmit={handleNameChange} className="profile-form">
          <h2 className="form-title">
            <User size={20} />
            Change Name
          </h2>
          <div className="form-group">
            <label>New Name</label>
            <input type="text" value={nameForm.newName} onChange={(e) => setNameForm({ ...nameForm, newName: e.target.value })} placeholder="Enter new name (letters only)" disabled={isLoading}/>
            <small className="input-hint">Letters and spaces only, no numbers</small>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input type={showPassword.nameConfirm ? 'text' : 'password'} value={nameForm.password} onChange={(e) => setNameForm({ ...nameForm, password: e.target.value })} placeholder="Enter password to confirm" disabled={isLoading}/>
              <button type="button" className="password-toggle" onClick={() => setShowPassword({ ...showPassword, nameConfirm: !showPassword.nameConfirm })} disabled={isLoading}>
                {showPassword.nameConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={isLoading}>
            <Save size={16} />
            {isLoading ? 'Updating...' : 'Update Name'}
          </button>
        </form>

        {/* Change Password Form */}
        <form onSubmit={handlePasswordChange} className="profile-form">
          <h2 className="form-title">
            <Key size={20} />
            Change Password
          </h2>

          <div className="form-group">
            <label>Current Password</label>
            <div className="password-input-wrapper">
              <input type={showPassword.current ? 'text' : 'password'} value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} placeholder="Enter current password" disabled={isLoading}/>
              <button type="button" className="password-toggle" onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })} disabled={isLoading}>
                {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>New Password</label>
            <div className="password-input-wrapper">
              <input type={showPassword.new ? 'text' : 'password'} value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} placeholder="Min. 6 characters with uppercase, lowercase and number" disabled={isLoading}/>
              <button type="button" className="password-toggle" onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })} disabled={isLoading}>
                {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <small className="input-hint">
              Must contain at least 6 characters, one uppercase, one lowercase and one number
            </small>
            
            {/* Password Strength Indicator */}
            {passwordForm.newPassword && !isLoading && (
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
            <label>Confirm New Password</label>
            <div className="password-input-wrapper">
              <input type={showPassword.confirm ? 'text' : 'password'} value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} placeholder="Re-enter new password" disabled={isLoading}/>
              <button type="button" className="password-toggle" onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })} disabled={isLoading}>
                {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-submit" disabled={isLoading}>
            <Key size={16} />
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Profile;