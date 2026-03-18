// backend/services/gmailService.js
const { google } = require('googleapis');
const { getOAuthClient } = require('../middleware/googleAuth');

/**
 * Search emails
 */
async function searchEmails(query, maxResults = 10) {
  try {
    const auth = getOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    // Build search query
    let searchQuery = query;
    
    // Search in Gmail
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: searchQuery,
      maxResults: maxResults
    });

    if (!response.data.messages || response.data.messages.length === 0) {
      return {
        success: true,
        emails: [],
        total: 0
      };
    }

    // Get full message details
    const emails = await Promise.all(
      response.data.messages.slice(0, maxResults).map(async (message) => {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const headers = msg.data.payload.headers;
        const getHeader = (name) => {
          const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
          return header ? header.value : '';
        };

        // Get email body
        let body = '';
        if (msg.data.payload.body.data) {
          body = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf-8');
        } else if (msg.data.payload.parts) {
          const textPart = msg.data.payload.parts.find(part => part.mimeType === 'text/plain');
          if (textPart && textPart.body.data) {
            body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
          }
        }

        return {
          id: msg.data.id,
          threadId: msg.data.threadId,
          from: getHeader('From'),
          to: getHeader('To'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: msg.data.snippet,
          body: body.substring(0, 500), // First 500 chars
          labels: msg.data.labelIds || []
        };
      })
    );

    return {
      success: true,
      emails,
      total: response.data.resultSizeEstimate || emails.length
    };
  } catch (error) {
    console.error('Gmail search error:', error);
    return {
      success: false,
      error: error.message || 'Failed to search emails'
    };
  }
}

/**
 * Send email
 */
async function sendEmail(to, subject, body, attachments = []) {
  try {
    const auth = getOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    // Create email content
    const messageParts = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      body
    ];

    const message = messageParts.join('\n');
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage
      }
    });

    return {
      success: true,
      messageId: response.data.id,
      message: 'Email sent successfully'
    };
  } catch (error) {
    console.error('Gmail send error:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

/**
 * Get email by ID
 */
async function getEmail(emailId) {
  try {
    const auth = getOAuthClient();
    const gmail = google.gmail({ version: 'v1', auth });

    const msg = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'full'
    });

    const headers = msg.data.payload.headers;
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    // Get email body
    let body = '';
    if (msg.data.payload.body.data) {
      body = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf-8');
    } else if (msg.data.payload.parts) {
      const textPart = msg.data.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      }
    }

    return {
      success: true,
      email: {
        id: msg.data.id,
        threadId: msg.data.threadId,
        from: getHeader('From'),
        to: getHeader('To'),
        subject: getHeader('Subject'),
        date: getHeader('Date'),
        body: body,
        labels: msg.data.labelIds || []
      }
    };
  } catch (error) {
    console.error('Gmail get error:', error);
    return {
      success: false,
      error: error.message || 'Failed to get email'
    };
  }
}

module.exports = {
  searchEmails,
  sendEmail,
  getEmail
};