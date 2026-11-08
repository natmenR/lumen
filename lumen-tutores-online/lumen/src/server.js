const config = require('./config');
const bootstrap = require('./db/bootstrap');
const app = require('./app');

bootstrap()
  .then(() => app.listen(config.port, () => console.log(`✦ Lumen listo en http://localhost:${config.port}`)))
  .catch((e) => { console.error('No se pudo iniciar:', e.message); process.exit(1); });
