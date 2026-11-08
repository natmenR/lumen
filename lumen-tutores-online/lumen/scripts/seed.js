// Datos demo adicionales (idempotente): más tutores, solicitudes abiertas y reseñas.
// Contraseña de todos los usuarios demo: Lumen123*  (o DEMO_PASSWORD)
const bcrypt = require('bcryptjs');
const db = require('../src/db/pool');
const config = require('../src/config');
const bootstrap = require('../src/db/bootstrap');

const q = (t, p) => db.query(t, p);
const one = async (t, p) => (await q(t, p)).rows[0];

async function user(nombre, apellido, correo, rol, hash) {
  const ex = await one(`SELECT id FROM lumen.usuarios WHERE correo=$1`, [correo]);
  if (ex) return ex.id;
  return (await one(`INSERT INTO lumen.usuarios (nombre,apellido,correo,password_hash,rol) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
    [nombre, apellido, correo, hash, rol])).id;
}

(async () => {
  await bootstrap();
  const hash = await bcrypt.hash(config.demoPassword, 10);
  const M = Object.fromEntries((await q(`SELECT id, nombre FROM lumen.materias`)).rows.map((m) => [m.nombre, m.id]));
  const id = async (c) => (await one(`SELECT id FROM lumen.usuarios WHERE correo=$1`, [c])).id;

  if (await one(`SELECT 1 FROM lumen.usuarios WHERE correo='laura@lumen.com'`)) { console.log('Seed ya aplicado.'); return db.pool.end(); }

  const laura = await user('Laura', 'Gómez', 'laura@lumen.com', 'tutor', hash);
  const carlos = await user('Carlos', 'Díaz', 'carlos@lumen.com', 'tutor', hash);
  const sofia = await user('Sofía', 'Ramírez', 'sofia@lumen.com', 'tutor', hash);
  const [julia, natalia, monica, andres, camila, juan] = await Promise.all(
    ['julia', 'natalia', 'monica', 'andres', 'camila', 'juan'].map((n) => id(`${n}@lumen.com`)));

  const tutors = [
    [laura, 'Química de la Universidad del Atlántico. Explico con laboratorios caseros y ejemplos cotidianos.', 'Barranquilla', 'Norte', 30000, true],
    [carlos, 'Profesor certificado en inglés (B2-C1). Conversación, TOEFL y refuerzo escolar.', 'Barranquilla', 'Centro', 45000, true],
    [sofia, 'Ingeniera con maestría en física aplicada. Mecánica, electromagnetismo y programación.', 'Soledad', 'Centro', 35000, false],
  ];
  for (const [uid, bio, ciudad, zona, tarifa, ahora] of tutors)
    await q(`INSERT INTO lumen.perfiles_tutor (usuario_id,biografia,ciudad,zona,tarifa_hora_base,disponible_ahora) VALUES ($1,$2,$3,$4,$5,$6)`, [uid, bio, ciudad, zona, tarifa, ahora]);
  await q(`UPDATE lumen.perfiles_tutor SET zona='Norte' WHERE usuario_id=$1`, [andres]);
  await q(`UPDATE lumen.perfiles_tutor SET zona='Centro' WHERE usuario_id=$1`, [camila]);
  await q(`UPDATE lumen.perfiles_tutor SET zona='Alto Prado' WHERE usuario_id=$1`, [juan]);

  const tm = [
    [laura, 'Química', 'pregrado'], [laura, 'Química', 'colegio'], [laura, 'Física', 'colegio'],
    [carlos, 'Inglés', 'colegio'], [carlos, 'Inglés', 'pregrado'], [carlos, 'Inglés', 'posgrado'],
    [sofia, 'Física', 'pregrado'], [sofia, 'Física', 'colegio'], [sofia, 'Programación', 'pregrado'],
    [andres, 'Física', 'pregrado'], [camila, 'Química', 'colegio'],
  ];
  for (const [t, m, n] of tm) await q(`INSERT INTO lumen.tutor_materias VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [t, M[m], n]);

  const av = [[laura, 1, '08:00', '12:00'], [laura, 4, '14:00', '19:00'], [carlos, 2, '15:00', '20:00'], [carlos, 5, '09:00', '13:00'],
              [sofia, 3, '10:00', '16:00'], [camila, 4, '14:00', '18:00'], [juan, 2, '18:00', '21:00']];
  for (const [t, d, a, b] of av) await q(`INSERT INTO lumen.disponibilidad_tutor (tutor_id,dia_semana,hora_inicio,hora_fin) VALUES ($1,$2,$3,$4)`, [t, d, a, b]);

  // Historial con reseñas: solicitud → oferta aceptada → tutoría finalizada → reseña
  async function pasada(est, tutor, materia, nivel, precio, puntaje, titulo, comentario, dias) {
    const s = await one(`INSERT INTO lumen.solicitudes (estudiante_id,materia_id,nivel_educativo,modalidad,tipo,duracion_horas,presupuesto_hora)
      VALUES ($1,$2,$3,'virtual','inmediata',1,$4) RETURNING id`, [est, M[materia], nivel, precio]);
    const o = await one(`INSERT INTO lumen.ofertas (solicitud_id,tutor_id,precio_hora,expira_en) VALUES ($1,$2,$3,NOW()) RETURNING id`, [s.id, tutor, precio]);
    await q(`UPDATE lumen.ofertas SET estado='aceptada' WHERE id=$1`, [o.id]);
    const t = await one(`INSERT INTO lumen.tutorias (solicitud_id,oferta_id,estudiante_id,tutor_id,fecha_inicio,duracion_horas,precio_hora,modalidad,enlace_sala,estado)
      VALUES ($1,$2,$3,$4,NOW() - make_interval(days => $5::int),1,$6,'virtual',NULL,'finalizada') RETURNING id`, [s.id, o.id, est, tutor, dias, precio]);
    await q(`INSERT INTO lumen.resenas (tutoria_id,estudiante_id,tutor_id,puntaje,titulo,comentario) VALUES ($1,$2,$3,$4,$5,$6)`, [t.id, est, tutor, puntaje, titulo, comentario]);
  }
  await pasada(julia, camila, 'Cálculo Diferencial', 'pregrado', 22000, 5, 'Excelente profesora', 'Explica los temas de manera clara y se asegura de que todos comprendan. Paciente y con mucho dominio.', 12);
  await pasada(natalia, andres, 'Cálculo Diferencial', 'pregrado', 24000, 5, 'Muy buen docente', 'Sus clases son dinámicas, explica con ejemplos y siempre resuelve las dudas.', 9);
  await pasada(monica, juan, 'Programación', 'pregrado', 27000, 4, 'Gran profesor', 'Se destaca por su conocimiento y motiva a aprender en un ambiente agradable.', 7);
  await pasada(julia, laura, 'Química', 'pregrado', 30000, 5, 'Hizo fácil lo difícil', 'Los ejemplos cotidianos me ayudaron muchísimo con estequiometría.', 5);
  await pasada(natalia, carlos, 'Inglés', 'pregrado', 45000, 5, 'Súper recomendado', 'Clases amenas, corrige la pronunciación sin hacerte sentir mal.', 3);
  await pasada(monica, andres, 'Física', 'pregrado', 25000, 5, 'Claro y paciente', 'Entendí cinemática en una sola sesión.', 2);

  // Solicitudes abiertas (las del prototipo del tutor)
  await q(`INSERT INTO lumen.solicitudes (estudiante_id,materia_id,tema_especifico,nivel_educativo,modalidad,tipo,fecha_programada,duracion_horas,presupuesto_hora)
    VALUES ($1,$2,'Estequiometría','pregrado','virtual','programada',NOW() + INTERVAL '2 days',1,30000)`, [natalia, M['Química']]);
  await q(`INSERT INTO lumen.solicitudes (estudiante_id,materia_id,tema_especifico,nivel_educativo,modalidad,tipo,fecha_programada,duracion_horas,presupuesto_hora)
    VALUES ($1,$2,'Conversación B1','colegio','virtual','programada',NOW() + INTERVAL '3 days',1,50000)`, [monica, M['Inglés']]);

  console.log('Seed aplicado: 3 tutores nuevos, historial con reseñas y 2 solicitudes abiertas.');
  await db.pool.end();
})().catch((e) => { console.error(e); process.exit(1); });
