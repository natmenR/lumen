const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../services/auth');
const users = require('../repositories/users');
const notifications = require('../repositories/notifications');
const { COOKIE, cookieOpts, sign, requireAuth } = require('../middlewares/auth');
const { wrap, unauthorized } = require('../utils/http');

const limiter = rateLimit({ windowMs: 15 * 60000, limit: 40, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Demasiados intentos, espera unos minutos' } });

const startSession = (res, u) => res.cookie(COOKIE, sign(u), cookieOpts());

router.post('/register', limiter, wrap(async (req, res) => {
  const u = await auth.register(req.body);
  startSession(res, u);
  res.status(201).json({ user: await users.findById(u.id) });
}));

router.post('/login', limiter, wrap(async (req, res) => {
  const u = await auth.login(req.body);
  startSession(res, u);
  res.json({ user: await users.findById(u.id) });
}));

router.post('/logout', (_req, res) => { res.clearCookie(COOKIE, { path: '/' }); res.json({ ok: true }); });

router.post('/forgot', limiter, wrap(async (req, res) => res.json(await auth.forgot(req.body.correo))));
router.post('/reset', limiter, wrap(async (req, res) => { await auth.reset(req.body.token, req.body.password); res.json({ ok: true }); }));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const user = await users.findById(req.user.id);
  if (!user) throw unauthorized('Cuenta no disponible');
  res.json({ user, no_leidas: await notifications.unread(req.user.id) });
}));

router.patch('/me', requireAuth, wrap(async (req, res) => {
  await auth.updateMe(req.user, req.body);
  res.json({ user: await users.findById(req.user.id) });
}));

module.exports = router;
