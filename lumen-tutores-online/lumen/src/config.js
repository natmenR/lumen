require('dotenv').config();
const e = process.env;
const port = Number(e.PORT) || 3000;

module.exports = {
  port,
  nodeEnv: e.NODE_ENV || 'development',
  isProd: e.NODE_ENV === 'production',
  databaseUrl: e.DATABASE_URL,
  jwtSecret: e.JWT_SECRET || 'dev-secret-change-me',
  appUrl: e.APP_URL || `http://localhost:${port}`,
  offerTtlMin: Number(e.OFFER_TTL_MINUTES) || 5,
  requestTtlMin: Number(e.REQUEST_TTL_MINUTES) || 30,
  jitsiDomain: e.JITSI_DOMAIN || 'meet.jit.si',
  demoPassword: e.DEMO_PASSWORD || 'Lumen123*',
  exposeResetLink: e.EXPOSE_RESET_LINK === 'true',
  smtp: { host: e.SMTP_HOST, port: Number(e.SMTP_PORT) || 587, user: e.SMTP_USER, pass: e.SMTP_PASS, from: e.SMTP_FROM || 'Lumen <no-reply@lumen.app>' },
  twilio: { sid: e.TWILIO_SID, token: e.TWILIO_TOKEN, whatsapp: e.TWILIO_WHATSAPP_FROM, sms: e.TWILIO_SMS_FROM },
  anthropic: { key: e.ANTHROPIC_API_KEY, model: e.ANTHROPIC_MODEL || 'claude-sonnet-4-6' },
};
