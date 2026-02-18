import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FolderPlus, FilePlus, FileText, Folder, Download, Trash2, Edit, ChevronRight, Home, Trash as TrashIcon, ChevronLeft, ChevronRight as ChevronRightIcon, X, MoveRight, ArrowUpDown, Sun, Moon, Presentation, Eye, Edit3, Users} from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import DocumentPDF from './Documentpdf';
import { exportToPPT } from './Documentppt';
import './Dashboard.css';

// Types
interface Document {
  _id: string;
  title: string;
  content: string;
  type: 'file';
  owner: string;
  folder: string | null;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
  permission?: 'view' | 'edit';
}
interface Folder {
  _id: string;
  name: string;
  type: 'folder';
  owner: string;
  parent: string | null;
  starred: boolean;
  createdAt: string;
  updatedAt: string;
}
type Item = Document | Folder;
interface QuickFolder {
  id: string;
  name: string;
  icon: React.ReactNode;
  colorClass: string;
}
type SortField = 'name' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPath, setCurrentPath] = useState<string[]>(['My Drive']);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [darkMode, setDarkMode] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [itemToClone, setItemToClone] = useState<Document | null>(null);
  const [cloneTitle, setCloneTitle] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [clonedItemName, setClonedItemName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<Item | null>(null);
  const [editName, setEditName] = useState('');
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>([]);
  const [showSharedOnly, setShowSharedOnly] = useState(false);
  const itemsPerPage = 5;
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
  // Check URL params for folder
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const folderParam = params.get('folder');
    if (folderParam) {
      setCurrentFolderId(folderParam);
      fetchFolderName(folderParam);
    } else {
      setCurrentFolderId(null);
      setCurrentPath(['My Drive']);
    }
  }, [location.search]);
  const fetchFolderName = async (folderId: string) => {
    const token = getToken();
    if (!token) return;
    const response = await fetch(`http://localhost:5000/api/folders/${folderId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      setCurrentPath(['My Drive', data.folder.name]);
    }
  };
  // Fetch data when folder changes
  useEffect(() => {
    fetchCurrentFolder();
  }, [currentFolderId]);

  const getToken = () => localStorage.getItem('token');
  const fetchCurrentFolder = async () => {
    setLoading(true);
    try {
      const token = getToken();
      if (!token) {
        navigate('/login');
        return;
      }
      // Fetch folders (owned by user)
      let foldersUrl = 'http://localhost:5000/api/folders';
      if (currentFolderId) {
        foldersUrl = `http://localhost:5000/api/folders/${currentFolderId}`;
      }
      const foldersResponse = await fetch(foldersUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!foldersResponse.ok) {
        throw new Error('Failed to fetch folder');
      }
      const foldersData = await foldersResponse.json();
      // Fetch documents
      let docsUrl = 'http://localhost:5000/api/documents';
      if (currentFolderId) {
        docsUrl += `?folderId=${currentFolderId}`;
      }
      const docsResponse = await fetch(docsUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const docsData = await docsResponse.json();
      if (currentFolderId) {
        setFolders(foldersData.content?.folders || []);
        setDocuments(docsData.documents || []);
      } else {
        setFolders(foldersData.folders || []);
        setDocuments(docsData.documents || []);
      }
      setError('');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchAllFolders = async () => {
    const token = getToken();
    if (!token) return;
    const response = await fetch('http://localhost:5000/api/folders', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      setAllFolders(data.folders || []);
    }
  };

  const allItems: Item[] = [...folders, ...documents];
  const getFilteredItems = () => {
    if (showSharedOnly) {
      return sharedDocuments;
    }
    return allItems;
  };

  const filteredItems = getFilteredItems().filter(item => {
    const name = 'title' in item ? item.title : item.name;
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'name') {
      const nameA = 'title' in a ? a.title : a.name;
      const nameB = 'title' in b ? b.title : b.name;
      comparison = nameA.localeCompare(nameB);
    } else if (sortField === 'createdAt') {
      comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortField === 'updatedAt') {
      comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.ceil(sortedItems.length / itemsPerPage);
  const paginatedItems = sortedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const fetchSharedDocuments = async () => {
    const token = getToken();
    if (!token) return;
    const response = await fetch('http://localhost:5000/api/documents/shared', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    setSharedDocuments(data.documents || []);    
  };
  
  useEffect(() => {
    fetchSharedDocuments();
  }, []);

  const quickFolders: QuickFolder[] = [
    {
      id: 'trash',
      name: 'Trash',
      icon: <TrashIcon className="folder-icon" />,
      colorClass: 'trash'
    },
    {
      id: 'shared',
      name: 'Shared with me',
      icon: <Users className="folder-icon" />,
      colorClass: 'shared'
    }
  ];

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleFolderClick = (folder: Folder) => {
    setCurrentPath([...currentPath, folder.name]);
    setCurrentFolderId(folder._id);
    setCurrentPage(1);
  };

  const handleDocumentClick = (doc: Document) => {
    navigate(`/document/${doc._id}`);
  };

  const handleBreadcrumbClick = async (index: number) => {
    if (index === 0) {
      setCurrentPath(['My Drive']);
      setCurrentFolderId(null);
    } else {
      setCurrentPath(currentPath.slice(0, index + 1));
    }
    setCurrentPage(1);
  };

  const handleQuickFolderClick = (folderId: string) => {
  switch (folderId) {
    case 'trash':
      navigate('/trash');
      setShowSharedOnly(false);
      break;
    case 'shared':
      if (showSharedOnly) {
        setShowSharedOnly(false);
        setCurrentFolderId(null);
        setCurrentPath(['My Drive']);
      } else {
        setShowSharedOnly(true);
        setCurrentPage(1);
      }
      break;
    default:
      setShowSharedOnly(false);
  }
};

  const handleDownloadPDF = async (doc: Document) => {
    const pdfDocument = (
      <DocumentPDF 
        title={doc.title} 
        content={doc.content} 
      />
    );
    const blob = await pdf(pdfDocument).toBlob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title || 'document'}.pdf`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const handleExportPPT = async (doc: Document) => {await exportToPPT(doc.title, doc.content, `${doc.title || 'document'}.pptx`);};
  const handleDeleteClick = (item: Item) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const token = getToken();
    if (!token) return;
    const isDocument = 'title' in itemToDelete;
    // endpoint seperately for document or folder
    const url = isDocument 
      ? 'http://localhost:5000/api/trash/document'
      : 'http://localhost:5000/api/trash/folder';
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        [isDocument ? 'documentId' : 'folderId']: itemToDelete._id
      })
    });
    if (response.ok) {
      if (isDocument) {
        setDocuments(prev => prev.filter(d => d._id !== itemToDelete._id));
      } else {
        setFolders(prev => prev.filter(f => f._id !== itemToDelete._id));
      }
      setShowDeleteModal(false);
      setItemToDelete(null);
      // message
      setSuccessMessage('Item moved to trash successfully');
      setShowSuccessModal(true);
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to move to trash');
    }
  };

  const handleCloneClick = (doc: Document) => {
    setItemToClone(doc);
    const baseTitle = doc.title;
    const newTitle = `${baseTitle} (Copy)`;
    setCloneTitle(newTitle);
    setShowCloneModal(true);
  };

  const handleConfirmClone = async () => {
    if (!itemToClone || !cloneTitle.trim()) return;
    const token = getToken();
    if (!token) return;
    const allDocsResponse = await fetch('http://localhost:5000/api/documents', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    let finalTitle = cloneTitle.trim();
    if (allDocsResponse.ok) {
      const allDocsData = await allDocsResponse.json();
      const allDocuments = allDocsData.documents || [];
      const nameExists = allDocuments.some(
        (doc: Document) => doc.title === finalTitle
      );
      if (nameExists) {
        const baseName = finalTitle;
        const pattern = new RegExp(`^${baseName}(?: (\\d+))?$`);
        
        const existingNames = allDocuments
          .map((doc: Document) => doc.title)
          .filter((title: string) => pattern.test(title));
        
        let maxNumber = 0;
        existingNames.forEach((title: string) => {
          const match = title.match(/(\d+)$/);
          if (match) {
            const num = parseInt(match[1]);
            maxNumber = Math.max(maxNumber, num);
          }
        });
        
        const nextNumber = maxNumber + 1;
        finalTitle = `${baseName} ${nextNumber}`;
      }
    }
    const response = await fetch('http://localhost:5000/api/documents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: finalTitle,
        content: itemToClone.content,
        folderId: currentFolderId
      })
    });
    if (response.ok) {
      fetchCurrentFolder();
      
      setClonedItemName(finalTitle);
      setSuccessMessage(`Document "${finalTitle}" has been cloned successfully!`);
      setShowSuccessModal(true); 
      setShowCloneModal(false);
      setItemToClone(null);
      setCloneTitle('');
    }
  };

  const handleEditClick = (item: Item) => {
    setItemToEdit(item);
    setEditName('title' in item ? item.title : item.name);
    setShowEditModal(true);
  };

  const handleConfirmEdit = async () => {
    if (!itemToEdit || !editName.trim()) return;
    try {
      const token = getToken();
      if (!token) return;
      const isDocument = 'title' in itemToEdit;
      const url = isDocument
        ? `http://localhost:5000/api/documents/${itemToEdit._id}`
        : `http://localhost:5000/api/folders/${itemToEdit._id}`;

      if (isDocument) {
        const allDocsResponse = await fetch('http://localhost:5000/api/documents', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (allDocsResponse.ok) {
          const allDocsData = await allDocsResponse.json();
          const nameExists = allDocsData.documents.some(
            (doc: Document) => doc.title === editName && doc._id !== itemToEdit._id
          );
          
          if (nameExists) {
            setErrorMessage('A document with this name already exists.');
            setShowErrorModal(true);
            return;
          }
        }
      } else {
        const allFoldersResponse = await fetch('http://localhost:5000/api/folders', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (allFoldersResponse.ok) {
          const allFoldersData = await allFoldersResponse.json();
          const nameExists = allFoldersData.folders.some(
            (f: Folder) => f.name === editName && f._id !== itemToEdit._id && f.parent === (itemToEdit as Folder).parent
          );
          
          if (nameExists) {
            setErrorMessage('A folder with this name already exists in this location.');
            setShowErrorModal(true);
            return;
          }
        }
      }

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          [isDocument ? 'title' : 'name']: editName
        })
      });

      if (response.ok) {
        if (isDocument) {
          setDocuments(prev =>
            prev.map(doc =>
              doc._id === itemToEdit._id ? { ...doc, title: editName } : doc
            )
          );
        } else {
          setFolders(prev =>
            prev.map(f =>
              f._id === itemToEdit._id ? { ...f, name: editName } : f
            )
          );
        }
        
        setSuccessMessage(
          isDocument 
            ? `Document renamed to "${editName}" successfully!`
            : `Folder renamed to "${editName}" successfully!`
        );
        setShowSuccessModal(true);
        setShowEditModal(false);
        setItemToEdit(null);
        setEditName('');
      }
    } catch (err) {
      console.error('Failed to rename:', err);
      setErrorMessage('Failed to rename item');
      setShowErrorModal(true);
    }
  };

  const handleMoveClick = (item: Item) => {
    setSelectedItem(item);
    fetchAllFolders();
    setShowMoveModal(true);
  };

  const handleMoveToFolder = async (targetFolderId: string | null) => {
    if (!selectedItem) return;

    try {
      const token = getToken();
      const isDocument = 'title' in selectedItem;
      
      if (isDocument) {
        const url = `http://localhost:5000/api/documents/${selectedItem._id}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            folderId: targetFolderId
          })
        });

        if (response.ok) {
          fetchCurrentFolder();
          setShowMoveModal(false);
          setSelectedItem(null);
        }
      } else {
        const currentFolder = (selectedItem as Folder).parent;
        
        if (currentFolder === targetFolderId) {
          setShowMoveModal(false);
          setSelectedItem(null);
          return;
        }

        const url = `http://localhost:5000/api/folders/${selectedItem._id}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parentId: targetFolderId
          })
        });

        const data = await response.json();

        if (response.ok) {
          fetchCurrentFolder();
          setShowMoveModal(false);
          setSelectedItem(null);
        } else {
          alert(data.error || 'Failed to move folder');
        }
      }
    } catch (err) {
      console.error('Failed to move item:', err);
      alert('Failed to move item');
    }
  };

  const handleNewDocument = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/documents', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Untitled Document',
          content: '',
          folderId: currentFolderId
        })
      });

      if (response.ok) {
        const data = await response.json();
        navigate(`/document/${data.document._id}`);
      }
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  const handleNewFolderClick = () => {
    setNewFolderName('');
    setShowNewFolderModal(true);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/folders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId
        })
      });

      if (response.ok) {
        const data = await response.json();
        setFolders(prev => [...prev, data.folder]);
        setShowNewFolderModal(false);
        setNewFolderName('');
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  if (loading) {
    return (
      <div className={`dashboard-container ${darkMode ? 'dark' : ''}`}>
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${darkMode ? 'dark' : ''}`}>
      <div className="dashboard-content">
        {/* Dark Mode Toggle */}
        <div className="dashboard-header">
          <div className="header-title">
            <h1>My Documents</h1>
            <p>Manage and organize your documents</p>
          </div>
          <button className="theme-toggle"onClick={toggleDarkMode}title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>
        {/* Search and Actions */}
        <div className="dashboard-actions">
          <div className="search-wrapper">
            <Search className="search-icon" />
            <input type="text" placeholder="Search documents..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}/>
          </div>
          <div className="action-buttons">
            <button className="btn-action" onClick={handleNewDocument}>
              <FilePlus size={18} />New Document
            </button>
            <button className="btn-action" onClick={handleNewFolderClick}>
              <FolderPlus size={18} />New Folder
            </button>
          </div>
        </div>
        {/* Breadcrumb Navigation */}
        <div className="breadcrumb">
          <div className="breadcrumb-item" onClick={() => handleBreadcrumbClick(0)}>
            <Home size={16} />
            <span>My Drive</span>
          </div>
          {currentPath.slice(1).map((folder, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="breadcrumb-separator" size={16} />
              <div className={`breadcrumb-item ${index === currentPath.length - 2 ? 'active' : ''}`} onClick={() => handleBreadcrumbClick(index + 1)}>
                <Folder size={14} />
                <span>{folder}</span>
              </div>
            </React.Fragment>
          ))}
        </div>
         {/* Quick Access Folders - CHỈ CÒN TRASH VÀ SHARED */}
        <div className="quick-access">
          <h3>Quick Access</h3>
          <div className="folder-grid">
            {quickFolders.map(folder => (
              <div key={folder.id} className={`folder-item ${folder.colorClass} ${(showSharedOnly && folder.id === 'shared') ? 'active' : ''}`} onClick={() => handleQuickFolderClick(folder.id)}>
                {folder.icon}
                <div className="folder-info">
                  <div className="folder-name">{folder.name}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Error Message */}
        {error && (
          <div className="error-message" style={{ marginBottom: '1rem' }}>{error}</div>
        )}
        {/* Items Table */}
        <div className="documents-section">
          <div className="table-header">
            <div className="sortable-header" onClick={() => handleSort('name')}>Name
              <ArrowUpDown size={14} className={`sort-icon ${sortField === 'name' ? 'active' : ''}`} />
            </div>
            <div className="sortable-header" onClick={() => handleSort('createdAt')}>Created
              <ArrowUpDown size={14} className={`sort-icon ${sortField === 'createdAt' ? 'active' : ''}`} />
            </div>
            <div className="sortable-header" onClick={() => handleSort('updatedAt')}>Modified
              <ArrowUpDown size={14} className={`sort-icon ${sortField === 'updatedAt' ? 'active' : ''}`} />
            </div>
            <div>Actions</div>
          </div>
          {paginatedItems.map(item => {
            const isDocument = 'title' in item;
            const name = isDocument ? item.title : item.name;
            const permission = isDocument ? (item as Document).permission : undefined;
            return (
              <div key={item._id} className={`table-row ${!isDocument ? 'folder-row' : ''}`}>
                {/* Name */}
                <div className="cell" data-label="Name">
                  <div className="cell-name">
                    {!isDocument ? (
                      <Folder className="item-icon folder" onClick={() => handleFolderClick(item as Folder)} />
                    ) : (
                      <FileText className="item-icon file" onClick={() => handleDocumentClick(item as Document)} />
                    )}
                    <span className="item-name" onClick={() => !isDocument
                        ? handleFolderClick(item as Folder)
                        : handleDocumentClick(item as Document)
                      }>{name}
                    </span>
                    {/* Badge shared documents */}
                    {showSharedOnly && (item as any).shareType && (
                      <span className={`share-badge ${(item as any).shareType}`}>
                        {(item as any).shareType === 'received' 
                          ? `Received from ${(item as any).sharedBy?.name || 'Unknown'}`
                          : `Sent to ${(item as any).sharedWith?.length || 0} user${(item as any).sharedWith?.length !== 1 ? 's' : ''}`
                        }
                      </span>
                    )}
                    {permission && permission !== 'edit' && (
                      <span className={`permission-badge ${permission}`}>
                        {permission === 'view' ? <Eye size={14} /> : <Edit3 size={14} />}
                        {permission}
                      </span>
                    )}
                  </div>
                </div>
                {/* Created */}
                <div className="cell" data-label="Created">
                  <div className="item-meta">
                    <span className="item-date">{formatDate(item.createdAt)}</span>
                  </div>
                </div>
                {/* Modified */}
                <div className="cell" data-label="Modified">
                  <div className="item-meta">
                    <span className="item-date">{formatDate(item.updatedAt)}</span>
                  </div>
                </div>
                {/* Actions */}
                <div className="cell action-cell" data-label="Actions">
                  {isDocument && (
                    <><button className="icon-btn" onClick={() => handleDownloadPDF(item as Document)} title="Download PDF">
                        <Download size={18} />
                      </button>
                      <button className="icon-btn" onClick={() => handleExportPPT(item as Document)} title="Export to PowerPoint">
                        <Presentation size={18} />
                      </button>
                      {(!permission || permission === 'edit') && (
                        <button className="icon-btn" onClick={() => handleCloneClick(item as Document)} title="Clone">
                          <FilePlus size={18} />
                        </button>
                      )}
                    </>
                  )}
                  {(!permission || permission === 'edit') && (
                    <button className="icon-btn" onClick={() => handleEditClick(item)} title="Edit">
                      <Edit size={18} />
                    </button>
                  )}
                  <button className="icon-btn" onClick={() => handleMoveClick(item)} title="Move to folder">
                    <MoveRight size={18} />
                  </button>
                  {(!permission || permission === 'edit') && (
                    <button className="icon-btn delete" onClick={() => handleDeleteClick(item)} title="Delete">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {/* Pagination */}
          {sortedItems.length > 0 && (
            <div className="pagination">
              <div className="pagination-info">
                Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
                {Math.min(currentPage * itemsPerPage, sortedItems.length)} of{' '}
                {sortedItems.length} items
              </div>
              <div className="pagination-controls">
                <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button key={page} className={`pagination-btn ${currentPage === page ? 'active' : ''}`} onClick={() => setCurrentPage(page)}>
                    {page}
                  </button>
                ))}
                <button className="pagination-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>
                  <ChevronRightIcon size={16} />
                </button>
              </div>
            </div>
          )}
          {sortedItems.length === 0 && !loading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#999' }}>No items found. Create a new document or folder to get started.</div>
          )}
        </div>
      </div>
      {/*modal*/}
      {showEditModal && itemToEdit && (
        <div className="modal-overlay">
          <div className={`modal-content ${darkMode ? 'dark' : ''}`}>
            <div className="modal-header">
              <h2>Rename {('title' in itemToEdit ? 'Document' : 'Folder')}</h2>
              <button 
                className="modal-close"
                onClick={() => { setShowEditModal(false); setItemToEdit(null); setEditName('');}}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Rename <strong>{('title' in itemToEdit ? itemToEdit.title : itemToEdit.name)}</strong></p>
              <div className="form-group">
                <label htmlFor="editName">New Name</label>
                <input type="text" id="editName" className="modal-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter new name" autoFocus/>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => { setShowEditModal(false); setItemToEdit(null); setEditName('');}}>Cancel
              </button>
              <button className="btn-confirm"onClick={handleConfirmEdit}disabled={!editName.trim() || editName === ('title' in itemToEdit ? itemToEdit.title : itemToEdit.name)}>Rename</button>
            </div>
          </div>
        </div>
      )}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className={`modal-content success-modal ${darkMode ? 'dark' : ''}`}>
            <div className="modal-header">
              <h2>Success!</h2>
              <button className="modal-close"onClick={() => setShowSuccessModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="success-icon">✓</div>
              <p className="success-text">{successMessage}</p>
              {clonedItemName && (
                <div className="cloned-item-info">
                  <strong>Cloned Item:</strong> {clonedItemName}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-confirm" onClick={() => setShowSuccessModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
      {showErrorModal && (
        <div className="modal-overlay">
          <div className={`modal-content error-modal ${darkMode ? 'dark' : ''}`}>
            <div className="modal-header">
              <h2>Error</h2>
              <button className="modal-close" onClick={() => setShowErrorModal(false)}><X size={20} /></button>
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
      {showCloneModal && itemToClone && (
        <div className="modal-overlay">
          <div className={`modal-content ${darkMode ? 'dark' : ''}`}>
            <div className="modal-header">
              <h2>Clone Document</h2>
              <button 
                className="modal-close"
                onClick={() => { setShowCloneModal(false); setItemToClone(null); setCloneTitle('');}}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Create a copy of <strong>{itemToClone.title}</strong></p>
              <div className="form-group">
                <label htmlFor="cloneTitle">New Document Name</label>
                <input type="text" id="cloneTitle" className="modal-input" value={cloneTitle} onChange={(e) => setCloneTitle(e.target.value)} placeholder="Enter document name" autoFocus />
              </div>
            </div>
            <div className="modal-actions">
              <button 
                className="btn-cancel"
                onClick={() => { setShowCloneModal(false); setItemToClone(null); setCloneTitle('');}}>Cancel
              </button>
              <button className="btn-confirm" onClick={handleConfirmClone} disabled={!cloneTitle.trim()}>Clone Document</button>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && itemToDelete && (
        <div className="modal-overlay">
          <div className={`modal-content ${darkMode ? 'dark' : ''}`}>
            <div className="modal-header">
              <h2>Move to Trash</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to move <strong>{('title' in itemToDelete ? itemToDelete.title : itemToDelete.name)}</strong> to trash?</p>
              <p className="warning-text">Items in trash can be restored later or permanently deleted.</p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button  className="btn-confirm delete" onClick={handleConfirmDelete}>Move to Trash</button>
            </div>
          </div>
        </div>
      )}
      {showMoveModal && selectedItem && (
        <div className="modal-overlay">
          <div className={`modal-content ${darkMode ? 'dark' : ''}`}>
            <div className="modal-header">
              <h2>Move to Folder</h2>
              <button className="modal-close"onClick={() => setShowMoveModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Select destination folder:</p>
              <div className="folder-list">
                <div className={`folder-list-item ${(selectedItem as any).folder === null ? 'active' : ''}`} onClick={() => handleMoveToFolder(null)}>
                  <Home size={16} />
                  <span>My Drive (Root)</span>
                </div>
                {allFolders
                  .filter(f => f._id !== ('_id' in selectedItem ? selectedItem._id : ''))
                  .map(folder => (
                    <div key={folder._id} className={`folder-list-item ${(selectedItem as any).folder === null ? 'active' : ''}`} onClick={() => handleMoveToFolder(folder._id)}>
                      <Folder size={16} />
                      <span>{folder.name}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="modal-actions">
              <button  className="btn-cancel" onClick={() => setShowMoveModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showNewFolderModal && (
        <div className="modal-overlay">
          <div className={`modal-content ${darkMode ? 'dark' : ''}`}>
            <div className="modal-header">
              <h2>Create New Folder</h2>
              <button className="modal-close"onClick={() => setShowNewFolderModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="folderName">Folder Name</label>
                <input type="text" id="folderName" className="modal-input" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Enter folder name" autoFocus/>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowNewFolderModal(false)}>Cancel</button>
              <button  className="btn-confirm" onClick={handleCreateFolder}  disabled={!newFolderName.trim()}>  Create Folder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;