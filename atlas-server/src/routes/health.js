const express = require('express');
const { success } = require('../utils/response');

const router = express.Router();

router.get('/', (_req, res) => {
  return success(res, {
    status: 'ok',
    service: 'atlas-server',
  });
});

module.exports = router;
