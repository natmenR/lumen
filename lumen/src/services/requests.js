// Flujo principal: solicitud → ofertas → tutoría confirmada.
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../db/pool');
const config = require('../config');
const requests = require('../repositories/requests');
const tutorias = require('../repositories/tutorias');
const { notify } = require('./notifier');
const { bad, notFound, forbidden, conflict, parse } = require('../utils/http');

const createSchema = z.object({
  materia_id: z.coerce.number().int().positive('elige una materia'),
  tema_especifico: z.string().trim().max(200).optional().or(z.literal('')),
  nivel_educativo: z.enum(['colegio', 'pregrado', 'posgrado']),
  modalidad: z.enum(['virtual', 'presencial']),
  tipo: z.enum(['inmediata', 'programada']).default('inmediata'),
  fecha_programada: z.string().datetime({ offset: true }).optional().or(z.literal('')),
  duracion_horas: z.coerce.number().min(0.5, 'mínimo 30 minutos').max(8, 'máximo 8 horas'),
  presupuesto_hora: z.preprocess((v) => (v === '' || v == null ? undefined : v), z.coerce.number().min(0).max(1e7).optional()),
  ciudad: z.string().trim().max(100).optional().or(z.literal('')),
  tutor_objetivo: z.coerce.number().int().positive().optional(),
});

async function create(student, body) {
  const d = parse(createSchema, body);
  if (d.tipo === 'programada') {
    if (!d.fecha_programada) throw bad('Indica la fecha y hora de la tutoría');
    if (new Date(d.fecha_programada) < new Date(Date.now() + 10 * 60000)) throw bad('La fecha debe ser al menos 10 minutos en el futuro');
  }
  if (d.modalidad === 'presencial' && !d.ciudad) throw bad('La ciudad es obligatoria para clases presenciales');
  await requests.expireStale();

  const s = await db.tx((c) => requests.create(c, {
    ...d, estudiante_id: student.id,
    fecha_programada: d.tipo === 'programada' ? d.fecha_programada : null,
  }));

  const ids = new Set(await requests.matchingTutorIds(s));
  if (d.tutor_objetivo) ids.add(d.tutor_objetivo);
  const info = await requests.findById(s.id);
  await Promise.all([...ids].map((tid) => notify(tid, {
    tipo: 'nueva_solicitud',
    titulo: tid === d.tutor_objetivo ? 'Un estudiante quiere reservarte' : 'Nueva solicitud de tutoría',
    mensaje: `${info.estudiante_nombre} busca ayuda en ${info.materia} (${s.duracion_horas} h).`,
  })));
  return { ...info, tutores_viendo: ids.size };
}

async function detailFor(user, id) {
  await requests.expireStale();
  const s = await requests.findById(id);
  if (!s) throw notFound('Solicitud no encontrada');
  if (user.rol === 'estudiante') {
    if (Number(s.estudiante_id) !== user.id) throw forbidden();
    return { ...s, ofertas: await requests.offersOf(id), tutores_viendo: (await requests.matchingTutorIds(s)).length };
  }
  const ofertas = (await requests.offersOf(id)).filter((o) => Number(o.tutor_id) === user.id);
  if (s.estado !== 'activa' && !ofertas.length) throw forbidden('Esta solicitud ya no está disponible');
  const { estudiante, estudiante_id, ...safe } = s; // el tutor solo ve el nombre de pila
  return { ...safe, mi_oferta: ofertas[0] || null };
}

async function cancel(user, id) {
  const s = await requests.findById(id);
  if (!s) throw notFound();
  if (Number(s.estudiante_id) !== user.id) throw forbidden();
  if (s.estado !== 'activa') throw conflict('La solicitud ya no está activa');
  await requests.setStatus(id, 'cancelada');
}

const offerSchema = z.object({
  precio_hora: z.coerce.number().min(1000, 'precio demasiado bajo').max(1e7),
  mensaje: z.string().trim().max(500).optional(),
});

async function makeOffer(tutor, solicitudId, body) {
  const d = parse(offerSchema, body);
  await requests.expireStale();
  const s = await requests.findById(solicitudId);
  if (!s || s.estado !== 'activa') throw conflict('La solicitud ya no está disponible');
  if (Number(s.estudiante_id) === tutor.id) throw forbidden();
  const ttl = s.tipo === 'inmediata' ? config.offerTtlMin : 24 * 60;
  let o;
  try {
    o = await requests.createOffer({ solicitud_id: solicitudId, tutor_id: tutor.id, precio_hora: d.precio_hora, mensaje: d.mensaje, ttl_min: ttl });
  } catch (e) {
    if (e.code === '23505') throw conflict('Ya enviaste una oferta para esta solicitud');
    throw e;
  }
  const me = await db.query(`SELECT nombre FROM lumen.usuarios WHERE id=$1`, [tutor.id]);
  await notify(s.estudiante_id, { tipo: 'oferta_recibida', titulo: 'Recibiste una oferta',
    mensaje: `${me.rows[0].nombre} te ofrece ${s.materia} por $${Number(d.precio_hora).toLocaleString('es-CO')}/hora.` });
  return o;
}

const newRoom = () => `https://${config.jitsiDomain}/lumen-${crypto.randomBytes(6).toString('hex')}`;

// Acepta una oferta: el trigger trg_aceptar_oferta rechaza las demás y marca la solicitud como asignada.
async function acceptOffer(student, ofertaId) {
  await requests.expireStale();
  const created = await db.tx(async (c) => {
    const { rows } = await c.query(`
      SELECT o.*, s.estudiante_id, s.estado AS sol_estado, s.tipo, s.fecha_programada, s.duracion_horas, s.modalidad, m.nombre AS materia
      FROM lumen.ofertas o JOIN lumen.solicitudes s ON s.id = o.solicitud_id JOIN lumen.materias m ON m.id = s.materia_id
      WHERE o.id = $1 FOR UPDATE OF o, s`, [ofertaId]);
    const o = rows[0];
    if (!o) throw notFound('Oferta no encontrada');
    if (Number(o.estudiante_id) !== student.id) throw forbidden();
    if (o.sol_estado !== 'activa' || o.estado !== 'pendiente') throw conflict('Esta oferta ya no está disponible');
    if (new Date(o.expira_en) < new Date()) throw conflict('La oferta expiró');

    await c.query(`UPDATE lumen.ofertas SET estado='aceptada' WHERE id=$1`, [ofertaId]);
    const inicio = o.tipo === 'programada' ? o.fecha_programada : new Date(Date.now() + 5 * 60000);
    const id = await tutorias.createFromOffer(c, {
      solicitud_id: o.solicitud_id, oferta_id: o.id, estudiante_id: student.id, tutor_id: o.tutor_id,
      fecha_inicio: inicio, duracion_horas: o.duracion_horas, precio_hora: o.precio_hora, modalidad: o.modalidad,
      enlace_sala: o.modalidad === 'virtual' ? newRoom() : null,
    });
    o._materia = o.materia;
    return { id, o };
  });
  const { id, o } = created;
  await notify(student.id, { tipo: 'tutoria_confirmada', titulo: '¡Tutoría confirmada!', mensaje: `Tu clase de ${o._materia} quedó agendada.`, tutoria_id: id, externo: true });
  await notify(o.tutor_id, { tipo: 'tutoria_confirmada', titulo: 'Oferta aceptada', mensaje: `Un estudiante aceptó tu propuesta de ${o._materia}.`, tutoria_id: id, externo: true });
  return id;
}

module.exports = { create, detailFor, cancel, makeOffer, acceptOffer };
