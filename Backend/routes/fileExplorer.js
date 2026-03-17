const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const Project = require('../models/Project');

const router = express.Router();

// This will be set when the module is initialized with io
let socketIO = null;

// Store project folder mappings in memory
const projectPaths = {};

// Store user local directory mappings
const userLocalPaths = {};

// Helper function to get project path
const getProjectPath = (roomId) => {
  if (!projectPaths[roomId]) {
    const uploadDir = path.join(__dirname, '../uploads', roomId);
    projectPaths[roomId] = uploadDir;
  }
  return projectPaths[roomId];
};

// Helper function to get user local path
const getUserLocalPath = (roomId) => {
  return userLocalPaths[roomId] || null;
};

// Helper function to set user local path
const setUserLocalPath = (roomId, localPath) => {
  userLocalPaths[roomId] = localPath;
};

// Configure multer for file uploads - USE MEMORY STORAGE for better performance
const storage = multer.memoryStorage();

// Optimize multer configuration for better upload performance
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file (reduce from 50MB for better performance)
    files: 100 // Max 100 files per upload (reduce from 500 for better performance)
  },
  fileFilter: (req, file, cb) => {
    // Allow all files for now - we'll handle validation later
    console.log(`Filtering file: ${file.originalname}, mimetype: ${file.mimetype}`);
    cb(null, true);
  }
});

// Helper function to build file tree from uploaded files - OPTIMIZED VERSION
const buildFileTree = async (files, uploadDir, roomId) => {
  const fileTree = [];
  const fileMap = new Map();

  console.log(`Building file tree for room ${roomId} in directory: ${uploadDir}`);
  console.log(`Number of files to process: ${files.length}`);

  // Process each uploaded file
  for (const file of files) {
    const relativePath = file.originalname;
    const pathParts = relativePath.split(path.sep);

    console.log(`\n--- Processing file ---`);
    console.log(`Relative path: ${relativePath}`);
    console.log(`Path parts:`, pathParts);
    console.log(`File object size: ${file.size}`);
    console.log(`File object buffer exists: ${!!file.buffer}`);
    console.log(`File object buffer length: ${file.buffer?.length || 0}`);

    // Read the actual uploaded file content - prioritize the buffer from multer
    let content = '';

    // First, try to get content from the file buffer (multer provides this)
    if (file.buffer && file.buffer.length > 0) {
      try {
        content = file.buffer.toString('utf-8');
        console.log(`Successfully read content from file buffer, length: ${content.length}`);
      } catch (bufferError) {
        console.log(`Error reading from buffer:`, bufferError.message);
        content = `Binary file (${file.size} bytes)`;
      }
    } else {
      // If no buffer, this shouldn't happen with memory storage, but just in case
      console.log(`No buffer available, this shouldn't happen with memory storage`);
      content = '// File not found';
    }

    console.log(`Final content length: ${content.length} for ${relativePath}`);

    // Create file item
    const fileItem = {
      name: pathParts[pathParts.length - 1],
      path: relativePath.replace(/\\/g, '/'), // Normalize path separators
      type: 'file',
      content,
      size: file.size,
      lastModified: new Date(),
      children: []
    };

    fileMap.set(relativePath, fileItem);
    console.log(`Created file item:`, fileItem);

    // Create folder structure
    let currentPath = '';
    let currentLevel = fileTree;

    for (let i = 0; i < pathParts.length - 1; i++) {
      currentPath += (currentPath ? '/' : '') + pathParts[i];
      console.log(`Processing folder level ${i}: ${currentPath}`);

      let folder = currentLevel.find(item => item.name === pathParts[i] && item.type === 'folder');
      if (!folder) {
        folder = {
          name: pathParts[i],
          path: currentPath,
          type: 'folder',
          content: '',
          size: 0,
          lastModified: new Date(),
          children: [],
          isExpanded: false
        };
        currentLevel.push(folder);
        fileMap.set(currentPath, folder);
        console.log(`Created new folder:`, folder);
      } else {
        console.log(`Found existing folder:`, folder);
      }
      currentLevel = folder.children;
    }

    // Add file to its parent folder
    currentLevel.push(fileItem);
    console.log(`Added file to parent folder`);

    // Also ensure the file is properly saved to disk with its content
    try {
      const fileSavePath = path.join(uploadDir, relativePath);
      await fs.ensureDir(path.dirname(fileSavePath));
      await fs.writeFile(fileSavePath, content, 'utf-8');
      console.log(`Ensured file is saved at: ${fileSavePath}`);
    } catch (saveError) {
      console.error(`Error ensuring file is saved at ${relativePath}:`, saveError);
    }
  }

  console.log(`\nFinal file tree structure built successfully`);
  return fileTree;
};

