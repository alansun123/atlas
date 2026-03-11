const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    module: 'schedule',
    message: 'Schedule module placeholder',
  });
});

module.exports = router;
