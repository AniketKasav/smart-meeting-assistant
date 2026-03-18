// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const authenticateToken = require('../middleware/authenticateToken');
const { loginLimiter, registerLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { validate } = require('../middleware/validator');
const { sendWelcomeEmail, sendPasswordResetEmail, sendPasswordChangedEmail } = require('../services/emailService');
const router = express.Router();

// Generate tokens
const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  return { accessToken, refreshToken };
};

// Set secure cookies
const setTokenCookies = (res, accessToken, refreshToken) => {
  // HttpOnly cookie for refresh token (most secure)
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  // Access token in cookie (optional, can also use localStorage)
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
};

// Clear cookies
const clearTokenCookies = (res) => {
  res.clearCookie('refreshToken');
  res.clearCookie('accessToken');
};

// Register
router.post('/register', registerLimiter, validate('register'), async (req, res) => {
  try {
    console.log('📝 Registration attempt:', req.body);
    
    const { email, password, name } = req.body;

    console.log('🔍 Checking existing user...');
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      console.log('❌ Email already exists');
      return res.status(409).json({ error: 'Email already registered' });
    }

    console.log('✅ Creating new user...');
    const user = new User({ email, password, name });
    
    console.log('💾 Saving user...');
    await user.save();
    console.log('✅ User saved:', user._id);

    // 👇 Send welcome email
    sendWelcomeEmail(user.email, user.name).catch(err => 
      console.error('Failed to send welcome email:', err)
    );

    console.log('🔐 Generating tokens...');
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    user.refreshToken = refreshToken;
    await user.save();

    // Set secure cookies
    setTokenCookies(res, accessToken, refreshToken);

    console.log('✅ Registration complete');
    res.status(201).json({
      message: 'Registration successful',
      accessToken, // Still return for localStorage compatibility
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('❌ REGISTRATION ERROR:', error);
    res.status(500).json({ 
      error: 'Registration failed',
      message: error.message 
    });
  }
});

// Login
router.post('/login', loginLimiter, validate('login'), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, isActive: true });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = generateTokens(user._id, user.role);
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    // Set secure cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.json({
      message: 'Login successful',
      accessToken, // Still return for localStorage compatibility
      refreshToken,
      user: { id: user._id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh Token
router.post('/refresh-token', async (req, res) => {
  try {
    // Try to get refresh token from cookie first, then body
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id, user.role);
      user.refreshToken = newRefreshToken;
      await user.save();

      // Set new secure cookies
      setTokenCookies(res, accessToken, newRefreshToken);

      res.json({ accessToken, refreshToken: newRefreshToken });
    });
  } catch (error) {
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.userId, { refreshToken: null });
    
    // Clear cookies
    clearTokenCookies(res);
    
    res.json({ message: 'Logout successful' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get Current User
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -refreshToken');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update Profile
router.put('/profile', authenticateToken, validate('updateProfile'), async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ error: 'Email already in use' });
      }
    }

    if (name) user.name = name;
    if (email) user.email = email;

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change Password
router.post('/change-password', authenticateToken, validate('changePassword'), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Logout from All Devices
router.post('/logout-all', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.refreshToken = undefined;
    await user.save();

    // Clear cookies
    clearTokenCookies(res);

    res.json({ message: 'Logged out from all devices' });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({ error: 'Failed to logout from all devices' });
  }
});

// Delete Account
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user.userId);
    
    // Clear cookies
    clearTokenCookies(res);
    
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Account deletion error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

// Forgot Password
router.post('/forgot-password', passwordResetLimiter, validate('forgotPassword'), async (req, res) => {
  try {
    const { email } = req.body;
    console.log('📧 Password reset requested for:', email);
    
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log('❌ User not found');
      return res.json({ message: 'If email exists, reset link sent' });
    }
    
    const resetToken = crypto.randomBytes(32).toString('hex');
    console.log('🔑 RESET TOKEN:', resetToken);
    
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpiry = Date.now() + 3600000;
    await user.save();
    
    console.log('✅ Token saved to database');
    console.log('🔗 Reset URL: http://localhost:5173/reset-password?token=' + resetToken);

    // 👇 Send password reset email
    sendPasswordResetEmail(user.email, user.name, resetToken).catch(err =>
      console.error('Failed to send reset email:', err)
    );

    res.json({ 
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Reset Password
router.post('/reset-password', passwordResetLimiter, validate('resetPassword'), async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    console.log('🔐 Password reset attempt');
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() }
    });
    
    if (!user) {
      console.log('❌ Invalid or expired token');
      return res.status(400).json({ error: 'Invalid or expired token' });
    }
    
    console.log('✅ Valid token found for user:', user.email);
    
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    await user.save();
    
    console.log('✅ Password updated successfully');
        
      // 👇 Send password changed confirmation email
      sendPasswordChangedEmail(user.email, user.name).catch(err =>
        console.error('Failed to send confirmation email:', err)
      );
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('❌ Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Auth Route Error:', err);
  res.status(500).json({ 
    error: 'Server error', 
    message: err.message 
  });
});

module.exports = router;
// Test email endpoint
router.get('/test-email', async (req, res) => {
  try {
    console.log('🧪 Testing email service...');
    const { sendPasswordResetEmail } = require('../services/emailService');
    await sendPasswordResetEmail(
      'kasavaniket15@gmail.com',  // Your email
      'Test User',
      'test-token-12345'
    );
    console.log('✅ Test email sent successfully!');
    res.json({ success: true, message: 'Email sent! Check inbox.' });
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      stack: error.stack 
    });
  }
});