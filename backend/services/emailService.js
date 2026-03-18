// backend/services/emailService.js - FIXED
const nodemailer = require('nodemailer');

// Create transporter using your working config
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const mailOptions = {
      from: `"Smart Meeting Assistant" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🎉 Welcome to Smart Meeting Assistant!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              margin-top: 0;
            }
            .content p {
              color: #666;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
            }
            .features {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .feature-item {
              margin: 10px 0;
              display: flex;
              align-items: start;
            }
            .feature-icon {
              margin-right: 10px;
              font-size: 20px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Welcome to Smart Meeting Assistant!</h1>
            </div>
            <div class="content">
              <h2>Hi ${userName}! 👋</h2>
              <p>Thank you for joining Smart Meeting Assistant! We're excited to help you make your meetings more productive and efficient.</p>
              
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" class="button">
                Get Started →
              </a>

              <div class="features">
                <h3 style="margin-top:0;">What you can do:</h3>
                <div class="feature-item">
                  <span class="feature-icon">📝</span>
                  <span>Record and transcribe meetings in real-time</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">🤖</span>
                  <span>Get AI-powered summaries and insights</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">📊</span>
                  <span>Track action items and follow-ups</span>
                </div>
                <div class="feature-item">
                  <span class="feature-icon">🔍</span>
                  <span>Search through all your meeting transcripts</span>
                </div>
              </div>

              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy meeting! 🚀</p>
            </div>
            <div class="footer">
              <p>© 2025 Smart Meeting Assistant. All rights reserved.</p>
              <p>You received this email because you signed up for Smart Meeting Assistant.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (userEmail, userName, resetToken) => {
  try {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Smart Meeting Assistant" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🔒 Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 40px 30px;
            }
            .content h2 {
              color: #333;
              margin-top: 0;
            }
            .content p {
              color: #666;
              line-height: 1.6;
            }
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
              margin: 20px 0;
            }
            .warning {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔒 Password Reset Request</h1>
            </div>
            <div class="content">
              <h2>Hi ${userName},</h2>
              <p>We received a request to reset your password for your Smart Meeting Assistant account.</p>
              
              <a href="${resetUrl}" class="button">
                Reset Password →
              </a>

              <div class="warning">
                <strong>⚠️ Security Notice:</strong>
                <p style="margin:5px 0 0 0; font-size:14px;">This link will expire in <strong>1 hour</strong> for security reasons.</p>
              </div>

              <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
              
              <p style="color:#999; font-size:12px; margin-top:30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color:#667eea;">${resetUrl}</a>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 Smart Meeting Assistant. All rights reserved.</p>
              <p>This is an automated security email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error);
    return false;
  }
};

// Send password changed confirmation
const sendPasswordChangedEmail = async (userEmail, userName) => {
  try {
    const mailOptions = {
      from: `"Smart Meeting Assistant" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '✅ Password Changed Successfully',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              padding: 40px 30px;
              text-align: center;
            }
            .content {
              padding: 40px 30px;
            }
            .alert {
              background: #fef2f2;
              border-left: 4px solid #ef4444;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              background: #f8f9fa;
              padding: 20px;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✅ Password Changed</h1>
            </div>
            <div class="content">
              <h2>Hi ${userName},</h2>
              <p>Your password has been successfully changed.</p>
              
              <div class="alert">
                <strong>⚠️ Didn't change your password?</strong>
                <p style="margin:5px 0 0 0; font-size:14px;">
                  If you didn't make this change, please contact our support team immediately.
                </p>
              </div>

              <p>Your account security is important to us. If you have any concerns, please don't hesitate to reach out.</p>
            </div>
            <div class="footer">
              <p>© 2025 Smart Meeting Assistant. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Password changed email sent to:', userEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to send password changed email:', error);
    return false;
  }
};

module.exports = {
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail
};