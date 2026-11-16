const db = require('../db/pool');

const BASE = `
  SELECT t.id, t.solicitud_id, t.oferta_id, t.estudiante_id, t.tutor_id, t.fecha_inicio, t.duracion_horas,
         t.precio_hora, t.precio_total, t.modalidad, t.enlace_sala, t.estado, t.creada_en,
         m.nombre AS materia, s.tema_especifico, s.nivel_educativo, s.ciudad,
         ue.nombre AS estudiante_nombre, (ue.nombre || ' ' || ue.apellido) AS estudiante,
         ut.nombre AS tutor_nombre, (ut.nombre || ' ' || ut.apellido) AS tutor,
         pt.calificacion_promedio AS tutor_calificacion,
         (r.id IS NOT NULL) AS tiene_resena
  FROM lumen.tutorias t
  JOIN lumen.solicitudes s ON s.id = t.solicitud_id
  JOIN lumen.materias m ON m.id = s.materia_id
  JOIN lumen.usuarios ue ON ue.id = t.estudiante_id
  JOIN lumen.usuarios ut ON ut.id = t.tutor_id
  JOIN lumen.perfiles_tutor pt ON pt.usuario_id = t.tutor_id
  LEFT JOIN lumen.resenas r ON r.tutoria_id = t.id`;

const findById = async (id) => (await db.query(`${BASE} WHERE t.id = $1`, [id])).rows[0];

async function listForUser(userId, grupo, limit = 50) {
  const estados = grupo === 'historial' ? ['finalizada', 'cancelada'] : ['confirmada', 'en_curso'];
  const order = grupo === 'historial' ? 'DESC' : 'ASC';
  return (await db.query(
    `${BASE} WHERE (t.estudiante_id = $1 OR t.tutor_id = $1) AND t.estado = ANY($2::lumen.estado_tutoria[])
     ORDER BY t.fecha_inicio ${order} LIMIT $3`, [userId, estados, limit])).rows;
}

async function createFromOffer(c, d) {
  const { rows } = await c.query(`
    INSERT INTO lumen.tutorias (solicitud_id, oferta_id, estudiante_id, tutor_id, fecha_inicio, duracion_horas, precio_hora, modalidad, enlace_sala)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [d.solicitud_id, d.oferta_id, d.estudiante_id, d.tutor_id, d.fecha_inicio, d.duracion_horas, d.precio_hora, d.modalidad, d.enlace_sala]);
  return rows[0].id;
}

const setStatus = (id, estado) => db.query(`UPDATE lumen.tutorias SET estado=$2 WHERE id=$1`, [id, estado]);

const addReview = async (r) => (await db.query(`
  INSERT INTO lumen.resenas (tutoria_id, estudiante_id, tutor_id, puntaje, titulo, comentario)
  VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [r.tutoria_id, r.estudiante_id, r.tutor_id, r.puntaje, r.titulo || null, r.comentario || null])).rows[0];

const studentDashboard = async (id) => (await db.query(`
  SELECT (SELECT COUNT(*) FROM lumen.tutorias WHERE estudiante_id=$1 AND estado='finalizada')::int AS completadas,
         (SELECT COUNT(*) FROM lumen.tutorias WHERE estudiante_id=$1 AND estado IN ('confirmada','en_curso'))::int AS proximas`, [id])).rows[0];

const tutorStats = async (id) => (await db.query(`
  SELECT (SELECT COUNT(*) FROM lumen.tutorias WHERE tutor_id=$1 AND estado IN ('confirmada','en_curso'))::int AS proximas,
         (SELECT COUNT(*) FROM lumen.tutorias WHERE tutor_id=$1 AND estado='finalizada')::int AS completadas,
         (SELECT COUNT(*) FROM lumen.ofertas WHERE tutor_id=$1 AND estado='pendiente' AND expira_en > NOW())::int AS ofertas_pendientes,
         (SELECT COALESCE(SUM(precio_total),0) FROM lumen.tutorias WHERE tutor_id=$1 AND estado='finalizada'
            AND date_trunc('month', fecha_inicio) = date_trunc('month', NOW())) AS ingresos_mes`, [id])).rows[0];

const reviewsOfTutor = async (id, limit = 3) => (await db.query(`
  SELECT rs.puntaje, rs.titulo, rs.comentario, rs.creada_en, ue.nombre AS estudiante
  FROM lumen.resenas rs JOIN lumen.usuarios ue ON ue.id = rs.estudiante_id
  WHERE rs.tutor_id=$1 ORDER BY rs.creada_en DESC LIMIT $2`, [id, limit])).rows;

module.exports = { findById, listForUser, createFromOffer, setStatus, addReview, studentDashboard, tutorStats, reviewsOfTutor };
