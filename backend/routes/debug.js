// backend/routes/debug.js
const express = require('express');
const router = express.Router();

// Log frontend errors to backend terminal
router.post('/log', (req, res) => {
  const { type, message, data } = req.body;
  
  res.json({ success: true });
});

module.exports = router;
