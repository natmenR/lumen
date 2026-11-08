// Acceso a PostgreSQL. Todas las consultas usan el esquema "lumen" de forma explícita
// (compatible con el pooler de Neon, que no conserva el search_path).
const { Pool } = require('pg');
const config = require('../config');

if (!config.databaseUrl) throw new Error('Falta DATABASE_URL en el archivo .env');

const local = /localhost|127\.0\.0\.1/.test(config.databaseUrl);
const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: local ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
});
pool.on('error', (err) => console.error('[pg] error en conexión inactiva:', err.message));

const query = (text, params) => pool.query(text, params);

async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, tx };
