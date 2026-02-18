import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { pdf } from '@react-pdf/renderer';
import DocumentPDF from './Documentpdf';
import { exportToPPT } from './Documentppt';
import './Documenteditor.css';
import { Save, Download, ArrowLeft, Sun, Moon, X, Presentation, Share2, Copy, Eye, Edit3, Link2, Users, AlertCircle, Mail,CheckCircle, Clock, Send} from 'lucide-react';

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'indent': '-1'}, { 'indent': '+1' }],
    [{ 'align': [] }],
    ['link'],
    ['clean']
  ],
};
const formats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet', 'indent',
  'align',
  'link', 'image'
];
interface SharedUser {
  id: string;
  email: string;
  permission: 'view' | 'edit';
}
interface Invitation {
  email: string;
  permission: 'view' | 'edit';
  status: 'pending' | 'accepted';
  sentAt: Date;
}
interface LastSavedVersion {
  title: string;
  content: string;
  updatedAt: Date | null;
}

const DocumentEditor: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);
  
  const [isOwner, setIsOwner] = useState(true);
  const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharePermission, setSharePermission] = useState<'view' | 'edit'>('view');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  //const [inviteSent, setInviteSent] = useState(false);
  
  const [activeEditors, setActiveEditors] = useState<string[]>([]);
  const [showConflictModal, setShowConflictModal] = useState(false);
  //const [conflictUser, setConflictUser] = useState('');
  const [serverContent, setServerContent] = useState('');
  const [serverTitle, setServerTitle] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  
  const [title, setTitle] = useState('Untitled Document');
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  //const [isNewDocument, setIsNewDocument] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // Track last saved version for conflict detection
  const [lastSavedVersion, setLastSavedVersion] = useState<LastSavedVersion>({
    title: '',
    content: '',
    updatedAt: null
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Load dark mode preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode === 'true') {
      setDarkMode(true);
      document.body.classList.add('dark-mode');
    } else {
      setDarkMode(false);
      document.body.classList.remove('dark-mode');
    }
    setInitialLoad(false);
  }, []);
  // Apply dark mode class to body
  useEffect(() => {
    if (initialLoad) return;
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode, initialLoad]);
  // Load document on mount
  useEffect(() => {
    if (id && id !== 'new') {
      fetchDocument();
      fetchSharedUsers();
      fetchPendingInvitations();
      // Update active editors
      const interval = setInterval(updateActiveEditor, 10000);
      const editorsInterval = setInterval(checkActiveEditors, 5000);
      return () => {
        clearInterval(interval);
        clearInterval(editorsInterval);
      };
    } else {
      //setIsNewDocument(true);
      setLoading(false);
    }
  }, [id]);
  // Auto-save when content or title changes
  useEffect(() => {
    if (!loading && id && id !== 'new' && (content || title)) {
      const hasChanges = 
        content !== lastSavedVersion.content || 
        title !== lastSavedVersion.title;
      
      if (hasChanges) {
        const timer = setTimeout(() => handleSave(false), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [content, title, loading, id, lastSavedVersion]);
  // Check for unsaved changes - check both title and content
  useEffect(() => {
    const hasChanges = 
      content !== lastSavedVersion.content || 
      title !== lastSavedVersion.title;
    setHasUnsavedChanges(hasChanges);
  }, [content, title, lastSavedVersion]);
  // Handle beforeunload event
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  // Polling change check every 10 seconds from changes by other users
  useEffect(() => {
    if (!id || id === 'new') return;
    
    const checkForChanges = async () => {
      const token = getToken();
      if (!token) return;
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        const serverTitle = data.document.title;
        const serverContent = data.document.content;
        const serverLastModified = new Date(data.document.updatedAt).getTime();
        const localLastModified = lastSavedVersion.updatedAt?.getTime() || 0;
        // server has changes that local doesn't have and not currently saving
        const hasServerChanges = 
          serverContent !== lastSavedVersion.content || 
          serverTitle !== lastSavedVersion.title;
          
        if (hasServerChanges && serverLastModified > localLastModified && !saving) {
          //setConflictUser('Another user');
          setServerContent(serverContent);
          setServerTitle(serverTitle);
          setShowConflictModal(true);
        }
      }
    };
    const interval = setInterval(checkForChanges, 10000);
    return () => clearInterval(interval);
  }, [id, lastSavedVersion, saving]);

  const getToken = () => localStorage.getItem('token');
  const fetchDocument = async () => {
    try {
      const token = getToken();
      if (!token) return navigate('/login');

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch document');

      const data = await response.json();
      setTitle(data.document.title);
      setContent(data.document.content);
      // Save current version
      setLastSavedVersion({
        title: data.document.title,
        content: data.document.content,
        updatedAt: new Date(data.document.updatedAt)
      });
      
      setLastSaved(new Date(data.document.updatedAt));
      // Check if current user is owner
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      setIsOwner(data.document.owner === currentUser.id);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  const fetchSharedUsers = async () => {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}/shared`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setSharedUsers(data.users || []);
    }
  };
  const fetchPendingInvitations = async () => {
    setPendingInvitations([]);
  };
  const updateActiveEditor = async () => {
    const token = getToken();
    if (!token) return;
    await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}/active`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  };
  const checkActiveEditors = async () => {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      // Filter out current user
      const otherEditors = data.activeEditors.filter((email: string) => 
        email !== currentUser.email
      );
      setActiveEditors(otherEditors);
    }
  };
  const handleSave = async (showNotification = true) => {
    // Check if no changes
    const hasChanges = 
      content !== lastSavedVersion.content || 
      title !== lastSavedVersion.title;
      
    if (!hasChanges) {
      if (showNotification) {
        setSuccessMessage('No changes to save');
        setShowSuccessModal(true);
      }
      return;
    }
    setSaving(true);
    try {
      const token = getToken();
      if (!token) return navigate('/login');

      const isNew = id === 'new';
      const url = isNew ? `${import.meta.env.VITE_BACKEND_URL}/api/documents` : `${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}`;

      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          title, 
          content,
          lastModified: lastSavedVersion.updatedAt?.getTime() // Send timestamp for conflict check
        })
      });
      if (response.status === 409) {
        // Conflict detected
        const data = await response.json();
        //setConflictUser('Another user');
        setServerContent(data.serverContent);
        setServerTitle(data.serverTitle || title);
        setShowConflictModal(true);
        setSaving(false);
        return;
      }
      if (response.status === 403) {
        const data = await response.json();
        setError(data.error || 'You do not have permission');
        setSaving(false);
        return;
      }
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save document');
      }
      const data = await response.json();
      if (isNew && data.document?._id) {
        navigate(`/document/${data.document._id}`, { replace: true });
        return;
      }
      // Update lastSavedVersion after successful save
      setLastSavedVersion({
        title: title,
        content: content,
        updatedAt: new Date(data.updatedAt || Date.now())
      });
      setLastSaved(new Date());
      
      if (showNotification) {
        setSuccessMessage('Document saved successfully!');
        setShowSuccessModal(true);
      }
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Conflict resolution - update both title and content
  const handleResolveConflict = (choice: 'overwrite' | 'reload') => {
    setShowConflictModal(false);
    if (choice === 'overwrite') {
      // Overwrite server with local changes
      setTimeout(() => handleSave(true), 100);
    } else {
      // Reload server version
      setContent(serverContent);
      setTitle(serverTitle);
      setLastSavedVersion({
        title: serverTitle,
        content: serverContent,
        updatedAt: new Date()
      });
      setHasUnsavedChanges(false);
    }
  };

  const handleExportPDF = async () => {
    const pdfDocument = <DocumentPDF title={title} content={content} />;
    const blob = await pdf(pdfDocument).toBlob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'document'}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPPT = async () => { await exportToPPT(title, content, `${title || 'document'}.pptx`);};
  const handleSendInvite = async () => {
    if (!shareEmail.trim()) return;
    const token = getToken();
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}/invite`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: shareEmail,
        permission: sharePermission
      })
    });
    if (response.ok) {
      setShareEmail('');
      //setInviteSent(true);
      setSuccessMessage(`Invitation sent to ${shareEmail}`);
      setShowSuccessModal(true);
      setPendingInvitations([
        ...pendingInvitations,
        {
          email: shareEmail,
          permission: sharePermission,
          status: 'pending',
          sentAt: new Date()
        }
      ]);
      //setTimeout(() => setInviteSent(false), 3000);
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to send invitation');
    }
  };

  const handleRemoveShare = async (userId: string) => {
    const token = getToken();
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}/share/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      fetchSharedUsers();
    }
  };

  const generateShareLink = async () => {
    const token = getToken();
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/documents/${id}/generate-link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const data = await response.json();
      const link = `${window.location.origin}/shared/${data.shareId}`;
      setShareLink(link);
    }

  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  if (loading) {
    return (
      <div className={`editor-container ${darkMode ? 'dark' : ''}`}>
        <div className="loading-spinner">Loading document...</div>
      </div>
    );
  }

  return (
    <div className={`editor-container ${darkMode ? 'dark' : ''}`}>
      <div className="editor-header">
        <button className="back-btn" onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        <div className="editor-actions">
          <input type="text" className="title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title"/>
          {activeEditors.length > 0 && (
            <div className="active-editors-warning">
              <AlertCircle size={16} />
              <span>{activeEditors.length} other editor(s)</span>
            </div>
          )}
          {lastSaved && (
            <span className="last-saved">
              <Clock size={14} />
              {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button  className="action-btn share-btn" onClick={() => setShowShareModal(true)} title="Share document"> <Share2 size={18} /> Share </button>  
          <button className="theme-toggle" onClick={toggleDarkMode}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
          <button className={`action-btn save-btn ${saving ? 'saving' : ''}`}onClick={() => handleSave(true)}disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button  className="action-btn ppt-btn" onClick={handleExportPPT} title="Export to PowerPoint">
            <Presentation size={18} />
            Export PPT
          </button>
          <button className="action-btn export-btn" onClick={handleExportPDF}>
            <Download size={18} />
            Export PDF
          </button>
        </div>
      </div>
      {error && (<div className="error-message">{error}</div>)}
      <div className="editor-content" ref={editorRef}>
        <ReactQuill ref={quillRef} theme="snow" value={content} onChange={setContent} modules={modules} formats={formats} placeholder="Start writing your document here..."/>
      </div>
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className={`modal-content success-modal ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Success!</h2>
              <button className="modal-close" onClick={() => setShowSuccessModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="success-icon">✓</div>
              <p className="success-text">{successMessage}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-confirm" onClick={() => setShowSuccessModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
      {/* Conflict Modal */}
      {showConflictModal && (
        <div className="modal-overlay" onClick={() => setShowConflictModal(false)}>
          <div className={`modal-content conflict-modal ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Document Conflict</h2>
              <button className="modal-close" onClick={() => setShowConflictModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="conflict-icon">!</div>
              <p className="conflict-text">This document has been modified by another user.</p>
              <div className="conflict-actions">
                <button className="btn-conflict overwrite"onClick={() => handleResolveConflict('overwrite')}>Overwrite with my changes</button>
                <button className="btn-conflict reload"onClick={() => handleResolveConflict('reload')}>Load their version</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className={`modal-content share-modal ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Share Document</h2>
              <button className="modal-close" onClick={() => setShowShareModal(false)}><X size={20} /></button>
            </div>
            
            <div className="modal-body">
              {/* Invite by email */}
              <div className="share-section">
                <h3><Mail size={20} />Invite by email</h3>
                <div className="share-input-group">
                  <input type="email" className="share-input" placeholder="Enter email address" value={shareEmail} onChange={(e) => setShareEmail(e.target.value)}/>
                  <select className="share-select" value={sharePermission} onChange={(e) => setSharePermission(e.target.value as 'view' | 'edit')}>
                    <option value="view">Can view</option>
                    <option value="edit">Can edit</option>
                  </select>
                  <button className="share-submit" onClick={handleSendInvite}disabled={!shareEmail.trim()}>
                    <Send size={16} />Send
                  </button>
                </div>
                {/* Pending invitations */}
                {pendingInvitations.length > 0 && (
                  <div className="pending-invitations">
                    <h4>Pending invitations</h4>
                    {pendingInvitations.map((inv, index) => (
                      <div key={index} className="pending-item">
                        <Mail size={14} />
                        <span className="pending-email">{inv.email}</span>
                        <span className={`pending-permission ${inv.permission}`}>{inv.permission}</span>
                        <Clock size={14} className="pending-icon" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* People with access */}
              {sharedUsers.length > 0 && (
                <div className="share-section">
                  <h3>
                    <Users size={20} />People with access
                  </h3>
                  
                  <div className="shared-users-list">
                    {sharedUsers.map(user => (
                      <div key={user.id} className="shared-user-item">
                        <div className="user-info">
                          <span className="user-email">{user.email}</span>
                          <span className={`user-permission ${user.permission}`}>
                            {user.permission === 'edit' ? <Edit3 size={14} /> : <Eye size={14} />}
                            {user.permission}
                          </span>
                        </div>
                        {isOwner && (
                          <button className="remove-share" onClick={() => handleRemoveShare(user.id)} title="Remove access">
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Share via link */}
              <div className="share-section">
                <h3>
                  <Link2 size={20} />Share via link
                </h3>
                <div className="share-link-group">
                  <input type="text" className="share-link-input" value={shareLink || 'Click generate to create link'} readOnly/>
                  <button className="share-link-generate" onClick={generateShareLink}>
                    <Link2 size={16} />Generate
                  </button>
                  {shareLink && (<button className="share-link-copy" onClick={copyToClipboard}>{copied ? <CheckCircle size={16} /> : <Copy size={16} />}</button>)}
                </div>
                <p className="share-note">Anyone with the link can view this document</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentEditor;