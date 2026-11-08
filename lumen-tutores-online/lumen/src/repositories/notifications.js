const db = require('../db/pool');

const insert = (n) => db.query(
  `INSERT INTO lumen.notificaciones (usuario_id, tutoria_id, tipo, titulo, mensaje, canal) VALUES ($1,$2,$3,$4,$5,$6)`,
  [n.usuario_id, n.tutoria_id || null, n.tipo, n.titulo, n.mensaje || null, n.canal || 'app']);

const list = async (userId) => (await db.query(
  `SELECT id, tutoria_id, tipo, titulo, mensaje, leida, creada_en FROM lumen.notificaciones
   WHERE usuario_id=$1 AND canal='app' ORDER BY creada_en DESC LIMIT 40`, [userId])).rows;

const unread = async (userId) => (await db.query(
  `SELECT COUNT(*)::int AS n FROM lumen.notificaciones WHERE usuario_id=$1 AND canal='app' AND NOT leida`, [userId])).rows[0].n;

const markAllRead = (userId) => db.query(`UPDATE lumen.notificaciones SET leida=TRUE WHERE usuario_id=$1 AND NOT leida`, [userId]);

const contactOf = async (userId) => (await db.query(`SELECT nombre, correo, telefono FROM lumen.usuarios WHERE id=$1`, [userId])).rows[0];

module.exports = { insert, list, unread, markAllRead, contactOf };
