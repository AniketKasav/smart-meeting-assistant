// backend/routes/drive.js
const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateToken');
const { requireGoogleAuth } = require('../middleware/googleAuth');
const driveService = require('../services/driveService');

/**
 * POST /api/drive/search
 * Search files in Drive
 */
router.post('/search', authenticateToken, requireGoogleAuth, async (req, res) => {
  try {
    const { query, maxResults = 10 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    console.log('🔍 Drive search:', query);

    const result = await driveService.searchFiles(query, maxResults);

    res.json(result);
  } catch (error) {
    console.error('Drive search route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search Drive files'
    });
  }
});

/**
 * GET /api/drive/:fileId
 * Get file by ID
 */
router.get('/:fileId', authenticateToken, requireGoogleAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await driveService.getFile(fileId);

    res.json(result);
  } catch (error) {
    console.error('Drive get file route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get file'
    });
  }
});

/**
 * GET /api/drive/:fileId/download
 * Download file
 */
router.get('/:fileId/download', authenticateToken, requireGoogleAuth, async (req, res) => {
  try {
    const { fileId } = req.params;

    const result = await driveService.downloadFile(fileId);

    if (!result.success) {
      return res.status(500).json(result);
    }

    // Stream file to response
    result.stream.pipe(res);
  } catch (error) {
    console.error('Drive download route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to download file'
    });
  }
});

/**
 * POST /api/drive/upload
 * Upload file to Drive
 */
router.post('/upload', authenticateToken, requireGoogleAuth, async (req, res) => {
  try {
    const { filePath, fileName, mimeType, folderId } = req.body;

    if (!filePath || !fileName) {
      return res.status(400).json({
        success: false,
        error: 'File path and name are required'
      });
    }

    console.log('📤 Uploading to Drive:', fileName);

    const result = await driveService.uploadFile(filePath, fileName, mimeType, folderId);

    res.json(result);
  } catch (error) {
    console.error('Drive upload route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

/**
 * POST /api/drive/:fileId/share
 * Share file with user
 */
router.post('/:fileId/share', authenticateToken, requireGoogleAuth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { email, role = 'reader' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    console.log('🔗 Sharing file with:', email);

    const result = await driveService.shareFile(fileId, email, role);

    res.json(result);
  } catch (error) {
    console.error('Drive share route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share file'
    });
  }
});

/**
 * POST /api/drive/folder
 * Create folder
 */
router.post('/folder', authenticateToken, requireGoogleAuth, async (req, res) => {
  try {
    const { folderName, parentFolderId } = req.body;

    if (!folderName) {
      return res.status(400).json({
        success: false,
        error: 'Folder name is required'
      });
    }

    const result = await driveService.createFolder(folderName, parentFolderId);

    res.json(result);
  } catch (error) {
    console.error('Drive create folder route error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create folder'
    });
  }
});

module.exports = router;
