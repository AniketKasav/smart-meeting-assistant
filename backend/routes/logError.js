// backend/routes/logError.js
const express = require('express');
const router = express.Router();

router.post('/', (req, res) => {
  console.log('Frontend Error:', req.body.error);
  res.sendStatus(200);
});

module.exports = router;
