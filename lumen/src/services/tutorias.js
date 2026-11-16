const { z } = require('zod');
const tutorias = require('../repositories/tutorias');
const { notify } = require('./notifier');
const { notFound, forbidden, conflict, parse } = require('../utils/http');

const EARLY_MS = 15 * 60000;

function decorate(t) {
  const start = new Date(t.fecha_inicio).getTime();
  const end = start + Number(t.duracion_horas) * 3600000;
  const now = Date.now();
  return { ...t, puede_entrar: ['confirmada', 'en_curso'].includes(t.estado) && now >= start - EARLY_MS && now <= end + 30 * 60000, termina_en: new Date(end).toISOString() };
}

async function getFor(user, id) {
  const t = await tutorias.findById(id);
  if (!t) throw notFound('Tutoría no encontrada');
  if (![Number(t.estudiante_id), Number(t.tutor_id)].includes(user.id)) throw forbidden();
  return decorate(t);
}

async function listFor(user, grupo) {
  return (await tutorias.listForUser(user.id, grupo === 'historial' ? 'historial' : 'proximas')).map(decorate);
}

async function enter(user, id) {
  const t = await getFor(user, id);
  if (!t.puede_entrar) throw conflict('La sala se habilita 15 minutos antes de la hora acordada');
  if (t.estado === 'confirmada') await tutorias.setStatus(id, 'en_curso');
  return getFor(user, id);
}

async function finish(user, id) {
  const t = await getFor(user, id);
  if (Number(t.tutor_id) !== user.id) throw forbidden('Solo el tutor puede finalizar la clase');
  if (!['confirmada', 'en_curso'].includes(t.estado)) throw conflict('La tutoría ya no está activa');
  await tutorias.setStatus(id, 'finalizada');
  await notify(t.estudiante_id, { tipo: 'tutoria_finalizada', titulo: 'Clase finalizada', mensaje: `Cuéntanos cómo te fue con ${t.tutor_nombre}.`, tutoria_id: id });
}

async function cancel(user, id) {
  const t = await getFor(user, id);
  if (t.estado !== 'confirmada') throw conflict('Solo se pueden cancelar tutorías confirmadas');
  await tutorias.setStatus(id, 'cancelada');
  const other = Number(t.estudiante_id) === user.id ? t.tutor_id : t.estudiante_id;
  await notify(other, { tipo: 'tutoria_cancelada', titulo: 'Tutoría cancelada', mensaje: `La clase de ${t.materia} fue cancelada.`, tutoria_id: id, externo: true });
}

const reviewSchema = z.object({
  puntaje: z.coerce.number().int().min(1, 'elige de 1 a 5').max(5),
  titulo: z.string().trim().max(100).optional(),
  comentario: z.string().trim().max(1000).optional(),
});

async function review(user, id, body) {
  const d = parse(reviewSchema, body);
  const t = await getFor(user, id);
  if (Number(t.estudiante_id) !== user.id) throw forbidden('Solo el estudiante puede calificar');
  if (t.estado !== 'finalizada') throw conflict('Solo puedes calificar tutorías finalizadas');
  if (t.tiene_resena) throw conflict('Ya calificaste esta tutoría');
  await tutorias.addReview({ tutoria_id: id, estudiante_id: user.id, tutor_id: t.tutor_id, ...d });
  await notify(t.tutor_id, { tipo: 'resena', titulo: 'Nueva reseña', mensaje: `Recibiste ${d.puntaje} ★ en ${t.materia}.`, tutoria_id: id });
}

module.exports = { getFor, listFor, enter, finish, cancel, review };
