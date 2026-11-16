const config = require('../config');

const PG = {
  '23505': [409, 'Ya existe un registro con esos datos'],
  '23503': [400, 'Referencia inválida'],
  '23514': [400, 'Los datos no cumplen las reglas del negocio'],
  '22P02': [400, 'Formato de dato inválido'],
  'P0001': [400, null],
};

module.exports = {
  notFound: (req, res) => res.status(404).json({ error: 'Ruta no encontrada' }),
  handler: (err, req, res, _next) => {
    let status = err.status || 500;
    let message = err.message;
    if (err.code && PG[err.code]) { status = PG[err.code][0]; message = PG[err.code][1] || err.message; }
    if (status >= 500) { console.error('[error]', err); message = 'Error interno del servidor'; }
    res.status(status).json({ error: message, ...(config.isProd ? {} : { detail: err.details }) });
  },
};
