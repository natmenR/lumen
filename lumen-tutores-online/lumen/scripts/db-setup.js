// Recrea el esquema completo desde database/bd.sql (¡borra el esquema "lumen"!).
const fs = require('fs');
const path = require('path');
const db = require('../src/db/pool');
const bootstrap = require('../src/db/bootstrap');

(async () => {
  const sql = fs.readFileSync(path.join(__dirname, '../database/bd.sql'), 'utf8');
  await db.query(sql);
  console.log('Esquema "lumen" recreado con datos de ejemplo.');
  await bootstrap();
  await db.pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
