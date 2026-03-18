// backend/middleware/googleAuth.js
const { google } = require('googleapis');
const googleConfig = require('../config/google.config');
const fs = require('fs');
const path = require('path');

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  googleConfig.clientId,
  googleConfig.clientSecret,
  googleConfig.redirectUri
);

// Token file path
const TOKEN_PATH = path.join(__dirname, '../google-tokens.json');

/**
 * Load stored tokens
 */
function loadTokens() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
      oauth2Client.setCredentials(tokens);
      return true;
    }
  } catch (error) {
    console.error('Error loading tokens:', error);
  }
  return false;
}

/**
 * Save tokens to file
 */
function saveTokens(tokens) {
  try {
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log('✅ Tokens saved');
  } catch (error) {
    console.error('Error saving tokens:', error);
  }
}

/**
 * Middleware to check Google authentication
 */
async function requireGoogleAuth(req, res, next) {
  try {
    // Try to load existing tokens
    if (!loadTokens()) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated with Google',
        authUrl: getAuthUrl()
      });
    }

    // Check if token is expired and refresh if needed
    const tokenInfo = await oauth2Client.getTokenInfo(oauth2Client.credentials.access_token);
    
    if (!tokenInfo || tokenInfo.expiry_date < Date.now()) {
      // Token expired, try to refresh
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      saveTokens(credentials);
    }

    req.googleAuth = oauth2Client;
    next();
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(401).json({
      success: false,
      error: 'Google authentication failed',
      authUrl: getAuthUrl()
    });
  }
}

/**
 * Get authorization URL
 */
function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: googleConfig.scopes,
    prompt: 'consent'
  });
}

/**
 * Get OAuth client
 */
function getOAuthClient() {
  loadTokens();
  return oauth2Client;
}

module.exports = {
  requireGoogleAuth,
  getAuthUrl,
  getOAuthClient,
  saveTokens,
  oauth2Client
};