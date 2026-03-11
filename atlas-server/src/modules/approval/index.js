const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    module: 'approval',
    message: 'Approval module placeholder',
  });
});

module.exports = router;
