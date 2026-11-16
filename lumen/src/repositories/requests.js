const db = require('../db/pool');
const config = require('../config');

// Mantenimiento "perezoso": vence ofertas y solicitudes antiguas antes de consultarlas.
async function expireStale() {
  await db.query(`UPDATE lumen.ofertas SET estado='expirada' WHERE estado='pendiente' AND expira_en < NOW()`);
  await db.query(`UPDATE lumen.solicitudes SET estado='expirada'
    WHERE estado='activa' AND ((tipo='inmediata' AND creada_en < NOW() - make_interval(mins => $1::int))
                            OR (tipo='programada' AND fecha_programada < NOW()))`, [config.requestTtlMin]);
}

async function create(c, s) {
  const { rows } = await c.query(`
    INSERT INTO lumen.solicitudes (estudiante_id, materia_id, tema_especifico, nivel_educativo, modalidad, tipo,
                                   fecha_programada, duracion_horas, presupuesto_hora, ciudad)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [s.estudiante_id, s.materia_id, s.tema_especifico || null, s.nivel_educativo, s.modalidad, s.tipo,
     s.fecha_programada || null, s.duracion_horas, s.presupuesto_hora ?? null, s.ciudad || null]);
  return rows[0];
}

const BASE = `
  SELECT s.*, m.nombre AS materia, (ue.nombre || ' ' || ue.apellido) AS estudiante, ue.nombre AS estudiante_nombre,
         (SELECT t.id FROM lumen.tutorias t WHERE t.solicitud_id = s.id) AS tutoria_id
  FROM lumen.solicitudes s
  JOIN lumen.materias m ON m.id = s.materia_id
  JOIN lumen.usuarios ue ON ue.id = s.estudiante_id`;

const findById = async (id) => (await db.query(`${BASE} WHERE s.id = $1`, [id])).rows[0];

const byStudent = async (studentId) =>
  (await db.query(`${BASE} WHERE s.estudiante_id = $1 ORDER BY s.creada_en DESC LIMIT 30`, [studentId])).rows;

const offersOf = async (solicitudId) => (await db.query(`
  SELECT o.id, o.solicitud_id, o.tutor_id, o.precio_hora, o.mensaje, o.estado, o.creada_en, o.expira_en,
         u.nombre, u.apellido, u.avatar_url, pt.calificacion_promedio, pt.total_resenas, pt.disponible_ahora,
         COALESCE((SELECT json_agg(DISTINCT m.nombre) FROM lumen.tutor_materias tm
                   JOIN lumen.materias m ON m.id = tm.materia_id WHERE tm.tutor_id = pt.usuario_id), '[]') AS materias
  FROM lumen.ofertas o
  JOIN lumen.usuarios u ON u.id = o.tutor_id
  JOIN lumen.perfiles_tutor pt ON pt.usuario_id = o.tutor_id
  WHERE o.solicitud_id = $1 AND o.estado IN ('pendiente','aceptada')
  ORDER BY o.precio_hora ASC, pt.calificacion_promedio DESC`, [solicitudId])).rows;

const offerById = async (id) => (await db.query(`
  SELECT o.*, u.nombre, u.apellido, u.avatar_url, pt.biografia, pt.ciudad AS tutor_ciudad, pt.calificacion_promedio, pt.total_resenas,
    COALESCE((SELECT json_agg(DISTINCT m.nombre) FROM lumen.tutor_materias tm JOIN lumen.materias m ON m.id = tm.materia_id WHERE tm.tutor_id = pt.usuario_id), '[]') AS materias,
    COALESCE((SELECT json_agg(r) FROM (SELECT puntaje, titulo, comentario FROM lumen.resenas WHERE tutor_id = pt.usuario_id ORDER BY creada_en DESC LIMIT 3) r), '[]') AS resenas
  FROM lumen.ofertas o
  JOIN lumen.usuarios u ON u.id = o.tutor_id
  JOIN lumen.perfiles_tutor pt ON pt.usuario_id = o.tutor_id
  WHERE o.id = $1`, [id])).rows[0];

const createOffer = async (o) => (await db.query(`
  INSERT INTO lumen.ofertas (solicitud_id, tutor_id, precio_hora, mensaje, expira_en)
  VALUES ($1,$2,$3,$4, NOW() + make_interval(mins => $5::int)) RETURNING *`,
  [o.solicitud_id, o.tutor_id, o.precio_hora, o.mensaje || null, o.ttl_min])).rows[0];

const setStatus = (id, estado) =>
  db.query(`UPDATE lumen.solicitudes SET estado=$2 WHERE id=$1 AND estado='activa'`, [id, estado]);

// Solicitudes activas que ve un tutor. "coincide" = materia y nivel registrados por el tutor.
const availableForTutor = async (tutorId, soloMias) => (await db.query(`
  SELECT * FROM (
    SELECT s.id, s.tema_especifico, s.nivel_educativo, s.modalidad, s.tipo, s.fecha_programada, s.duracion_horas,
           s.presupuesto_hora, s.ciudad, s.creada_en, m.nombre AS materia, ue.nombre AS estudiante,
           EXISTS (SELECT 1 FROM lumen.tutor_materias tm WHERE tm.tutor_id = $1 AND tm.materia_id = s.materia_id
                   AND tm.nivel_educativo = s.nivel_educativo) AS coincide,
           (SELECT o.estado FROM lumen.ofertas o WHERE o.solicitud_id = s.id AND o.tutor_id = $1) AS mi_oferta
    FROM lumen.solicitudes s
    JOIN lumen.materias m ON m.id = s.materia_id
    JOIN lumen.usuarios ue ON ue.id = s.estudiante_id
    WHERE s.estado = 'activa' AND s.estudiante_id <> $1
  ) q WHERE (NOT $2::boolean OR coincide)
  ORDER BY (mi_oferta IS NULL) DESC, coincide DESC, creada_en DESC LIMIT 50`, [tutorId, !!soloMias])).rows;

const matchingTutorIds = async (s) => (await db.query(`
  SELECT pt.usuario_id AS id FROM lumen.perfiles_tutor pt
  JOIN lumen.usuarios u ON u.id = pt.usuario_id AND u.activo
  WHERE u.id <> $1
    AND EXISTS (SELECT 1 FROM lumen.tutor_materias tm WHERE tm.tutor_id = pt.usuario_id
                AND tm.materia_id = $2 AND tm.nivel_educativo = $3::lumen.nivel_educativo)
    AND ($4::text <> 'presencial' OR pt.ciudad ILIKE $5::text)
    AND ($6::text <> 'inmediata' OR pt.disponible_ahora)`,
  [s.estudiante_id, s.materia_id, s.nivel_educativo, s.modalidad, s.ciudad || '%', s.tipo])).rows.map((r) => r.id);

const offersByTutor = async (tutorId) => (await db.query(`
  SELECT o.id, o.precio_hora, o.estado, o.creada_en, o.expira_en, s.id AS solicitud_id, m.nombre AS materia,
         ue.nombre AS estudiante, s.duracion_horas
  FROM lumen.ofertas o JOIN lumen.solicitudes s ON s.id = o.solicitud_id
  JOIN lumen.materias m ON m.id = s.materia_id JOIN lumen.usuarios ue ON ue.id = s.estudiante_id
  WHERE o.tutor_id = $1 ORDER BY o.creada_en DESC LIMIT 30`, [tutorId])).rows;

module.exports = { expireStale, create, findById, byStudent, offersOf, offerById, createOffer, setStatus, availableForTutor, matchingTutorIds, offersByTutor };
