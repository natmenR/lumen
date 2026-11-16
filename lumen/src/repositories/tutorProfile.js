const db = require('../db/pool');

const getAvailability = async (tutorId) => (await db.query(`
  SELECT dia_semana, to_char(hora_inicio,'HH24:MI') AS hora_inicio, to_char(hora_fin,'HH24:MI') AS hora_fin
  FROM lumen.disponibilidad_tutor WHERE tutor_id=$1 ORDER BY dia_semana, hora_inicio`, [tutorId])).rows;

async function replaceAvailability(tutorId, slots) {
  return db.tx(async (c) => {
    await c.query(`DELETE FROM lumen.disponibilidad_tutor WHERE tutor_id=$1`, [tutorId]);
    for (const s of slots)
      await c.query(`INSERT INTO lumen.disponibilidad_tutor (tutor_id, dia_semana, hora_inicio, hora_fin) VALUES ($1,$2,$3,$4)`,
        [tutorId, s.dia_semana, s.hora_inicio, s.hora_fin]);
  });
}

async function updateProfile(tutorId, d) {
  return db.tx(async (c) => {
    await c.query(`UPDATE lumen.perfiles_tutor SET
        biografia = COALESCE($2, biografia), ciudad = COALESCE($3, ciudad), zona = COALESCE($4, zona),
        tarifa_hora_base = COALESCE($5, tarifa_hora_base), disponible_ahora = COALESCE($6, disponible_ahora)
      WHERE usuario_id=$1`, [tutorId, d.biografia, d.ciudad, d.zona, d.tarifa_hora_base, d.disponible_ahora]);
    if (d.materias) {
      await c.query(`DELETE FROM lumen.tutor_materias WHERE tutor_id=$1`, [tutorId]);
      for (const m of d.materias)
        await c.query(`INSERT INTO lumen.tutor_materias (tutor_id, materia_id, nivel_educativo) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
          [tutorId, m.materia_id, m.nivel_educativo]);
    }
  });
}

module.exports = { getAvailability, replaceAvailability, updateProfile };
