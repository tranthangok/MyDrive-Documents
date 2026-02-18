import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Folder, Trash2, RotateCcw, ChevronLeft, X, AlertTriangle} from 'lucide-react';
import './Trash.css';

interface TrashItem {
  id: string;
  name: string;
  type: 'document' | 'folder';
  originalFolder: string | null;
  deletedAt: string;
  originalId: string;
}

const Trash: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<TrashItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [itemToRestore, setItemToRestore] = useState<TrashItem | null>(null);
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
    fetchTrashItems();
  }, []);

  const getToken = () => localStorage.getItem('token');
  const fetchTrashItems = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/trash`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });


      if (!response.ok) {
        throw new Error('Failed to fetch trash items');
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Failed to fetch trash:', err);
      setErrorMessage('Failed to load trash items');
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreClick = (item: TrashItem) => {
    setItemToRestore(item);
    setShowRestoreModal(true);
  };

  const handleConfirmRestore = async () => {
    if (!itemToRestore) return;
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/trash/${itemToRestore.id}/restore`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (response.ok) {
      setItems(items.filter(item => item.id !== itemToRestore.id));
      setSelectedItems(prev => prev.filter(id => id !== itemToRestore.id));
      setSuccessMessage(`"${itemToRestore.name}" restored successfully`);
      setShowSuccessModal(true);
      setShowRestoreModal(false);
      setItemToRestore(null);
    } else {
      setErrorMessage(data.error || 'Failed to restore');
      setShowErrorModal(true);
    }
  };

  const handleDeleteClick = (item: TrashItem) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/trash/${itemToDelete.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (response.ok) {
      setItems(items.filter(item => item.id !== itemToDelete.id));
      setSelectedItems(prev => prev.filter(id => id !== itemToDelete.id));
      setSuccessMessage(`"${itemToDelete.name}" permanently deleted`);
      setShowSuccessModal(true);
      setShowDeleteModal(false);
      setItemToDelete(null);
    } else {
      setErrorMessage(data.error || 'Failed to delete');
      setShowErrorModal(true);
    }
  };

  const handleCleanTrash = async () => {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/trash`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })  
    const data = await response.json()  
    if (response.ok) {
      setItems([]);
      setSelectedItems([]);
      setShowCleanModal(false);
      setSuccessMessage('Trash emptied successfully');
      setShowSuccessModal(true);
    } else {
      setErrorMessage(data.error || 'Failed to empty trash');
      setShowErrorModal(true);
    }
  };

  const handleRestoreMultiple = async () => {
    if (selectedItems.length === 0) return;
    const token = getToken();
    if (!token) return;
    const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/trash/restore-multiple`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ itemIds: selectedItems })
    });
    const data = await response.json();
    if (response.ok) {
      setItems(items.filter(item => !selectedItems.includes(item.id)));
      setSelectedItems([]);
      setSuccessMessage('Selected items restored successfully');
      setShowSuccessModal(true);
    } else {
      setErrorMessage(data.error || 'Failed to restore items');
      setShowErrorModal(true);
    }
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(i => i.id));
    }
  };

  if (loading) {
    return (
      <div className={`trash-container ${darkMode ? 'dark' : ''}`}>
        <div className="loading-spinner">Loading trash...</div>
      </div>
    );
  }

  return (
    <div className={`trash-container ${darkMode ? 'dark' : ''}`}>
      <div className="trash-header">
        <div className="header-left">
          <h1>Trash</h1>
          <p className="item-count">{items.length} items</p>
        </div>
        <div className="header-actions">
          {selectedItems.length > 0 && (
            <button className="btn-restore-selected"onClick={handleRestoreMultiple}>
              <RotateCcw size={18} />Restore Selected ({selectedItems.length})
            </button>
          )}
          {items.length > 0 && (
            <button className="btn-clean" onClick={() => setShowCleanModal(true)}> <Trash2 size={18} />Empty Trash</button>)}
          <button className="btn-back"onClick={() => navigate('/dashboard')}>
            <ChevronLeft size={18} />Back to Dashboard
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="empty-trash">
          <Trash2 size={64} className="empty-icon" />
          <h2>Trash is empty</h2>
          <p>Items you delete will appear here</p>
          <button className="btn-back-dashboard" onClick={() => navigate('/dashboard')}>Go to Dashboard</button>
        </div>
      ) : (
        <div className="trash-list">
          <div className="trash-header-row">
            <div className="checkbox-col">
              <input type="checkbox" checked={selectedItems.length === items.length} onChange={toggleSelectAll}/>
            </div>
            <div className="name-col">Name</div>
            <div className="type-col">Type</div>
            <div className="date-col">Deleted</div>
            <div className="actions-col">Actions</div>
          </div>
          {items.map(item => (
            <div key={item.id} className="trash-item">
              <div className="checkbox-col">
                <input type="checkbox" checked={selectedItems.includes(item.id)} onChange={() => toggleSelectItem(item.id)}/>
              </div>
              <div className="name-col">
                {item.type === 'folder' ? (
                  <Folder size={20} className="item-icon folder" />
                ) : (
                  <FileText size={20} className="item-icon file" />
                )}
                <span className="item-name">{item.name}</span>
              </div>
              <div className="type-col">
                <span className={`type-badge ${item.type}`}>{item.type}</span>
              </div>
              <div className="date-col">
                {new Date(item.deletedAt).toLocaleDateString()}
              </div>
              <div className="actions-col">
                <button className="icon-btn restore" onClick={() => handleRestoreClick(item)} title="Restore">
                  <RotateCcw size={18} />
                </button>
                <button className="icon-btn delete-permanent" onClick={() => handleDeleteClick(item)} title="Delete permanently">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
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
      {showErrorModal && (
        <div className="modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className={`modal-content error-modal ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Error</h2>
              <button className="modal-close" onClick={() => setShowErrorModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="error-icon">!</div>
              <p className="error-text">{errorMessage}</p>
            </div>
            <div className="modal-actions">
              <button className="btn-confirm" onClick={() => setShowErrorModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
      {showRestoreModal && itemToRestore && (
        <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
          <div className={`modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Restore Item</h2>
              <button className="modal-close" onClick={() => setShowRestoreModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to restore <strong>{itemToRestore.name}</strong>?</p>
              <p className="info-text">The item will be restored to its original location.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowRestoreModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleConfirmRestore}>Restore</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && itemToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className={`modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Permanently</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete <strong>{itemToDelete.name}</strong>?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="btn-confirm delete" onClick={handleConfirmDelete}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
      {showCleanModal && (
        <div className="modal-overlay" onClick={() => setShowCleanModal(false)}>
          <div className={`modal-content ${darkMode ? 'dark' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Empty Trash</h2>
              <button className="modal-close" onClick={() => setShowCleanModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="warning-icon-container"><AlertTriangle size={48} className="warning-icon" /></div>
              <p>Are you sure you want to permanently delete all items in trash?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowCleanModal(false)}>Cancel</button>
              <button className="btn-confirm delete" onClick={handleCleanTrash}>Empty Trash</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trash;