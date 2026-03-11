const express = require('express');

const router = express.Router();

router.get('/', (req, res) => {
  res.json({
    module: 'auth',
    message: 'Auth module placeholder',
  });
});

module.exports = router;
