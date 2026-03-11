const express = require('express');
const { db, getStoreById } = require('../../stores');
const { requireAuth } = require('../../middlewares/auth');
const { success, fail } = require('../../utils/response');

const router = express.Router();

router.post('/mock/login', (req, res) => {
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
    expiresIn: 7200,
    loginType: code ? 'mock-wework-code' : 'mock-user-id',
    user: {
      ...user,
      store: getStoreById(user.primaryStoreId) || null,
    },
  });
});

router.post('/wework/callback', (req, res) => {
  const { code } = req.body || {};
  const fallbackUser = db.users[0];

  if (!code) {
    return fail(res, 1001, 'code 不能为空');
  }

  return success(res, {
    accessToken: String(fallbackUser.id),
    expiresIn: 7200,
    code,
    mocked: true,
    user: {
      ...fallbackUser,
      store: getStoreById(fallbackUser.primaryStoreId) || null,
    },
  });
});

router.get('/me', requireAuth, (req, res) => success(res, req.user));

router.post('/logout', requireAuth, (_req, res) => success(res, { success: true }));

module.exports = router;
