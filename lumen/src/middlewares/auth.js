const jwt = require('jsonwebtoken');
const config = require('../config');
const { unauthorized, forbidden } = require('../utils/http');

const COOKIE = 'lumen_token';
const cookieOpts = () => ({ httpOnly: true, sameSite: 'lax', secure: config.isProd, maxAge: 7 * 864e5, path: '/' });

const sign = (u) => jwt.sign({ id: Number(u.id), rol: u.rol }, config.jwtSecret, { expiresIn: '7d' });

function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE] || (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return next(unauthorized());
  try {
    const p = jwt.verify(token, config.jwtSecret);
    req.user = { id: p.id, rol: p.rol };
    next();
  } catch { next(unauthorized('Sesión inválida o expirada')); }
}

const requireRole = (rol) => (req, _res, next) =>
  req.user?.rol === rol ? next() : next(forbidden(`Solo disponible para ${rol}es`));

module.exports = { COOKIE, cookieOpts, sign, requireAuth, requireRole };
