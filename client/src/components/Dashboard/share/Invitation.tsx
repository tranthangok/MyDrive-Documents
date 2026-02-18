import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const AcceptInvitation: React.FC = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [invitation, setInvitation] = useState<any>(null);
  //const [signupData, setSignupData] = useState({ email: '', token: '', documentId: '', permission: '' });

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/invitation/${token}`);
      
      if (!response.ok) {
        throw new Error('Invitation not found or expired');
      }
      const data = await response.json();
      setInvitation(data.invitation);
      //setSignupData({
      //  email: data.invitation.email,
      //  token: data.invitation.token,
      //  documentId: data.invitation.documentId,
      //  permission: data.invitation.permission
      //});
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAcceptInvitation = async () => {
    setProcessing(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/invitation/${token}/claim`, {
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
        // redirect signup with invitation details
        navigate('/signup', { 
          state: { 
            fromInvitation: true,
            email: data.email,
            invitationToken: data.token,
            documentId: data.documentId,
            permission: data.permission
          }
        });
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

  const handleDecline = () => {
    navigate('/');
  };

  if (loading) {
    return <div className="loading-spinner">Loading invitation...</div>;
  }

  if (error) {
    return (
      <div className="invitation-error">
        <h2>Invalid Invitation</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Go to Home</button>
      </div>
    );
  }

  return (
    <div className="invitation-container">
      <div className="invitation-card">
        <h2>Document Invitation</h2>
        <p>You've been invited to collaborate on:</p>
        <h3>{invitation?.documentTitle}</h3>
        <p>Email: <strong>{invitation?.email}</strong></p>
        <p>Permission: <span className={`permission-badge ${invitation?.permission}`}>{invitation?.permission}</span></p>
        <div className="invitation-actions">
          <button onClick={handleAcceptInvitation} disabled={processing} className="btn-accept">
            {processing ? 'Processing...' : 'Accept Invitation'}
          </button>
          <button onClick={handleDecline} className="btn-decline">Decline</button>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitation;