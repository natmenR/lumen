// Canales de salida: correo (SMTP), SMS y WhatsApp (Twilio). Si no están configurados,
// el mensaje se registra en consola para que el flujo siga funcionando en desarrollo.
const nodemailer = require('nodemailer');
const config = require('../config');

const transporter = config.smtp.host
  ? nodemailer.createTransport({ host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined })
  : null;

const emailEnabled = () => !!transporter;

async function sendEmail(to, subject, html) {
  if (!transporter) { console.log(`[correo simulado] a ${to}: ${subject}`); return false; }
  try { await transporter.sendMail({ from: config.smtp.from, to, subject, html }); return true; }
  catch (e) { console.error('[correo] fallo:', e.message); return false; }
}

async function twilio(to, body, from) {
  const { sid, token } = config.twilio;
  if (!sid || !token || !from || !to) return false;
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    return r.ok;
  } catch (e) { console.error('[twilio] fallo:', e.message); return false; }
}

const sendSms = (to, body) => twilio(to, body, config.twilio.sms);
const sendWhatsApp = (to, body) =>
  twilio(to?.startsWith('whatsapp:') ? to : `whatsapp:${to}`, body, config.twilio.whatsapp && `whatsapp:${config.twilio.whatsapp.replace('whatsapp:', '')}`);

const layout = (title, body) => `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#F5F0E6;padding:24px;border-radius:12px;color:#1C2340">
  <h2 style="margin:0 0 12px">✦ Lumen</h2><h3>${title}</h3><div style="line-height:1.5">${body}</div>
  <p style="color:#8A7F6E;font-size:12px;margin-top:24px">Aprendizaje en movimiento</p></div>`;

module.exports = { sendEmail, sendSms, sendWhatsApp, emailEnabled, layout };
