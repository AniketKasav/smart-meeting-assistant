// backend/routes/googleAuth.js
const express = require('express');
const router = express.Router();
const { getAuthUrl, oauth2Client, saveTokens } = require('../middleware/googleAuth');

/**
 * GET /api/auth/google
 * Start Google OAuth flow
 */
router.get('/google', (req, res) => {
  const authUrl = getAuthUrl();
  res.redirect(authUrl);
});

/**
 * GET /api/auth/google/callback
 * Handle OAuth callback
 */
router.get('/google/callback', async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('No authorization code provided');
  }

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Save tokens
    saveTokens(tokens);

    console.log('✅ Google authentication successful');

    // Redirect to frontend
    res.send(`
      <html>
        <body>
          <h1>✅ Google Authentication Successful!</h1>
          <p>You can close this window and return to the app.</p>
          <script>
            setTimeout(() => {
              window.close();
            }, 2000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('Authentication failed');
  }
});

/**
 * GET /api/auth/google/status
 * Check authentication status
 */
router.get('/google/status', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const TOKEN_PATH = path.join(__dirname, '../google-tokens.json');
  
  const isAuthenticated = fs.existsSync(TOKEN_PATH);
  
  res.json({
    success: true,
    authenticated: isAuthenticated,
    authUrl: isAuthenticated ? null : getAuthUrl()
  });
});

/**
 * DELETE /api/auth/google/logout
 * Revoke Google authentication
 */
router.delete('/google/logout', async (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const TOKEN_PATH = path.join(__dirname, '../google-tokens.json');
    
    // Delete token file
    if (fs.existsSync(TOKEN_PATH)) {
      fs.unlinkSync(TOKEN_PATH);
    }
    
    // Revoke tokens
    await oauth2Client.revokeCredentials();
    
    res.json({
      success: true,
      message: 'Google authentication revoked'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({
      success: true,
      message: 'Logged out (tokens cleared)'
    });
  }
});

module.exports = router;