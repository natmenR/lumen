const router = require('express').Router();
const { z } = require('zod');
const catalog = require('../repositories/catalog');
const config = require('../config');
const { requireAuth } = require('../middlewares/auth');
const { wrap, notFound, parse } = require('../utils/http');

router.get('/public/stats', wrap(async (_req, res) => res.json(await catalog.stats())));
router.get('/public/config', (_req, res) => res.json({ jitsiDomain: config.jitsiDomain }));
router.get('/materias', wrap(async (_req, res) => res.json(await catalog.materias())));

const searchSchema = z.object({
  materia_id: z.coerce.number().int().positive().optional(),
  nivel: z.enum(['colegio', 'pregrado', 'posgrado']).optional(),
  ciudad: z.string().trim().max(100).optional(),
  zona: z.string().trim().max(100).optional(),
  dia: z.coerce.number().int().min(1).max(7).optional(),
  hora: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  ahora: z.enum(['1', 'true']).optional(),
  q: z.string().trim().max(100).optional(),
});
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

router.get('/tutores', requireAuth, wrap(async (req, res) => {
  const f = parse(searchSchema, clean(req.query));
  res.json(await catalog.searchTutors({ ...f, ahora: !!f.ahora }));
}));

router.get('/tutores/:id', requireAuth, wrap(async (req, res) => {
  const t = await catalog.tutorDetail(Number(req.params.id));
  if (!t) throw notFound('Tutor no encontrado');
  res.json(t);
}));

module.exports = router;
