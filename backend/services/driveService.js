// backend/services/driveService.js
const { google } = require('googleapis');
const { getOAuthClient } = require('../middleware/googleAuth');
const fs = require('fs');
const path = require('path');

/**
 * Search files in Google Drive
 */
async function searchFiles(query, maxResults = 10) {
  try {
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Build search query
    let searchQuery = `name contains '${query}' and trashed=false`;

    const response = await drive.files.list({
      q: searchQuery,
      pageSize: maxResults,
      fields: 'files(id, name, mimeType, createdTime, modifiedTime, size, webViewLink, iconLink, owners)',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];

    return {
      success: true,
      files: files.map(file => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        createdTime: file.createdTime,
        modifiedTime: file.modifiedTime,
        size: file.size ? parseInt(file.size) : 0,
        webViewLink: file.webViewLink,
        iconLink: file.iconLink,
        owner: file.owners && file.owners[0] ? file.owners[0].displayName : 'Unknown'
      })),
      total: files.length
    };
  } catch (error) {
    console.error('Drive search error:', error);
    return {
      success: false,
      error: error.message || 'Failed to search Drive files'
    };
  }
}

/**
 * Get file by ID
 */
async function getFile(fileId) {
  try {
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const file = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, createdTime, modifiedTime, size, webViewLink, iconLink, owners, description'
    });

    return {
      success: true,
      file: {
        id: file.data.id,
        name: file.data.name,
        mimeType: file.data.mimeType,
        createdTime: file.data.createdTime,
        modifiedTime: file.data.modifiedTime,
        size: file.data.size ? parseInt(file.data.size) : 0,
        webViewLink: file.data.webViewLink,
        iconLink: file.data.iconLink,
        owner: file.data.owners && file.data.owners[0] ? file.data.owners[0].displayName : 'Unknown',
        description: file.data.description || ''
      }
    };
  } catch (error) {
    console.error('Drive get file error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get file'
    };
  }
}

/**
 * Download file content
 */
async function downloadFile(fileId) {
  try {
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    return {
      success: true,
      stream: response.data
    };
  } catch (error) {
    console.error('Drive download error:', error);
    return {
      success: false,
      error: error.message || 'Failed to download file'
    };
  }
}

/**
 * Upload file to Drive
 */
async function uploadFile(filePath, fileName, mimeType = 'application/octet-stream', folderId = null) {
  try {
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: fileName
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink'
    });

    return {
      success: true,
      file: {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink
      },
      message: 'File uploaded successfully'
    };
  } catch (error) {
    console.error('Drive upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload file'
    };
  }
}

/**
 * Share file with user
 */
async function shareFile(fileId, email, role = 'reader') {
  try {
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        type: 'user',
        role: role, // reader, writer, commenter
        emailAddress: email
      },
      sendNotificationEmail: true
    });

    return {
      success: true,
      message: `File shared with ${email}`
    };
  } catch (error) {
    console.error('Drive share error:', error);
    return {
      success: false,
      error: error.message || 'Failed to share file'
    };
  }
}

/**
 * Create folder
 */
async function createFolder(folderName, parentFolderId = null) {
  try {
    const auth = getOAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentFolderId) {
      fileMetadata.parents = [parentFolderId];
    }

    const response = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink'
    });

    return {
      success: true,
      folder: {
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink
      }
    };
  } catch (error) {
    console.error('Drive create folder error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create folder'
    };
  }
}

module.exports = {
  searchFiles,
  getFile,
  downloadFile,
  uploadFile,
  shareFile,
  createFolder
};