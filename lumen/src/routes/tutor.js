const router = require('express').Router();
const { z } = require('zod');
const requestsRepo = require('../repositories/requests');
const tutoriasRepo = require('../repositories/tutorias');
const profile = require('../repositories/tutorProfile');
const catalog = require('../repositories/catalog');
const tutoriasSvc = require('../services/tutorias');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { wrap, parse, bad } = require('../utils/http');

router.use(requireAuth);

// ---- Panel del estudiante ----
router.get('/estudiante/dashboard', requireRole('estudiante'), wrap(async (req, res) => {
  await requestsRepo.expireStale();
  const [proximas, stats, recomendados, solicitudes] = await Promise.all([
    tutoriasSvc.listFor(req.user, 'proximas'), tutoriasRepo.studentDashboard(req.user.id),
    catalog.recommended(4), requestsRepo.byStudent(req.user.id)]);
  res.json({ proximas: proximas.slice(0, 3), stats, recomendados, solicitud_activa: solicitudes.find((s) => s.estado === 'activa') || null });
}));

// ---- Panel del tutor ----
router.get('/tutor/dashboard', requireRole('tutor'), wrap(async (req, res) => {
  await requestsRepo.expireStale();
  const [proximas, stats, solicitudes, resenas] = await Promise.all([
    tutoriasSvc.listFor(req.user, 'proximas'), tutoriasRepo.tutorStats(req.user.id),
    requestsRepo.availableForTutor(req.user.id, true), tutoriasRepo.reviewsOfTutor(req.user.id, 3)]);
  res.json({ proximas: proximas.slice(0, 3), stats, solicitudes: solicitudes.slice(0, 4), resenas });
}));

router.get('/tutor/solicitudes', requireRole('tutor'), wrap(async (req, res) => {
  await requestsRepo.expireStale();
  res.json(await requestsRepo.availableForTutor(req.user.id, req.query.todas !== '1'));
}));

router.get('/tutor/ofertas', requireRole('tutor'), wrap(async (req, res) => { await requestsRepo.expireStale(); res.json(await requestsRepo.offersByTutor(req.user.id)); }));

// ---- Disponibilidad y perfil ----
router.get('/tutor/disponibilidad', requireRole('tutor'), wrap(async (req, res) => res.json(await profile.getAvailability(req.user.id))));

const slotSchema = z.array(z.object({
  dia_semana: z.coerce.number().int().min(1).max(7),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fin: z.string().regex(/^\d{2}:\d{2}$/),
})).max(40);

router.put('/tutor/disponibilidad', requireRole('tutor'), wrap(async (req, res) => {
  const slots = parse(slotSchema, req.body.franjas);
  if (slots.some((s) => s.hora_fin <= s.hora_inicio)) throw bad('La hora final debe ser posterior a la inicial');
  await profile.replaceAvailability(req.user.id, slots);
  res.json(await profile.getAvailability(req.user.id));
}));

const profileSchema = z.object({
  biografia: z.string().trim().max(1000).optional(),
  ciudad: z.string().trim().max(100).optional(),
  zona: z.string().trim().max(100).optional(),
  tarifa_hora_base: z.coerce.number().min(0).max(1e7).optional(),
  disponible_ahora: z.boolean().optional(),
  materias: z.array(z.object({ materia_id: z.coerce.number().int().positive(), nivel_educativo: z.enum(['colegio', 'pregrado', 'posgrado']) })).max(40).optional(),
});

router.put('/tutor/perfil', requireRole('tutor'), wrap(async (req, res) => {
  await profile.updateProfile(req.user.id, parse(profileSchema, req.body));
  res.json({ ok: true });
}));

module.exports = router;
