// backend/routes/debug.js
const express = require('express');
const router = express.Router();

// Log frontend errors to backend terminal
router.post('/log', (req, res) => {
  const { type, message, data } = req.body;
  
  console.log('\n========================================');
  console.log(`🔴 FRONTEND ${type.toUpperCase()}`);
  console.log('========================================');
  console.log('Message:', message);
  console.log('Data:', JSON.stringify(data, null, 2));
  console.log('Timestamp:', new Date().toISOString());
  console.log('========================================\n');
  
  res.json({ success: true });
});

module.exports = router;
