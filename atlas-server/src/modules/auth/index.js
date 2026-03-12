const express = require('express');
const { db, getStoreById } = require('../../stores');
const { requireAuth } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');

const router = express.Router();

function buildUserPayload(user) {
  return {
    ...user,
    store: getStoreById(user.primaryStoreId) || null,
  };
}

function handleMockLogin(req, res) {
  const { userId, weworkUserId, code } = req.body || {};

  const user = db.users.find((item) => (
    (userId && item.id === Number(userId)) ||
    (weworkUserId && item.weworkUserId === weworkUserId)
  ));

  if (!user) {
    return fail(res, 2001, 'mock 用户不存在', { supportedUserIds: db.users.map((item) => item.id) }, 404);
  }

  return success(res, {
    accessToken: String(user.id),
    tokenType: 'Bearer',
    expiresIn: 7200,
    loginType: code ? 'mock-wework-code' : 'mock-user-id',
    user: buildUserPayload(user),
  });
}

router.post('/mock-login', handleMockLogin);
router.post('/mock/login', handleMockLogin);

router.post('/wework/callback', (req, res) => {
  const { code } = req.body || {};
  const fallbackUser = db.users[0];

  if (!code) {
    return fail(res, 1001, 'code 不能为空');
  }

  return success(res, {
    accessToken: String(fallbackUser.id),
    tokenType: 'Bearer',
    expiresIn: 7200,
    code,
    mocked: true,
    user: buildUserPayload(fallbackUser),
  });
});

router.get('/me', requireAuth, (req, res) => success(res, req.user));

router.post('/logout', requireAuth, (req, res) => success(res, {
  success: true,
  loggedOutUserId: req.user.id,
}));

module.exports = router;
