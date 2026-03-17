const mongoose = require('mongoose');

// Schema for individual file/folder items
const FileItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['file', 'folder'],
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  size: {
    type: Number,
    default: 0
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  children: [this], // For nested folder structure
  isExpanded: {
    type: Boolean,
    default: false
  }
});

// Main project schema for each room
const ProjectSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  projectName: {
    type: String,
    default: 'Untitled Project'
  },
  rootFolder: {
    type: FileItemSchema,
    default: null
  },
  fileStructure: [FileItemSchema],
  uploadedBy: {
    type: String,
    default: 'Unknown'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  activeFile: {
    type: String,
    default: null
  },
  settings: {
    allowFileOperations: {
      type: Boolean,
      default: true
    },
    allowFolderUpload: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Index for efficient querying
ProjectSchema.index({ roomId: 1 });

// Method to find file by path
ProjectSchema.methods.findFileByPath = function(path) {
  const findInStructure = (items, targetPath) => {
    for (let item of items) {
      if (item.path === targetPath) {
        return item;
      }
      if (item.type === 'folder' && item.children) {
        const found = findInStructure(item.children, targetPath);
        if (found) return found;
      }
    }
    return null;
  };
  
  return findInStructure(this.fileStructure, path);
};

// Method to update file content
ProjectSchema.methods.updateFileContent = function(path, content) {
  const file = this.findFileByPath(path);
  if (file && file.type === 'file') {
    file.content = content;
    file.lastModified = new Date();
    this.lastModified = new Date();
    return true;
  }
  return false;
};

// Method to add new file/folder
ProjectSchema.methods.addFileItem = function(parentPath, item) {
  const addToStructure = (items, targetPath, newItem) => {
    if (targetPath === '' || targetPath === '/') {
      items.push(newItem);
      return true;
    }
    
    for (let existingItem of items) {
      if (existingItem.path === targetPath && existingItem.type === 'folder') {
        if (!existingItem.children) existingItem.children = [];
        existingItem.children.push(newItem);
        return true;
      }
      if (existingItem.type === 'folder' && existingItem.children) {
        if (addToStructure(existingItem.children, targetPath, newItem)) {
          return true;
        }
      }
    }
    return false;
  };
  
  const success = addToStructure(this.fileStructure, parentPath, item);
  if (success) {
    this.lastModified = new Date();
  }
  return success;
};

// Method to delete file/folder
ProjectSchema.methods.deleteFileItem = function(path) {
  const deleteFromStructure = (items, targetPath) => {
    for (let i = 0; i < items.length; i++) {
      if (items[i].path === targetPath) {
        items.splice(i, 1);
        return true;
      }
      if (items[i].type === 'folder' && items[i].children) {
        if (deleteFromStructure(items[i].children, targetPath)) {
          return true;
        }
      }
    }
    return false;
  };
  
  const success = deleteFromStructure(this.fileStructure, path);
  if (success) {
    this.lastModified = new Date();
  }
  return success;
};

module.exports = mongoose.model('Project', ProjectSchema);