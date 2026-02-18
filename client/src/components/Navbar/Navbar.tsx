import React, { useState, useRef, useEffect } from 'react';
import { LogIn, UserPlus, User, LogOut, ChevronDown } from 'lucide-react';
import './Navbar.css';

interface NavbarProps {
  brandName?: string;
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
  onBrandClick?: () => void;  
  onLogout?: () => void;
  onProfileClick?: () => void;
  isAuthenticated?: boolean;
  user?: { name: string; email: string } | null;
}

const Navbar: React.FC<NavbarProps> = ({
  brandName = "MyDrive Documents",
  onLoginClick,
  onSignUpClick,
  onBrandClick,
  onLogout,
  onProfileClick,
  isAuthenticated = false,
  user = null
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLLIElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close dropdown when clicking outside (desktop)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isMobile && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile]);

  const handleLogoutClick = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      setIsDropdownOpen(false);
      setIsMobileMenuOpen(false);
      onLogout?.();
    }
  };

  const handleProfileClick = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    onProfileClick?.();
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    if (isDropdownOpen) setIsDropdownOpen(false);
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleBrandClick = () => {
    // close mobile menu and dropdown when brand is clicked
    setIsMobileMenuOpen(false);
    setIsDropdownOpen(false);
    onBrandClick?.();
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={handleBrandClick}>
        <h1 className="brand-name">{brandName}</h1>
      </div>
      <button className="mobile-menu-btn"onClick={toggleMobileMenu}aria-label="Toggle menu"aria-expanded={isMobileMenuOpen}>
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Navigation menu */}
      <ul className={`navbar-menu ${isMobileMenuOpen ? 'active' : ''}`}>
        {isAuthenticated && user ? (
          <li className="navbar-item user-menu" ref={dropdownRef}>
            <div className="user-info" onClick={toggleDropdown}>
              <span className="user-name">{user.name}</span>
              <ChevronDown size={16} className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
            </div>

            {/* Dropdown menu */}
            {(isMobile || isDropdownOpen) && (
              <div className="dropdown-menu">
                {isMobile && (
                  <>
                    <div className="dropdown-item email-item">  
                      <span>{user.name}</span>
                    </div>
                    <div className="dropdown-divider"></div>
                  </>
                )}
                
                <button className="dropdown-item" onClick={handleProfileClick}>
                  <User size={16} />
                  <span>Profile</span>
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item logout" onClick={handleLogoutClick}>
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </li>
        ) : (
          // notlogin - Login/Signup
          <>
            <li className="navbar-item" onClick={() => {  onLoginClick?.();  setIsMobileMenuOpen(false);}}>
              <LogIn className="item-icon" />
              <span>Login</span>
            </li>
            
            <li className="navbar-item signup" onClick={() => {  onSignUpClick?.();  setIsMobileMenuOpen(false);}}>
              <UserPlus className="item-icon" />
              <span>Sign Up</span>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;