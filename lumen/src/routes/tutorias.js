const router = require('express').Router();
const svc = require('../services/tutorias');
const notifications = require('../repositories/notifications');
const ai = require('../services/ai');
const { requireAuth, requireRole } = require('../middlewares/auth');
const { wrap } = require('../utils/http');

router.use(requireAuth);

router.get('/tutorias', wrap(async (req, res) => res.json(await svc.listFor(req.user, req.query.grupo))));
router.get('/tutorias/:id', wrap(async (req, res) => res.json(await svc.getFor(req.user, Number(req.params.id)))));
router.post('/tutorias/:id/entrar', wrap(async (req, res) => res.json(await svc.enter(req.user, Number(req.params.id)))));
router.post('/tutorias/:id/finalizar', wrap(async (req, res) => { await svc.finish(req.user, Number(req.params.id)); res.json({ ok: true }); }));
router.post('/tutorias/:id/cancelar', wrap(async (req, res) => { await svc.cancel(req.user, Number(req.params.id)); res.json({ ok: true }); }));
router.post('/tutorias/:id/resena', wrap(async (req, res) => { await svc.review(req.user, Number(req.params.id), req.body); res.status(201).json({ ok: true }); }));

router.get('/notificaciones', wrap(async (req, res) => res.json({ items: await notifications.list(req.user.id), no_leidas: await notifications.unread(req.user.id) })));
router.post('/notificaciones/leer', wrap(async (req, res) => { await notifications.markAllRead(req.user.id); res.json({ ok: true }); }));

// IA generativa
router.post('/ia/solicitud', requireRole('estudiante'), wrap(async (req, res) => res.json(await ai.solicitud(req.body))));
router.post('/ia/oferta', requireRole('tutor'), wrap(async (req, res) => res.json(await ai.oferta(req.user, Number(req.body.solicitud_id)))));

module.exports = router;
