import React, { useState, useCallback, useRef } from 'react';
import { 
  VscFile, VscFolder, VscFolderOpened, VscNewFile, VscNewFolder,
  VscTrash, VscEdit, VscCloudUpload, VscChevronRight, VscChevronDown,
  VscRefresh
} from 'react-icons/vsc';
import { toast } from 'react-toastify';
import './FileExplorer.css';

// Context Menu Component
const ContextMenu = ({ x, y, onClose, options }) => {
  return (
    <div 
      className="context-menu"
      style={{ 
        position: 'fixed', 
        top: y, 
        left: x, 
        zIndex: 10000,
        background: '#252526',
        border: '1px solid #464647',
        borderRadius: '4px',
        padding: '4px 0',
        minWidth: '180px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}
      onClick={onClose}
    >
      {options.map((option, index) => (
        <div
          key={index}
          className={`context-menu-item ${option.danger ? 'delete' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            option.action();
            onClose();
          }}
          style={{
            padding: '8px 16px',
            cursor: 'pointer',
            color: option.danger ? '#f48771' : '#cccccc',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = option.danger ? '#5a1d1d' : '#2a2d2e'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          {option.icon}
          {option.label}
        </div>
      ))}
    </div>
  );
};

const getFileIcon = (fileName, isFolder = false) => {
  if (isFolder) {
    return <VscFolder style={{ color: '#dcdcaa' }} />;
  }
  
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconMap = {
    'js': <span style={{ color: '#f7df1e' }}>🟨</span>, 
    'jsx': <span style={{ color: '#61dafb' }}>⚛️</span>, 
    'ts': <span style={{ color: '#007acc' }}>🔷</span>, 
    'tsx': <span style={{ color: '#007acc' }}>⚛️</span>,
    'py': <span style={{ color: '#3776ab' }}>🐍</span>, 
    'java': <span style={{ color: '#f89820' }}>☕</span>, 
    'c': <span style={{ color: '#a8b9cc' }}>©️</span>, 
    'cpp': <span style={{ color: '#00599c' }}>🔧</span>,
    'css': <span style={{ color: '#264de4' }}>🎨</span>, 
    'html': <span style={{ color: '#e34f26' }}>🌐</span>, 
    'json': <span style={{ color: '#000000' }}>📋</span>, 
    'md': <span style={{ color: '#000000' }}>📝</span>,
    'txt': <span style={{ color: '#cccccc' }}>📄</span>, 
    'yml': <span style={{ color: '#ff6600' }}>⚙️</span>, 
    'yaml': <span style={{ color: '#ff6600' }}>⚙️</span>, 
    'xml': <span style={{ color: '#ff6600' }}>📊</span>
  };
  return iconMap[ext] || <VscFile style={{ color: '#cccccc' }} />;
};

const FileItem = ({ 
  item, 
  level = 0, 
  onFileClick, 
  onToggleFolder, 
  activeFile,
  onContextMenu
}) => {
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, item);
  };

  return (
    <div 
      className={`file-item ${item.type === 'file' && activeFile === item.path ? 'active' : ''}`}
      style={{ paddingLeft: `${level * 16 + 8}px` }}
      onClick={(e) => {
        e.stopPropagation();
        if (item.type === 'file') {
          onFileClick(item);
        } else {
          onToggleFolder(item.path);
        }
      }}
      onContextMenu={handleContextMenu}
    >
      <div className="file-item-content">
        {item.type === 'folder' && (
          <span className="folder-toggle">
            {item.isExpanded ? <VscChevronDown /> : <VscChevronRight />}
          </span>
        )}
        
        <span className="file-icon">
          {item.type === 'folder' ? 
            (item.isExpanded ? <VscFolderOpened style={{ color: '#dcdcaa' }} /> : <VscFolder style={{ color: '#dcdcaa' }} />) : 
            getFileIcon(item.name)
          }
        </span>
        
        <span className="file-name" style={{ 
          fontWeight: activeFile === item.path ? 'bold' : 'normal',
          color: activeFile === item.path ? '#fff' : 'inherit'
        }}>
          {item.name}
        </span>
        
        <span className="file-actions">
          <span 
            onClick={(e) => {
              e.stopPropagation();
              handleContextMenu(e);
            }}
            className="action-icon"
            style={{ cursor: 'pointer', padding: '0 5px' }}
          >
            ⋮
          </span>
        </span>
      </div>
      
      {/* Render children if folder is expanded */}
      {item.type === 'folder' && item.isExpanded && item.children && (
        <div className="folder-children">
          {item.children.map((child, index) => (
            <FileItem
              key={child.path || index}
              item={child}
              level={level + 1}
              onFileClick={onFileClick}
              onToggleFolder={onToggleFolder}
              activeFile={activeFile}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileExplorer = ({ 
  fileStructure = [], 
  projectName = 'No Project', 
  activeFile,
  onFileSelect,
  onFileStructureUpload,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
  onToggleFolder,
  onRefresh,
  isLoading = false,
  localSyncPath
}) => {
  const [uploadingFolder, setUploadingFolder] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const fileInputRef = useRef(null);

  const handleContextMenu = (e, item) => {
    const options = [];
    
    if (item.type === 'folder') {
      options.push(
        { label: 'New File', icon: <VscNewFile />, action: () => handleCreateFile(item.path) },
        { label: 'New Folder', icon: <VscNewFolder />, action: () => handleCreateFolder(item.path) },
        { label: 'Rename', icon: <VscEdit />, action: () => handleRename(item) },
        { label: 'Delete', icon: <VscTrash />, action: () => handleDelete(item), danger: true }
      );
    } else {
      options.push(
        { label: 'Rename', icon: <VscEdit />, action: () => handleRename(item) },
        { label: 'Delete', icon: <VscTrash />, action: () => handleDelete(item), danger: true }
      );
    }
    
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      options
    });
  };

  const handleCreateFile = (parentPath) => {
    const fileName = prompt('Enter file name (e.g., index.js):');
    if (fileName && onCreateFile) {
      onCreateFile(parentPath, fileName);
    }
  };

  const handleCreateFolder = (parentPath) => {
    const folderName = prompt('Enter folder name:');
    if (folderName && onCreateFolder) {
      onCreateFolder(parentPath, folderName);
    }
  };

  const handleRename = (item) => {
    const newName = prompt(`Rename ${item.type}:`, item.name);
    if (newName && newName !== item.name && onRenameFile) {
      onRenameFile(item.path, newName);
    }
  };

  const handleDelete = (item) => {
    if (confirm(`Are you sure you want to delete ${item.name}?`)) {
      if (onDeleteFile) {
        onDeleteFile(item.path);
      }
    }
  };

  // Close context menu when clicking outside
  const handleBackgroundClick = () => {
    setContextMenu(null);
  };

  const handleFolderUpload = useCallback(async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    setUploadingFolder(true);
    
    try {
      const formData = new FormData();
      
      files.forEach((file) => {
        formData.append('files', file);
      });
      
      const firstFile = files[0];
      const pathParts = firstFile.webkitRelativePath.split('/');
      const projectName = pathParts[0] || 'Uploaded Project';
      
      await onFileStructureUpload(formData, projectName);
      
      // Call onRefresh if available to update the file structure
      if (onRefresh) {
        onRefresh();
      }
      
      toast.success(`Successfully uploaded ${files.length} files from "${projectName}"`);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload folder');
    } finally {
      setUploadingFolder(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onFileStructureUpload, onRefresh]);

  return (
    <div className="file-explorer" onClick={handleBackgroundClick}>
      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          options={contextMenu.options}
          onClose={() => setContextMenu(null)}
        />
      )}
      
      <div className="file-explorer-header">
        <div className="project-info">
          <span className="project-name">{projectName}</span>
          {/* Show local sync path status */}
          {localSyncPath && (
            <div className="local-sync-info" title={`Files will sync to: ${localSyncPath}`}>
              <span className="sync-indicator">🔁</span>
              <span className="sync-path">{localSyncPath}</span>
            </div>
          )}
        </div>
        
        <div className="explorer-actions">
          <button 
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCreateFile('');
            }}
            title="New File"
          >
            <VscNewFile />
          </button>
          <button 
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleCreateFolder('');
            }}
            title="New Folder"
          >
            <VscNewFolder />
          </button>
          <button 
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={uploadingFolder}
            title="Upload Folder"
          >
            {uploadingFolder ? <div className="spinner" /> : <VscCloudUpload />}
          </button>
          <button 
            className="action-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onRefresh) onRefresh();
            }}
            title="Refresh"
          >
            <VscRefresh />
          </button>
        </div>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        webkitdirectory=""
        multiple
        onChange={handleFolderUpload}
        style={{ display: 'none' }}
      />
      
      <div className="file-tree">
        {fileStructure.length === 0 ? (
          <div className="empty-state">
            <p>No files uploaded</p>
            <button 
              className="upload-folder-btn"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFolder}
            >
              {uploadingFolder ? 'Uploading...' : 'Upload Folder'}
            </button>
          </div>
        ) : (
          fileStructure.map((item, index) => (
            <FileItem
              key={item.path || index}
              item={item}
              level={0}
              onFileClick={onFileSelect}
              onToggleFolder={onToggleFolder}
              activeFile={activeFile}
              onContextMenu={handleContextMenu}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default FileExplorer;