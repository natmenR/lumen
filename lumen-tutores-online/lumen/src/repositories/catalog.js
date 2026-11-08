const db = require('../db/pool');

const materias = async () => (await db.query(`SELECT id, nombre, area FROM lumen.materias ORDER BY nombre`)).rows;

async function stats() {
  const { rows } = await db.query(`
    SELECT (SELECT COUNT(*) FROM lumen.perfiles_tutor)::int AS tutores,
           (SELECT COUNT(*) FROM lumen.materias)::int AS materias,
           (SELECT COALESCE(ROUND(AVG(calificacion_promedio) FILTER (WHERE total_resenas > 0), 1), 0) FROM lumen.perfiles_tutor) AS calificacion,
           (SELECT COUNT(*) FROM lumen.tutorias WHERE estado='finalizada')::int AS tutorias`);
  return rows[0];
}

const TUTOR_CARD = `
  u.id, u.nombre, u.apellido, u.avatar_url, pt.biografia, pt.ciudad, pt.zona, pt.tarifa_hora_base,
  pt.disponible_ahora, pt.calificacion_promedio, pt.total_resenas,
  COALESCE((SELECT json_agg(DISTINCT m.nombre) FROM lumen.tutor_materias tm
            JOIN lumen.materias m ON m.id = tm.materia_id WHERE tm.tutor_id = pt.usuario_id), '[]') AS materias`;

// Búsqueda por materia, nivel, área geográfica y disponibilidad (día/hora o "disponible ahora").
async function searchTutors(f) {
  const { rows } = await db.query(`
    SELECT ${TUTOR_CARD}
    FROM lumen.perfiles_tutor pt JOIN lumen.usuarios u ON u.id = pt.usuario_id
    WHERE u.activo
      AND ($1::int IS NULL OR EXISTS (SELECT 1 FROM lumen.tutor_materias tm
            WHERE tm.tutor_id = pt.usuario_id AND tm.materia_id = $1::int
              AND ($2::text IS NULL OR tm.nivel_educativo::text = $2::text)))
      AND ($2::text IS NULL OR $1::int IS NOT NULL OR EXISTS (SELECT 1 FROM lumen.tutor_materias tm
            WHERE tm.tutor_id = pt.usuario_id AND tm.nivel_educativo::text = $2::text))
      AND ($3::text IS NULL OR pt.ciudad ILIKE '%' || $3::text || '%')
      AND ($4::text IS NULL OR pt.zona ILIKE '%' || $4::text || '%')
      AND ($5::int IS NULL OR EXISTS (SELECT 1 FROM lumen.disponibilidad_tutor d
            WHERE d.tutor_id = pt.usuario_id AND d.dia_semana = $5::int
              AND ($6::time IS NULL OR (d.hora_inicio <= $6::time AND d.hora_fin > $6::time))))
      AND (NOT $7::boolean OR pt.disponible_ahora)
      AND ($8::text IS NULL OR (u.nombre || ' ' || u.apellido) ILIKE '%' || $8::text || '%'
            OR EXISTS (SELECT 1 FROM lumen.tutor_materias tm JOIN lumen.materias m ON m.id = tm.materia_id
                       WHERE tm.tutor_id = pt.usuario_id AND m.nombre ILIKE '%' || $8::text || '%'))
    ORDER BY pt.disponible_ahora DESC, pt.calificacion_promedio DESC, u.nombre
    LIMIT 60`,
    [f.materia_id ?? null, f.nivel ?? null, f.ciudad ?? null, f.zona ?? null, f.dia ?? null, f.hora ?? null, !!f.ahora, f.q ?? null]);
  return rows;
}

async function tutorDetail(id) {
  const { rows } = await db.query(`
    SELECT ${TUTOR_CARD},
      COALESCE((SELECT json_agg(json_build_object('materia_id', tm.materia_id, 'materia', m.nombre, 'nivel_educativo', tm.nivel_educativo) ORDER BY m.nombre)
                FROM lumen.tutor_materias tm JOIN lumen.materias m ON m.id = tm.materia_id WHERE tm.tutor_id = pt.usuario_id), '[]') AS materias_nivel,
      COALESCE((SELECT json_agg(json_build_object('dia_semana', d.dia_semana, 'hora_inicio', to_char(d.hora_inicio,'HH24:MI'), 'hora_fin', to_char(d.hora_fin,'HH24:MI')) ORDER BY d.dia_semana, d.hora_inicio)
                FROM lumen.disponibilidad_tutor d WHERE d.tutor_id = pt.usuario_id), '[]') AS disponibilidad,
      COALESCE((SELECT json_agg(r ORDER BY r.creada_en DESC) FROM (
                SELECT rs.puntaje, rs.titulo, rs.comentario, rs.creada_en, ue.nombre AS estudiante
                FROM lumen.resenas rs JOIN lumen.usuarios ue ON ue.id = rs.estudiante_id
                WHERE rs.tutor_id = pt.usuario_id ORDER BY rs.creada_en DESC LIMIT 6) r), '[]') AS resenas
    FROM lumen.perfiles_tutor pt JOIN lumen.usuarios u ON u.id = pt.usuario_id
    WHERE u.id = $1 AND u.activo`, [id]);
  return rows[0];
}

const recommended = async (limit = 4) => (await db.query(`
  SELECT ${TUTOR_CARD} FROM lumen.perfiles_tutor pt JOIN lumen.usuarios u ON u.id = pt.usuario_id
  WHERE u.activo ORDER BY pt.disponible_ahora DESC, pt.calificacion_promedio DESC, pt.total_resenas DESC LIMIT $1`, [limit])).rows;

module.exports = { materias, stats, searchTutors, tutorDetail, recommended };
