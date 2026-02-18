import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { ArrowLeft, Eye, Lock } from 'lucide-react';
import './Shareddocument.css';

const SharedDocument: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);
  // Load dark mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setDarkMode(true);
      window.document.body.classList.add('dark-mode');
    } else {
      setDarkMode(false);
      window.document.body.classList.remove('dark-mode');
    }
  }, []);
  useEffect(() => {
    fetchSharedDocument();
  }, [id]);

  const fetchSharedDocument = async () => {
    try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/shared/${id}`, {
        headers: {
            'Content-Type': 'application/json'
        }
        });
      if (!response.ok) {
        throw new Error('Document not found or link expired');
      }
      const data = await response.json();
      setDoc(data.document);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`shared-viewer-container ${darkMode ? 'dark' : ''}`}>
        <div className="loading-spinner">Loading shared document...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`shared-viewer-container ${darkMode ? 'dark' : ''}`}>
        <div className="error-card">
          <Lock size={48} className="error-icon" />
          <h2>Document Not Available</h2>
          <p>{error}</p>
          <button className="back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={16} />Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`shared-viewer-container ${darkMode ? 'dark' : ''}`}>
      <div className="shared-viewer-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
        <div className="viewer-badge">
          <Eye size={16} />
          <span>View Only</span>
        </div>
      </div>
      <div className="shared-viewer-content">
        <h1 className="document-title">{doc?.title}</h1>
        <div className="document-meta">
          <span>Shared by: {doc?.owner?.name || 'Unknown'}</span>
          <span>Last updated: {doc?.updatedAt ? new Date(doc.updatedAt).toLocaleString() : ''}</span>
        </div>
        <div className="document-content">
          <ReactQuill theme="snow" value={doc?.content || ''} readOnly={true} modules={{ toolbar: false }} formats={[]}/>
        </div>
      </div>
    </div>
  );
};

export default SharedDocument;