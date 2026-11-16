const router = require('express').Router();
const requests = require('../services/requests');
const repo = require('../repositories/requests');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { wrap, notFound, forbidden } = require('../utils/http');

router.use(requireAuth);

// ---- Estudiante ----
router.post('/solicitudes', requireRole('estudiante'), wrap(async (req, res) => res.status(201).json(await requests.create(req.user, req.body))));
router.get('/solicitudes/mias', requireRole('estudiante'), wrap(async (req, res) => { await repo.expireStale(); res.json(await repo.byStudent(req.user.id)); }));
router.post('/solicitudes/:id/cancelar', requireRole('estudiante'), wrap(async (req, res) => { await requests.cancel(req.user, Number(req.params.id)); res.json({ ok: true }); }));
router.post('/ofertas/:id/aceptar', requireRole('estudiante'), wrap(async (req, res) => res.json({ tutoria_id: await requests.acceptOffer(req.user, Number(req.params.id)) })));

router.get('/ofertas/:id', requireRole('estudiante'), wrap(async (req, res) => {
  const o = await repo.offerById(Number(req.params.id));
  if (!o) throw notFound('Oferta no encontrada');
  const s = await repo.findById(o.solicitud_id);
  if (Number(s.estudiante_id) !== req.user.id) throw forbidden();
  res.json({ oferta: o, solicitud: s });
}));

// ---- Ambos roles (vista según rol) ----
router.get('/solicitudes/:id', wrap(async (req, res) => res.json(await requests.detailFor(req.user, Number(req.params.id)))));

// ---- Tutor ----
router.post('/solicitudes/:id/ofertas', requireRole('tutor'), wrap(async (req, res) => res.status(201).json(await requests.makeOffer(req.user, Number(req.params.id), req.body))));

module.exports = router;
