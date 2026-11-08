const db = require('../db/pool');

const PUBLIC = `u.id, u.nombre, u.apellido, u.correo, u.rol, u.telefono, u.avatar_url, u.creado_en`;

const findByEmail = async (correo) =>
  (await db.query(`SELECT * FROM lumen.usuarios WHERE LOWER(correo)=LOWER($1)`, [correo])).rows[0];

async function findById(id) {
  const { rows } = await db.query(`
    SELECT ${PUBLIC},
      row_to_json(pe) AS perfil_estudiante,
      (SELECT row_to_json(x) FROM (
         SELECT pt.biografia, pt.ciudad, pt.zona, pt.tarifa_hora_base, pt.disponible_ahora,
                pt.calificacion_promedio, pt.total_resenas,
                COALESCE((SELECT json_agg(json_build_object('materia_id', tm.materia_id, 'materia', m.nombre, 'nivel_educativo', tm.nivel_educativo) ORDER BY m.nombre)
                          FROM lumen.tutor_materias tm JOIN lumen.materias m ON m.id = tm.materia_id
                          WHERE tm.tutor_id = pt.usuario_id), '[]') AS materias
       ) x WHERE pt.usuario_id IS NOT NULL) AS perfil_tutor
    FROM lumen.usuarios u
    LEFT JOIN lumen.perfiles_estudiante pe ON pe.usuario_id = u.id
    LEFT JOIN lumen.perfiles_tutor pt ON pt.usuario_id = u.id
    WHERE u.id = $1 AND u.activo`, [id]);
  return rows[0];
}

async function create(c, u) {
  const { rows } = await c.query(
    `INSERT INTO lumen.usuarios (nombre, apellido, correo, password_hash, rol, telefono)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, rol`,
    [u.nombre, u.apellido, u.correo.toLowerCase(), u.password_hash, u.rol, u.telefono || null]);
  const id = rows[0].id;
  if (u.rol === 'estudiante')
    await c.query(`INSERT INTO lumen.perfiles_estudiante (usuario_id, nivel_educativo, institucion, ciudad) VALUES ($1,$2,$3,$4)`,
      [id, u.nivel_educativo || 'pregrado', u.institucion || null, u.ciudad || null]);
  else
    await c.query(`INSERT INTO lumen.perfiles_tutor (usuario_id, ciudad) VALUES ($1,$2)`, [id, u.ciudad || null]);
  return rows[0];
}

const updateBasic = (c, id, d) => c.query(
  `UPDATE lumen.usuarios SET nombre=COALESCE($2,nombre), apellido=COALESCE($3,apellido), telefono=COALESCE($4,telefono) WHERE id=$1`,
  [id, d.nombre, d.apellido, d.telefono]);

const updateStudentProfile = (c, id, d) => c.query(
  `UPDATE lumen.perfiles_estudiante SET nivel_educativo=COALESCE($2::lumen.nivel_educativo, nivel_educativo),
     institucion=COALESCE($3,institucion), ciudad=COALESCE($4,ciudad) WHERE usuario_id=$1`,
  [id, d.nivel_educativo, d.institucion, d.ciudad]);

const setPassword = (c, id, hash) => c.query(`UPDATE lumen.usuarios SET password_hash=$2, proveedor_auth='local' WHERE id=$1`, [id, hash]);

const saveResetToken = (id, tokenHash, minutes) => db.query(
  `INSERT INTO lumen.tokens_recuperacion (usuario_id, token_hash, expira_en) VALUES ($1,$2, NOW() + make_interval(mins => $3::int))`,
  [id, tokenHash, minutes]);

const findResetToken = async (tokenHash) => (await db.query(
  `SELECT * FROM lumen.tokens_recuperacion WHERE token_hash=$1 AND NOT usado AND expira_en > NOW()`, [tokenHash])).rows[0];

const markTokenUsed = (c, id) => c.query(`UPDATE lumen.tokens_recuperacion SET usado=TRUE WHERE id=$1`, [id]);

module.exports = { findByEmail, findById, create, updateBasic, updateStudentProfile, setPassword, saveResetToken, findResetToken, markTokenUsed };
