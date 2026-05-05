const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const mime = require('mime-types');
const Project = require('../models/Project');

const router = express.Router();

let socketIO = null;

const projectPaths = {};

const userLocalPaths = {};

const getProjectPath = (roomId) => {
  if (!projectPaths[roomId]) {
    const uploadDir = path.join(__dirname, '../uploads', roomId);
    projectPaths[roomId] = uploadDir;
  }
  return projectPaths[roomId];
};

const getUserLocalPath = (roomId) => {
  return userLocalPaths[roomId] || null;
};

const setUserLocalPath = (roomId, localPath) => {
  userLocalPaths[roomId] = localPath;
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, 
    files: 100 
  },
  fileFilter: (req, file, cb) => {
    console.log(`Filtering file: ${file.originalname}, mimetype: ${file.mimetype}`);
    cb(null, true);
  }
});

const buildFileTree = async (files, uploadDir, roomId) => {
  const fileTree = [];
  const fileMap = new Map();

  console.log(`Building file tree for room ${roomId} in directory: ${uploadDir}`);
  console.log(`Number of files to process: ${files.length}`);

  for (const file of files) {
    const relativePath = file.originalname;
    const pathParts = relativePath.split(path.sep);

    console.log(`\n--- Processing file ---`);
    console.log(`Relative path: ${relativePath}`);
    console.log(`Path parts:`, pathParts);
    console.log(`File object size: ${file.size}`);
    console.log(`File object buffer exists: ${!!file.buffer}`);
    console.log(`File object buffer length: ${file.buffer?.length || 0}`);

    let content = '';

    if (file.buffer && file.buffer.length > 0) {
      try {
        content = file.buffer.toString('utf-8');
        console.log(`Successfully read content from file buffer, length: ${content.length}`);
      } catch (bufferError) {
        console.log(`Error reading from buffer:`, bufferError.message);
        content = `Binary file (${file.size} bytes)`;
      }
    } else {
      console.log(`No buffer available, this shouldn't happen with memory storage`);
      content = '// File not found';
    }

    console.log(`Final content length: ${content.length} for ${relativePath}`);

    const fileItem = {
      name: pathParts[pathParts.length - 1],
      path: relativePath.replace(/\\/g, '/'), 
      content,
      size: file.size,
      lastModified: new Date(),
      children: []
    };

    fileMap.set(relativePath, fileItem);
    console.log(`Created file item:`, fileItem);

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

    currentLevel.push(fileItem);
    console.log(`Added file to parent folder`);

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

    if (localPath) {
      setUserLocalPath(roomId, localPath);
    }

    if (!req.files || req.files.length === 0) {
      console.log('No files received in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }

    if (req.files.length > 100) {
      return res.status(400).json({ error: 'Too many files. Maximum 100 files allowed per upload.' });
    }

    const uploadDir = getProjectPath(roomId);
    console.log(`Project will be uploaded to: ${uploadDir}`);

    await fs.ensureDir(uploadDir);

    console.log('Building file tree structure...');
    const fileStructure = await buildFileTree(req.files, uploadDir, roomId);
    console.log('File tree structure built successfully');

    console.log('Saving project to database...');
    let project = await Project.findOne({ roomId });

    if (project) {
      project.fileStructure = fileStructure;
      project.projectName = projectName;
      project.uploadedBy = uploadedBy;
      project.lastModified = new Date();
      console.log(`Updating existing project for room: ${roomId}`);
    } else {
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

router.post('/file-content', async (req, res) => {
  try {
    const { roomId, filePath } = req.body;
    if (!roomId || !filePath) {
      return res.status(400).json({ error: 'Room ID and file path are required' });
    }

    console.log(`\n=== FILE CONTENT REQUEST ===`);
    console.log(`Room ID: ${roomId}`);
    console.log(`Original file path: ${filePath}`);

    const normalizedFilePath = filePath.replace(/\\/g, '/').replace(/\/+/g, '/').replace(/^\.\//, '');
    console.log(`Normalized file path: ${normalizedFilePath}`);

    const projectPath = getProjectPath(roomId);
    console.log(`Project path: ${projectPath}`);

    const findFileRecursively = async (baseDir, targetRelPath) => {
      const candidate = path.resolve(baseDir, targetRelPath);
      if (await fs.pathExists(candidate)) return candidate;

      const tailParts = targetRelPath.split('/');
      const tail = tailParts.slice(-3).join('/');
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

    let fullPath = path.resolve(projectPath, ...normalizedFilePath.split('/'));
    console.log(`Trying direct fullPath: ${fullPath}`);

    if (!await fs.pathExists(fullPath)) {
      const alt = path.resolve(projectPath, normalizedFilePath);
      console.log(`Direct not found. Trying alt: ${alt}`);
      if (await fs.pathExists(alt)) {
        fullPath = alt;
      } else {
        console.log('Direct and alt not found. Starting recursive search inside projectPath...');
        const found = await findFileRecursively(projectPath, normalizedFilePath);
        if (found) {
          fullPath = found;
          console.log(`Found file via recursive search: ${fullPath}`);
        } else {
          console.warn(`File not found after searching: ${normalizedFilePath}`);
          return res.json({ content: '// File not found' });
        }
      }
    }

    const stats = await fs.stat(fullPath);
    let content = '';
    if (stats.size === 0) {
      content = '// Empty file';
    } else if (stats.size > 5 * 1024 * 1024) {
      content = `Large file (${Math.round(stats.size / 1024 / 1024 * 100) / 100} MB) - too large to display`;
    } else {
      try {
        content = await fs.readFile(fullPath, 'utf-8');
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

router.post('/save-file', async (req, res) => {
  try {
    const { roomId, filePath, content, localPath } = req.body;

    if (!roomId || !filePath || content === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (localPath) {
      setUserLocalPath(roomId, localPath);
    }

    console.log(`\n=== AUTO-SAVE REQUEST ===`);
    console.log(`Room: ${roomId}, File: ${filePath}, Content length: ${content.length}`);

    const projectPath = getProjectPath(roomId);
    const targetPath = path.join(projectPath, filePath);

    await fs.ensureDir(path.dirname(targetPath));

    await fs.writeFile(targetPath, content, 'utf-8');

    console.log(`File saved to: ${targetPath}`);

    const userLocalDir = getUserLocalPath(roomId);
    if (userLocalDir) {
      try {
        const userTargetPath = path.join(userLocalDir, filePath);
        await fs.ensureDir(path.dirname(userTargetPath));
        await fs.writeFile(userTargetPath, content, 'utf-8');
        console.log(`File also saved to user's local directory: ${userTargetPath}`);
      } catch (localError) {
        console.error('Error saving to user local directory:', localError);
      }
    }

    console.log(`=== SAVE SUCCESS ===`);

    const project = await Project.findOne({ roomId });
    if (project) {
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

router.post('/create-item', async (req, res) => {
  try {
    const { roomId, parentPath = '', name, type = 'file', content = '' } = req.body;

    if (!roomId || !name || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`\n=== CREATE ITEM REQUEST ===`);
    console.log(`Room: ${roomId}, Type: ${type}, Name: ${name}, Parent: ${parentPath}`);

    const basePath = getProjectPath(roomId);
    await fs.ensureDir(basePath);

    const newItemPath = path.join(basePath, parentPath, name);
    console.log(`Creating at: ${newItemPath}`);

    const exists = await fs.pathExists(newItemPath);
    if (exists) {
      return res.status(400).json({ error: `${type} already exists` });
    }

    if (type === 'folder') {
      await fs.ensureDir(newItemPath);
      console.log(`Folder created: ${newItemPath}`);
    } else {
      const ext = path.extname(name).toLowerCase();
      const fileContent = content || getSampleContent(name, ext);
      await fs.writeFile(newItemPath, fileContent, 'utf-8');
      console.log(`File created: ${newItemPath}, size: ${fileContent.length} bytes`);
    }

    const relativePath = parentPath ? `${parentPath}/${name}` : name;

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
      if (parentPath) {
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
        project.fileStructure.push(newItem);
      }


      project.lastModified = new Date();
      await project.save();

      if (socketIO) {
        socketIO.to(roomId).emit('fileStructureUpdate', {
          roomId,
          fileStructure: project.fileStructure,
          projectName: project.projectName,
          activeFile: project.activeFile
        });
        console.log(`Broadcasted fileStructureUpdate to room ${roomId}`);
      }
    } else {
      project = new Project({
        roomId,
        projectName: `Room ${roomId}`,
        fileStructure: [newItem],
        uploadedBy: 'User',
        uploadedAt: new Date()
      });
      await project.save();
      console.log(`✨ Created new project for room ${roomId}`);

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

router.delete('/delete-item', async (req, res) => {
  try {
    const { roomId, filePath } = req.body;

    if (!roomId || !filePath) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`\n=== DELETE ITEM REQUEST ===`);
    console.log(`Room: ${roomId}, Path: ${filePath}`);

    const basePath = getProjectPath(roomId);
    const itemPath = path.join(basePath, filePath);

    console.log(`Deleting: ${itemPath}`);

    const exists = await fs.pathExists(itemPath);
    if (!exists) {
      return res.status(404).json({ error: 'Item not found' });
    }

    await fs.remove(itemPath);

    const project = await Project.findOne({ roomId });
    if (project) {
      const removeFromStructure = (items) => {
        return items.filter(item => {
          if (item.path === filePath) {
            return false; 
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

router.put('/rename-item', async (req, res) => {
  try {
    const { roomId, oldPath, newName } = req.body;

    if (!roomId || !oldPath || !newName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`\n=== RENAME ITEM REQUEST ===`);
    console.log(`Room: ${roomId}, Old: ${oldPath}, New: ${newName}`);

    const basePath = getProjectPath(roomId);
    const oldItemPath = path.join(basePath, oldPath);

    const parentDir = path.dirname(oldPath);
    const newPath = parentDir === '.' ? newName : path.join(parentDir, newName);
    const newItemPath = path.join(basePath, newPath);

    console.log(`Renaming: ${oldItemPath} -> ${newItemPath}`);

    const exists = await fs.pathExists(oldItemPath);
    if (!exists) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const newExists = await fs.pathExists(newItemPath);
    if (newExists) {
      return res.status(400).json({ error: 'An item with that name already exists' });
    }

    await fs.move(oldItemPath, newItemPath);

    const project = await Project.findOne({ roomId });
    if (project) {
      const updateInStructure = (items) => {
        return items.map(item => {
          if (item.path === oldPath) {
            const updatedItem = { ...item, name: newName, path: newPath };
            if (updatedItem.children) {
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

router.post('/set-local-path/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { localPath } = req.body;

    if (!roomId || !localPath) {
      return res.status(400).json({ error: 'Room ID and local path are required' });
    }

    const exists = await fs.pathExists(localPath);
    if (!exists) {
      return res.status(400).json({ error: 'Specified local path does not exist' });
    }

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

module.exports = (io) => {
  socketIO = io;
  console.log('File Explorer routes initialized with Socket.IO');

  return router;
};