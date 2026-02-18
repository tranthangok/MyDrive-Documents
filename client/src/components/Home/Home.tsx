import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Shield, Users, ArrowRight } from 'lucide-react';
import './Home.css';

const Home: React.FC = () => {
  const navigate = useNavigate();

  const features = [{
    icon: <Zap className="feature-icon" />,
    title: "Lightning Fast",
    description: "Experience fast upload and download from the cloud" },
  { 
    icon: <Shield className="feature-icon" />,
    title: "Secure & Reliable",
    description: "Your data and your online assets are protected with security measures."},
  {
    icon: <Users className="feature-icon" />,
    title: "Easy to Use",
    description: "Intuitive interface designed for users with simplest way to use." }
  ];

  return (
    <div className="home-container">
      <section className="home-section">
        <div className="home-content">
          <h1 className="home-title"> Welcome to MyDrive Documents</h1>
          <p className="home-subtitle"> Where you can store documents like a normal Google Documents.
            <br />
            Join with us and many users right now
          </p>
          <div className="home-buttons">
            <button className="btn btn-primary" onClick={() => navigate('/signup')}>Get Started<ArrowRight size={20} /> </button>
            <button className="btn btn-outline" onClick={() => navigate('/login')}>Sign In</button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <h2 className="section-title">Why Choose Us?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              {feature.icon}
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Get Started?</h2>
          <p>Join our community and store your documents right now.</p>
          <button className="btn btn-primary btn-large"onClick={() => navigate('/signup')}>Create Your Account</button>
        </div>
      </section>
    </div>
  );
};

export default Home;