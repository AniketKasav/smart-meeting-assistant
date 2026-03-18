import api from './api';

/**
 * Check Google authentication status
 */
export const checkGoogleAuth = async () => {
  try {
    const response = await api.get('/auth/google/status');
    return response.data;
  } catch (error) {
    console.error('Check auth error:', error);
    throw error;
  }
};

/**
 * Search Gmail
 */
export const searchGmail = async (query, maxResults = 10) => {
  try {
    const response = await api.post('/gmail/search', { query, maxResults });
    return response.data;
  } catch (error) {
    console.error('Gmail search error:', error);
    throw error;
  }
};

/**
 * Send email
 */
export const sendEmail = async (to, subject, body) => {
  try {
    const response = await api.post('/gmail/send', { to, subject, body });
    return response.data;
  } catch (error) {
    console.error('Send email error:', error);
    throw error;
  }
};

/**
 * Search Google Drive
 */
export const searchDrive = async (query, maxResults = 10) => {
  try {
    const response = await api.post('/drive/search', { query, maxResults });
    return response.data;
  } catch (error) {
    console.error('Drive search error:', error);
    throw error;
  }
};

/**
 * Get Drive file
 */
export const getDriveFile = async (fileId) => {
  try {
    const response = await api.get(`/drive/${fileId}`);
    return response.data;
  } catch (error) {
    console.error('Get Drive file error:', error);
    throw error;
  }
};

export default {
  checkGoogleAuth,
  searchGmail,
  sendEmail,
  searchDrive,
  getDriveFile
};