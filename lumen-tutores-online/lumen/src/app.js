const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const config = require('./config');
const errors = require('./middlewares/errors');

const app = express();
app.set('trust proxy', 1);

const jitsi = [`https://${config.jitsiDomain}`, 'https://8x8.vc'];
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'blob:'],
      mediaSrc: ["'self'", 'blob:'],
      connectSrc: ["'self'"],
      frameSrc: jitsi,
      objectSrc: ["'none'"],
      upgradeInsecureRequests: config.isProd ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/catalog'));
app.use('/api', require('./routes/requests'));
app.use('/api', require('./routes/tutor'));
app.use('/api', require('./routes/tutorias'));
app.use('/api', errors.notFound);

app.use(express.static(path.join(__dirname, '../public'), { extensions: ['html'], maxAge: config.isProd ? '1h' : 0 }));
app.use(errors.handler);

module.exports = app;
