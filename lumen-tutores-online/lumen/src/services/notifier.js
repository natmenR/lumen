// Registra la notificación en la app y la replica por correo / SMS / WhatsApp cuando hay credenciales.
const notifications = require('../repositories/notifications');
const msg = require('./messaging');

async function notify(usuario_id, { tipo, titulo, mensaje, tutoria_id, externo = false }) {
  try {
    await notifications.insert({ usuario_id, tipo, titulo, mensaje, tutoria_id });
    if (externo) {
      const c = await notifications.contactOf(usuario_id);
      if (c?.correo) {
        const ok = await msg.sendEmail(c.correo, titulo, msg.layout(titulo, `<p>Hola ${c.nombre},</p><p>${mensaje || ''}</p>`));
        if (ok) await notifications.insert({ usuario_id, tutoria_id, tipo, titulo, mensaje, canal: 'correo' });
      }
      if (c?.telefono) {
        const text = `Lumen: ${titulo}. ${mensaje || ''}`;
        if (await msg.sendWhatsApp(c.telefono, text)) await notifications.insert({ usuario_id, tutoria_id, tipo, titulo, mensaje, canal: 'whatsapp' });
        else if (await msg.sendSms(c.telefono, text)) await notifications.insert({ usuario_id, tutoria_id, tipo, titulo, mensaje, canal: 'sms' });
      }
    }
  } catch (e) { console.error('[notify] fallo (no bloquea el flujo):', e.message); }
}

module.exports = { notify };
