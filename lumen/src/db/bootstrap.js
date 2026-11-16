// Prepara la BD al arrancar: crea el esquema si no existe y deja listos los usuarios demo.
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./pool');
const config = require('../config');

async function ensureSchema() {
  const { rows } = await db.query(`SELECT to_regclass('lumen.usuarios') AS t`);
  if (rows[0].t) return false;
  console.log('[db] Esquema "lumen" no encontrado, ejecutando database/bd.sql ...');
  const sql = fs.readFileSync(path.join(__dirname, '../../database/bd.sql'), 'utf8');
  await db.query(sql);
  return true;
}

// bd.sql deja los usuarios demo con un hash de mentira; aquí se reemplaza por uno real.
async function ensureDemoPasswords() {
  const hash = await bcrypt.hash(config.demoPassword, 10);
  const r = await db.query(
    `UPDATE lumen.usuarios SET password_hash=$1 WHERE password_hash='HASH_BCRYPT_DEMO'`, [hash]);
  if (r.rowCount) console.log(`[db] ${r.rowCount} usuarios demo con contraseña "${config.demoPassword}"`);
}

module.exports = async function bootstrap() {
  await ensureSchema();
  await ensureDemoPasswords();
};
module.exports.ensureSchema = ensureSchema;
