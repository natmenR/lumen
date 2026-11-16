const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../db/pool');
const users = require('../repositories/users');
const config = require('../config');
const msg = require('./messaging');
const { bad, unauthorized, conflict, parse } = require('../utils/http');

const niveles = z.enum(['colegio', 'pregrado', 'posgrado']);
const password = z.string().min(8, 'mínimo 8 caracteres').max(72).regex(/[A-Za-z]/, 'debe incluir letras').regex(/\d/, 'debe incluir un número');

const registerSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  apellido: z.string().trim().min(2).max(100),
  correo: z.string().trim().email('correo inválido').max(150),
  password,
  rol: z.enum(['estudiante', 'tutor']),
  telefono: z.string().trim().max(20).optional().or(z.literal('')),
  ciudad: z.string().trim().max(100).optional().or(z.literal('')),
  nivel_educativo: niveles.optional(),
});

const loginSchema = z.object({ correo: z.string().trim().email('correo inválido'), password: z.string().min(1, 'requerida') });

async function register(body) {
  const d = parse(registerSchema, body);
  if (await users.findByEmail(d.correo)) throw conflict('Ya existe una cuenta con ese correo');
  const password_hash = await bcrypt.hash(d.password, 10);
  return db.tx((c) => users.create(c, { ...d, password_hash }));
}

async function login(body) {
  const d = parse(loginSchema, body);
  const u = await users.findByEmail(d.correo);
  const ok = u?.password_hash && u.activo && (await bcrypt.compare(d.password, u.password_hash));
  if (!ok) throw unauthorized('Correo o contraseña incorrectos');
  return { id: u.id, rol: u.rol };
}

// Siempre responde igual exista o no el correo (evita enumerar cuentas).
async function forgot(correo) {
  parse(z.object({ correo: z.string().trim().email('correo inválido') }), { correo });
  const u = await users.findByEmail(correo);
  const out = { ok: true };
  if (!u || u.proveedor_auth !== 'local') return out;
  const token = crypto.randomBytes(32).toString('hex');
  await users.saveResetToken(u.id, crypto.createHash('sha256').update(token).digest('hex'), 30);
  const link = `${config.appUrl}/#/reset/${token}`;
  await msg.sendEmail(u.correo, 'Recupera tu contraseña de Lumen',
    msg.layout('Recupera tu contraseña', `<p>Hola ${u.nombre}, usa este enlace (válido 30 minutos):</p><p><a href="${link}">Crear nueva contraseña</a></p>`));
  if (!msg.emailEnabled() && config.exposeResetLink) out.dev_link = link;
  return out;
}

async function reset(token, newPassword) {
  const pass = parse(z.object({ p: password }), { p: newPassword }).p;
  if (!token || typeof token !== 'string') throw bad('Token requerido');
  const t = await users.findResetToken(crypto.createHash('sha256').update(token).digest('hex'));
  if (!t) throw bad('El enlace no es válido o ya expiró');
  const hash = await bcrypt.hash(pass, 10);
  await db.tx(async (c) => { await users.setPassword(c, t.usuario_id, hash); await users.markTokenUsed(c, t.id); });
}

const profileSchema = z.object({
  nombre: z.string().trim().min(2).max(100).optional(),
  apellido: z.string().trim().min(2).max(100).optional(),
  telefono: z.string().trim().max(20).optional(),
  nivel_educativo: niveles.optional(),
  institucion: z.string().trim().max(150).optional(),
  ciudad: z.string().trim().max(100).optional(),
});

async function updateMe(user, body) {
  const d = parse(profileSchema, body);
  await db.tx(async (c) => {
    await users.updateBasic(c, user.id, d);
    if (user.rol === 'estudiante') await users.updateStudentProfile(c, user.id, d);
    else if (d.ciudad) await c.query(`UPDATE lumen.perfiles_tutor SET ciudad=$2 WHERE usuario_id=$1`, [user.id, d.ciudad]);
  });
}

module.exports = { register, login, forgot, reset, updateMe };
