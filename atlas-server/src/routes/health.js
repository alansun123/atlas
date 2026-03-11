const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'atlas-server',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