// Upload folder endpoint - OPTIMIZED VERSION
router.post('/upload-folder', upload.array('files'), async (req, res) => {
  try {
    const { roomId, projectName = 'Uploaded Project', uploadedBy = 'Unknown', localPath } = req.body;

    console.log('\n=== UPLOAD FOLDER REQUEST ===');
    console.log('Room ID:', roomId);
    console.log('Project Name:', projectName);
    console.log('Uploaded By:', uploadedBy);
    console.log('Files received:', req.files?.length || 0);

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    // Store the user's local path if provided
    if (localPath) {
      setUserLocalPath(roomId, localPath);
    }

    if (!req.files || req.files.length === 0) {
      console.log('No files received in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Validate file limits
    if (req.files.length > 100) {
      return res.status(400).json({ error: 'Too many files. Maximum 100 files allowed per upload.' });
    }

    const uploadDir = getProjectPath(roomId);
    console.log(`Project will be uploaded to: ${uploadDir}`);

    // Ensure upload directory exists
    await fs.ensureDir(uploadDir);

    // Build file tree structure
    console.log('Building file tree structure...');
    const fileStructure = await buildFileTree(req.files, uploadDir, roomId);
    console.log('File tree structure built successfully');

    // Save or update project in database
    console.log('Saving project to database...');
    let project = await Project.findOne({ roomId });

    if (project) {
      // Update existing project
      project.fileStructure = fileStructure;
      project.projectName = projectName;
      project.uploadedBy = uploadedBy;
      project.lastModified = new Date();
      console.log(`Updating existing project for room: ${roomId}`);
    } else {
      // Create new project
      project = new Project({
        roomId,
        projectName,
        fileStructure,
        uploadedBy,
        uploadedAt: new Date()
      });
      console.log(`Creating new project for room: ${roomId}`);
    }

    await project.save();
    console.log(`Project saved successfully for room: ${roomId}`);

    // Send immediate response to improve perceived performance
    res.status(200).json({
      success: true,
      message: 'Folder uploaded successfully',
      project: {
        roomId: project.roomId,
        projectName: project.projectName,
        fileStructure: project.fileStructure,
        uploadedBy: project.uploadedBy,
        uploadedAt: project.uploadedAt
      }
    });

  } catch (error) {
    console.error('Upload folder error:', error);
    res.status(500).json({ error: 'Failed to upload folder: ' + error.message });
  }
});

// Get project file structure
router.get('/project/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    console.log(`Fetching project for room: ${roomId}`);
    const project = await Project.findOne({ roomId });

    if (!project) {
      console.log(`No project found for room: ${roomId}`);
      return res.json({
        success: true,
        project: null,
        message: 'No project found for this room'
      });
    }

    console.log(`Project found for room: ${roomId}`, {
      projectName: project.projectName,
      fileCount: project.fileStructure ? project.fileStructure.length : 0
    });

    res.json({
      success: true,
      project: {
        roomId: project.roomId,
        projectName: project.projectName,
        fileStructure: project.fileStructure,
        activeFile: project.activeFile,
        uploadedBy: project.uploadedBy,
        uploadedAt: project.uploadedAt,
        lastModified: project.lastModified
      }
    });

  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// Get file content directly from file system (for real-time editing)
router.post('/file-content', async (req, res) => {
  try {
    const { roomId, filePath } = req.body;
    if (!roomId || !filePath) {
      return res.status(400).json({ error: 'Room ID and file path are required' });
    }

    console.log(`\n=== FILE CONTENT REQUEST ===`);
    console.log(`Room ID: ${roomId}`);
    console.log(`Original file path: ${filePath}`);

    // Normalize incoming path to use forward slashes and remove duplicate slashes
    const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '');
    console.log(`Normalized file path: ${normalizedFilePath}`);

    // Get the project path for this room
    const projectPath = getProjectPath(roomId);
    console.log(`Project path: ${projectPath}`);

    // Helper: recursive search for a matching path or filename inside projectPath
    const findFileRecursively = async (baseDir, targetRelPath) => {
      // Try exact resolve first
      const candidate = path.resolve(baseDir, targetRelPath);
      if (await fs.pathExists(candidate)) return candidate;

      // Try searching for a file with same relative tail (e.g. "src/index.js")
      const tailParts = targetRelPath.split('/');
      const tail = tailParts.slice(-3).join('/'); // try last up-to-3 parts
      let found = null;

      const walk = async (dir) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (found) return;
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(full);
          } else {
            const rel = path.relative(baseDir, full).replace(/\\/g, '/');
            if (rel === targetRelPath || rel.endsWith(tail) || entry.name === path.basename(targetRelPath)) {
              found = full;
              return;
            }
          }
        }
      };

      try {
        await walk(baseDir);
      } catch (err) {
        console.warn('Error during recursive search:', err);
      }
      return found;
    };

    // Resolve file path robustly
    // 1) direct resolve with normalized path
    // 2) try projectPath + normalizedFilePath
    // 3) fallback to recursive search inside projectPath
    let fullPath = path.resolve(projectPath, ...normalizedFilePath.split('/'));
    console.log(`Trying direct fullPath: ${fullPath}`);

    if (!await fs.pathExists(fullPath)) {
      // try alternative simple join (handles edge cases)
      const alt = path.resolve(projectPath, normalizedFilePath);
      console.log(`Direct not found. Trying alt: ${alt}`);
      if (await fs.pathExists(alt)) {
        fullPath = alt;
      } else {
        // Fallback recursive search
        console.log('Direct and alt not found. Starting recursive search inside projectPath...');
        const found = await findFileRecursively(projectPath, normalizedFilePath);
        if (found) {
          fullPath = found;
          console.log(`Found file via recursive search: ${fullPath}`);
        } else {
          console.warn(`File not found after searching: ${normalizedFilePath}`);
          // If not found, respond with placeholder content (keeps previous behavior)
          return res.json({ content: '// File not found' });
        }
      }
    }

    // Read file safely (limit size etc. as before)
    const stats = await fs.stat(fullPath);
    let content = '';
    if (stats.size === 0) {
      content = '// Empty file';
    } else if (stats.size > 5 * 1024 * 1024) {
      content = `Large file (${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB) - too large to display`;
    } else {
      // Try to read as utf-8
      try {
        content = await fs.readFile(fullPath, 'utf-8');
        // If binary detection needed:
        if (content.includes('\0')) {
          content = `Binary file (${stats.size} bytes)`;
        }
      } catch (readErr) {
        console.warn(`Error reading file ${fullPath}:`, readErr.message);
        content = `// Error reading file`;
      }
    }

    console.log(`Returning content for: ${fullPath} (length: ${content.length})`);
    res.json({ content });

  } catch (error) {
    console.error('File content error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Auto-save file content to disk (like VSCode)
router.post('/save-file', async (req, res) => {
  try {
    const { roomId, filePath, content, localPath } = req.body;

    if (!roomId || !filePath || content === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Store the user's local path if provided
    if (localPath) {
      setUserLocalPath(roomId, localPath);
    }

    console.log(`\n=== AUTO-SAVE REQUEST ===`);
    console.log(`Room: ${roomId}, File: ${filePath}, Content length: ${content.length}`);

    // Get the project path for this room
    const projectPath = getProjectPath(roomId);
    const targetPath = path.join(projectPath, filePath);

    // Ensure the directory exists
    await fs.ensureDir(path.dirname(targetPath));

    // Write content to disk
    await fs.writeFile(targetPath, content, 'utf-8');

    console.log(`File saved to: ${targetPath}`);

    // Also save to user's local directory if specified
    const userLocalDir = getUserLocalPath(roomId);
    if (userLocalDir) {
      try {
        const userTargetPath = path.join(userLocalDir, filePath);
        await fs.ensureDir(path.dirname(userTargetPath));
        await fs.writeFile(userTargetPath, content, 'utf-8');
        console.log(`File also saved to user's local directory: ${userTargetPath}`);
      } catch (localError) {
        console.error('Error saving to user local directory:', localError);
        // Don't fail the request if local save fails, just log it
      }
    }

    console.log(`=== SAVE SUCCESS ===`);

    // Update the project in the database
    const project = await Project.findOne({ roomId });
    if (project) {
      // Find and update the file in the file structure
      const updateFileInStructure = (items) => {
        return items.map(item => {
          if (item.type === 'file' && item.path === filePath) {
            return { ...item, content, lastModified: new Date() };
          }
          if (item.children) {
            return { ...item, children: updateFileInStructure(item.children) };
          }
          return item;
        });
      };

      project.fileStructure = updateFileInStructure(project.fileStructure);
      project.lastModified = new Date();

      // Also update the content in the project's file structure
      const updateFileContent = (items) => {
        return items.map(item => {
          if (item.type === 'file' && item.path === filePath) {
            return { ...item, content, lastModified: new Date() };
          }
          if (item.children) {
            return { ...item, children: updateFileContent(item.children) };
          }
          return item;
        });
      };

      project.fileStructure = updateFileContent(project.fileStructure);
      await project.save();
    }

    res.json({
      success: true,
      message: 'File saved to disk and database updated',
      savedPaths: {
        server: targetPath,
        local: userLocalDir ? path.join(userLocalDir, filePath) : null
      }
    });

  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Create new file or folder
router.post('/create-item', async (req, res) => {
  try {
    const { roomId, parentPath = '', name, type = 'file', content = '' } = req.body;

    if (!roomId || !name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`\n=== CREATE ITEM REQUEST ===`);
    console.log(`Room: ${roomId}, Type: ${type}, Name: ${name}, Parent: ${parentPath}`);

    // Get project base path
    const basePath = getProjectPath(roomId);
    await fs.ensureDir(basePath);

    // Construct new item path
    const newItemPath = path.join(basePath, parentPath, name);
    console.log(`Creating at: ${newItemPath}`);

    // Check if item already exists
    const exists = await fs.pathExists(newItemPath);
    if (exists) {
      return res.status(400).json({ error: `${type} already exists` });
    }

    // Create file or folder
    if (type === 'folder') {
      await fs.ensureDir(newItemPath);
      console.log(`Folder created: ${newItemPath}`);
    } else {
      // Create file with sample content based on extension
      const ext = path.extname(name).toLowerCase();
      const fileContent = content || getSampleContent(name, ext);
      await fs.writeFile(newItemPath, fileContent, 'utf-8');
      console.log(`File created: ${newItemPath}, size: ${fileContent.length} bytes`);
    }

    // Build relative path for response
    const relativePath = parentPath ? `${parentPath}/${name}` : name;

    // Update or create the project in the database
    let project = await Project.findOne({ roomId });

    const newItem = {
      name,
      path: relativePath,
      type,
      content: type === 'file' ? (content || getSampleContent(name, path.extname(name))) : '',
      size: type === 'file' ? (content || getSampleContent(name, path.extname(name))).length : 0,
      lastModified: new Date(),
      children: type === 'folder' ? [] : undefined,
      isExpanded: type === 'folder' ? false : undefined
    };

    if (project) {
      // Add the new item to the file structure
      if (parentPath) {
        // Find parent folder and add to its children
        const addToParent = (items) => {
          return items.map(item => {
            if (item.type === 'folder' && item.path === parentPath) {
              return { ...item, children: [...item.children, newItem] };
            }
            if (item.children) {
              return { ...item, children: addToParent(item.children) };
            }
            return item;
          });
        };

        project.fileStructure = addToParent(project.fileStructure);
      } else {
        // Add to root level
        project.fileStructure.push(newItem);
      }


      project.lastModified = new Date();
      await project.save();

      // Broadcast file structure update to all users in the room
      if (socketIO) {
        socketIO.to(roomId).emit('fileStructureUpdate', {
          roomId,
          fileStructure: project.fileStructure,
          projectName: project.projectName,
          activeFile: project.activeFile
        });
        console.log(`📡 Broadcasted fileStructureUpdate to room ${roomId}`);
      }
    } else {
      // Create new project if it doesn't exist
      project = new Project({
        roomId,
        projectName: `Room ${roomId}`,
        fileStructure: [newItem],
        uploadedBy: 'User',
        uploadedAt: new Date()
      });
      await project.save();
      console.log(`✨ Created new project for room ${roomId}`);

      // Broadcast file structure update to all users in the room
      if (socketIO) {
        socketIO.to(roomId).emit('fileStructureUpdate', {
          roomId,
          fileStructure: project.fileStructure,
          projectName: project.projectName,
          activeFile: project.activeFile
        });
        console.log(`📡 Broadcasted fileStructureUpdate to room ${roomId}`);
      }
    }

    console.log(`=== CREATE SUCCESS ===`);

    res.json({
      success: true,
      message: `${type} created successfully`,
      item: {
        name,
        path: relativePath,
        type,
        content: type === 'file' ? (content || getSampleContent(name, path.extname(name))) : '',
        size: type === 'file' ? (content || getSampleContent(name, path.extname(name))).length : 0,
        lastModified: new Date()
      }
    });

  } catch (error) {
    console.error('Create item error:', error);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

function getSampleContent(fileName, ext) {
  const baseName = path.basename(fileName, ext);

  switch (ext) {
    case '.py':
      return `# ${fileName}
print("Hello from ${baseName}!")

def main():
    print("Welcome to ${baseName}")
    return "Success"

if __name__ == "__main__":
    main()`;

    case '.cpp':
    case '.cc':
      return `// ${fileName}
#include <iostream>
using namespace std;

int main() {
    cout << "Hello from ${baseName}!" << endl;
    return 0;
}`;

    case '.java':
      return `// ${fileName}
public class ${baseName.charAt(0).toUpperCase() + baseName.slice(1)} {
    public static void main(String[] args) {
        System.out.println("Hello from ${baseName}!");
    }
}`;

    case '.js':
    case '.jsx':
      return `// ${fileName}
console.log("Hello from ${baseName}!");

function main() {
    console.log("Welcome to ${baseName}");
    return "Success";
}

main();`;

    case '.html':
      return `<!DOCTYPE html>
<html>
<head>
    <title>${baseName}</title>
</head>
<body>
    <h1>Hello from ${baseName}!</h1>
</body>
</html>`;

    case '.css':
      return `/* ${fileName} */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}

.container {
    max-width: 800px;
    margin: 0 auto;
}`;

    default:
      return `# ${fileName}

Welcome to ${baseName}!

This is sample content for your file.
Start editing to add your code.`;
  }
}

// Delete file or folder
router.delete('/delete-item', async (req, res) => {
  try {
    const { roomId, filePath } = req.body;

    if (!roomId || !filePath) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`\n=== DELETE ITEM REQUEST ===`);
    console.log(`Room: ${roomId}, Path: ${filePath}`);

    // Get project base path
    const basePath = getProjectPath(roomId);
    const itemPath = path.join(basePath, filePath);

    console.log(`Deleting: ${itemPath}`);

    // Check if item exists
    const exists = await fs.pathExists(itemPath);
    if (!exists) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Remove the item (file or folder)
    await fs.remove(itemPath);

    // Update the project in the database
    const project = await Project.findOne({ roomId });
    if (project) {
      // Remove the item from the file structure
      const removeFromStructure = (items) => {
        return items.filter(item => {
          if (item.path === filePath) {
            return false; // Remove this item
          }
          if (item.children) {
            item.children = removeFromStructure(item.children);
          }
          return true;
        });
      };

      project.fileStructure = removeFromStructure(project.fileStructure);
      project.lastModified = new Date();
      await project.save();
    }

    console.log(`=== DELETE SUCCESS ===`);

    res.json({
      success: true,
      message: 'Item deleted successfully'
    });

  } catch (error) {
    console.error('Delete item error:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Rename file or folder
router.put('/rename-item', async (req, res) => {
  try {
    const { roomId, oldPath, newName } = req.body;

    if (!roomId || !oldPath || !newName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`\n=== RENAME ITEM REQUEST ===`);
    console.log(`Room: ${roomId}, Old: ${oldPath}, New: ${newName}`);

    // Get project base path
    const basePath = getProjectPath(roomId);
    const oldItemPath = path.join(basePath, oldPath);

    // Build new path
    const parentDir = path.dirname(oldPath);
    const newPath = parentDir === '.' ? newName : path.join(parentDir, newName);
    const newItemPath = path.join(basePath, newPath);

    console.log(`Renaming: ${oldItemPath} -> ${newItemPath}`);

    // Check if old item exists
    const exists = await fs.pathExists(oldItemPath);
    if (!exists) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Check if new name already exists
    const newExists = await fs.pathExists(newItemPath);
    if (newExists) {
      return res.status(400).json({ error: 'An item with that name already exists' });
    }

    // Rename the item on disk
    await fs.move(oldItemPath, newItemPath);

    // Update the project in the database
    const project = await Project.findOne({ roomId });
    if (project) {
      // Update the item in the file structure
      const updateInStructure = (items) => {
        return items.map(item => {
          if (item.path === oldPath) {
            // Update this item
            const updatedItem = { ...item, name: newName, path: newPath };
            if (updatedItem.children) {
              // Update paths of all children recursively
              const updateChildrenPaths = (children, oldParentPath, newParentPath) => {
                return children.map(child => {
                  const updatedChildPath = child.path.replace(oldParentPath, newParentPath);
                  const updatedChild = { ...child, path: updatedChildPath };
                  if (updatedChild.children) {
                    updatedChild.children = updateChildrenPaths(updatedChild.children, oldParentPath, newParentPath);
                  }
                  return updatedChild;
                });
              };
              updatedItem.children = updateChildrenPaths(updatedItem.children, oldPath, newPath);
            }
            return updatedItem;
          }
          if (item.children) {
            return { ...item, children: updateInStructure(item.children) };
          }
          return item;
        });
      };

      project.fileStructure = updateInStructure(project.fileStructure);
      project.lastModified = new Date();
      await project.save();
    }

    console.log(`=== RENAME SUCCESS ===`);

    res.json({
      success: true,
      message: 'Item renamed successfully',
      newPath: newPath
    });

  } catch (error) {
    console.error('Rename item error:', error);
    res.status(500).json({ error: 'Failed to rename item' });
  }
});

// Toggle folder expansion state
router.post('/toggle-folder/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { folderPath, isExpanded } = req.body;

    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    const project = await Project.findOne({ roomId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Update the folder expansion state in the file structure
    const updateFolderExpansion = (items) => {
      return items.map(item => {
        if (item.type === 'folder' && item.path === folderPath) {
          return { ...item, isExpanded: isExpanded !== undefined ? isExpanded : !item.isExpanded };
        }
        if (item.children) {
          return { ...item, children: updateFolderExpansion(item.children) };
        }
        return item;
      });
    };

    project.fileStructure = updateFolderExpansion(project.fileStructure);
    project.lastModified = new Date();

    await project.save();

    res.json({
      success: true,
      message: 'Folder expansion state updated',
      fileStructure: project.fileStructure
    });

  } catch (error) {
    console.error('Toggle folder error:', error);
    res.status(500).json({ error: 'Failed to update folder expansion state' });
  }
});

router.post('/get-file/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { filePath } = req.body;

    const project = await Project.findOne({ roomId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const file = project.findFileByPath(filePath);
    if (!file || file.type !== 'file') {
      return res.status(404).json({ error: 'File not found' });
    }

    res.json({
      success: true,
      file: {
        name: file.name,
        path: file.path,
        content: file.content,
        size: file.size,
        lastModified: file.lastModified
      }
    });

  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// Update file content
router.put('/update-file/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { filePath, content } = req.body;

    const project = await Project.findOne({ roomId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const success = project.updateFileContent(filePath, content);
    if (!success) {
      return res.status(404).json({ error: 'File not found or is not a file' });
    }

    await project.save();

    res.json({
      success: true,
      message: 'File updated successfully'
    });

  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Create new file
router.post('/file/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, path: parentPath = '', content = '', type = 'file' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'File name is required' });
    }

    const project = await Project.findOne({ roomId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const newPath = parentPath ? `${parentPath}/${name}` : name;

    // Check if file already exists
    const existingFile = project.findFileByPath(newPath);
    if (existingFile) {
      return res.status(400).json({ error: 'File already exists' });
    }

    const newItem = {
      name,
      path: newPath,
      type,
      content: type === 'file' ? content : '',
      size: content.length,
      lastModified: new Date(),
      children: type === 'folder' ? [] : undefined,
      isExpanded: type === 'folder' ? false : undefined
    };

    const success = project.addFileItem(parentPath, newItem);
    if (!success) {
      return res.status(400).json({ error: 'Failed to create file' });
    }

    await project.save();

    res.json({
      success: true,
      message: `${type} created successfully`,
      item: newItem
    });

  } catch (error) {
    console.error('Create file error:', error);
    res.status(500).json({ error: 'Failed to create file' });
  }
});

// Delete file/folder
router.delete('/delete-file/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { filePath } = req.body;

    const project = await Project.findOne({ roomId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const success = project.deleteFileItem(filePath);
    if (!success) {
      return res.status(404).json({ error: 'File not found' });
    }

    await project.save();

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Set active file
router.post('/active-file/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { filePath } = req.body;

    const project = await Project.findOne({ roomId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    project.activeFile = filePath;
    await project.save();

    res.json({
      success: true,
      message: 'Active file updated'
    });

  } catch (error) {
    console.error('Set active file error:', error);
    res.status(500).json({ error: 'Failed to set active file' });
  }
});

// Set user local directory
router.post('/set-local-path/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { localPath } = req.body;

    if (!roomId || !localPath) {
      return res.status(400).json({ error: 'Room ID and local path are required' });
    }

    // Validate that the path exists
    const exists = await fs.pathExists(localPath);
    if (!exists) {
      return res.status(400).json({ error: 'Specified local path does not exist' });
    }

    // Store the user's local path
    setUserLocalPath(roomId, localPath);

    res.json({
      success: true,
      message: 'Local path set successfully',
      localPath: localPath
    });

  } catch (error) {
    console.error('Set local path error:', error);
    res.status(500).json({ error: 'Failed to set local path' });
  }
});

// Get user local directory
router.get('/get-local-path/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required' });
    }

    const localPath = getUserLocalPath(roomId);

    res.json({
      success: true,
      localPath: localPath
    });

  } catch (error) {
    console.error('Get local path error:', error);
    res.status(500).json({ error: 'Failed to get local path' });
  }
});

// Export a function that accepts Socket.IO instance
module.exports = (io) => {
  // Store the io instance
  socketIO = io;
  console.log('🔌 File Explorer routes initialized with Socket.IO');

  return router;
};