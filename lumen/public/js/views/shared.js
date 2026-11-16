import { api } from '../api.js';
import { state, mount, go, every, onLeave, loadUser, setUnread } from '../core.js';
import { esc, $, $$, on, run, toast, formData, money, NIVELES, ESTADOS, fmtWhen, fmtDate, hours, hms, stars, avatar, icon } from '../ui.js';
import { tutoriaCard, emptyBox } from './parts.js';

// ---------------------------------------------------------------- Mis tutorías / videollamadas
export async function tutorias() {
  const { el, alive } = mount('#/tutorias', 'Mis tutorías');
  const role = state.user.rol;
  const load = async (grupo) => {
    const list = await api.get('/tutorias', { grupo });
    if (!alive()) return;
    $('#list', el).innerHTML = list.length ? list.map((t) => tutoriaCard(t, role)).join('')
      : emptyBox(grupo === 'proximas' ? 'No tienes clases próximas.' : 'Aún no tienes clases en el historial.',
          role === 'estudiante' && grupo === 'proximas' ? '<a href="#/estudiante/solicitud/nueva">Pedir ayuda ahora</a>' : '');
  };
  el.innerHTML = `<div class="seg" role="radiogroup" aria-label="Filtrar" style="margin-bottom:16px"><input type="radio" name="g" id="g1" value="proximas" checked><label for="g1">Próximas</label>
    <input type="radio" name="g" id="g2" value="historial"><label for="g2">Historial</label></div><div class="grid g2" id="list"><div class="spin"></div></div>`;
  on(el, 'change', '[name=g]', (_e, r) => load(r.value));
  await load('proximas');
  every(() => load($('[name=g]:checked', el)?.value || 'proximas').catch(() => {}), 30000);
}

// ---------------------------------------------------------------- Detalle de tutoría, preparación de clase y sala
function icsFile(t) {
  const f = (d) => new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const end = new Date(new Date(t.fecha_inicio).getTime() + t.duracion_horas * 3600000);
  const txt = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lumen//ES', 'BEGIN:VEVENT', `UID:lumen-${t.id}@lumen`, `DTSTAMP:${f(new Date())}`,
    `DTSTART:${f(t.fecha_inicio)}`, `DTEND:${f(end)}`, `SUMMARY:Tutoría de ${t.materia} en Lumen`, `DESCRIPTION:${t.modalidad === 'virtual' ? 'Sala: ' + (t.enlace_sala || '') : 'Clase presencial'}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' }));
  a.download = `lumen-tutoria-${t.id}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export async function tutoria({ params }) {
  const { el, alive } = mount('#/tutorias', params.mode === 'sala' ? 'Sala de clase' : 'Tu tutoría');
  const isTutor = state.user.rol === 'tutor';
  let t = await api.get('/tutorias/' + params.id);
  if (!alive()) return;
  let stream = null;
  const stop = () => stream?.getTracks().forEach((x) => x.stop());
  onLeave(stop);
  const me = state.user.nombre;

  if (params.mode === 'sala') return sala();

  function draw() {
    const live = ['confirmada', 'en_curso'].includes(t.estado);
    const [label, cls] = ESTADOS[t.estado];
    const confirm = params.mode === 'confirmada' && live
      ? `<div class="banner-ok" style="margin-bottom:18px"><div class="ok-ico">${icon('check')}</div><div class="grow"><h2>${isTutor ? '¡Tutoría confirmada!' : `¡Listo, ${esc(me)}!`}</h2>
         <p>${isTutor ? `${esc(t.estudiante_nombre)} aceptó tu oferta` : `${esc(t.tutor_nombre)} aceptó tu solicitud`} · ${esc(t.materia)} · ${fmtWhen(t.fecha_inicio)}</p></div>
         <button class="btn btn-ghost btn-sm" data-ics>${icon('cal')} Agregar a mi calendario</button></div>` : '';
    const start = new Date(t.fecha_inicio).getTime();
    el.innerHTML = `${confirm}<div class="grid g2" style="grid-template-columns:1.5fr 1fr;align-items:start">
      <div class="card stack">
        <div class="row between"><h2>${live ? 'Tu clase está por comenzar' : esc(t.materia)}</h2><span class="chip ${cls}">${label}</span></div>
        ${live ? `<div><p class="muted small">${Date.now() < start ? 'Empieza en' : 'Ya puedes entrar'}</p><p class="countdown" id="cd" aria-live="off">--:--</p></div>` : ''}
        ${t.modalidad === 'virtual' ? `<div class="call" aria-label="Vista previa de participantes"><div class="tile">${avatar(t.tutor_nombre)}<span class="nm">${esc(t.tutor_nombre)}${isTutor ? '' : ' (tutor)'}</span></div>
          <div class="tile" id="me">${avatar(t.estudiante_nombre)}<span class="nm">${isTutor ? esc(t.estudiante_nombre) : 'Tú'}</span></div></div>
          <div class="ctrls"><button class="ctrl" data-cam aria-pressed="false" aria-label="Probar cámara y micrófono" title="Probar cámara y micrófono">${icon('video')}</button><button class="ctrl" data-mic aria-pressed="false" aria-label="Silenciar micrófono">${icon('mic')}</button></div>
          <p class="hint center">Prueba tu cámara y micrófono antes de entrar. Todo ocurre en tu navegador, no se graba nada.</p>`
        : `<div class="card" style="background:var(--sand-2)"><h3>Clase presencial</h3><p class="muted">Ciudad: ${esc(t.ciudad || 'por definir')}. Coordina el punto de encuentro con ${esc(isTutor ? t.estudiante_nombre : t.tutor_nombre)} por los canales de contacto.</p></div>`}
        ${live && t.modalidad === 'virtual' ? `<button class="btn btn-amber btn-block" data-enter ${t.puede_entrar ? '' : 'disabled'}>${t.puede_entrar ? 'Entrar a la sala' : 'La sala se habilita 15 min antes'}</button>` : ''}
      </div>
      <aside class="stack"><div class="card summary"><h3 style="margin-bottom:10px">Detalles</h3><dl>
        <dt>Materia</dt><dd>${esc(t.materia)}</dd><dt>Tema</dt><dd>${esc(t.tema_especifico || 'General')}</dd><dt>${isTutor ? 'Estudiante' : 'Tutor'}</dt><dd>${esc(isTutor ? t.estudiante : t.tutor)}</dd>
        <dt>Fecha</dt><dd>${fmtWhen(t.fecha_inicio)}</dd><dt>Duración</dt><dd>${hours(t.duracion_horas)}</dd><dt>Modalidad</dt><dd>${t.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}</dd>
        <dt>Precio acordado</dt><dd><b>${money(t.precio_total)}</b></dd></dl></div>
        <div class="card stack"><button class="btn btn-ghost btn-sm" data-ics>${icon('cal')} Agregar a mi calendario</button>
          ${live && isTutor ? '<button class="btn btn-ok btn-sm" data-finish>Marcar clase como finalizada</button>' : ''}
          ${t.estado === 'confirmada' ? '<button class="btn btn-danger btn-sm" data-cancel>Cancelar tutoría</button>' : ''}</div></aside></div>
      ${t.estado === 'finalizada' && !isTutor ? reviewBox() : ''}`;
    clock();
  }
  const reviewBox = () => t.tiene_resena
    ? `<div class="card center" style="margin-top:18px"><p>✓ Ya calificaste esta clase. ¡Gracias!</p></div>`
    : `<form class="card stack" id="rv" style="margin-top:18px" novalidate><h2>¿Cómo te fue con ${esc(t.tutor_nombre)}?</h2>
        <div class="rate" role="radiogroup" aria-label="Calificación">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="puntaje" id="s${n}" value="${n}"><label for="s${n}" title="${n} estrellas">★</label>`).join('')}</div>
        <label class="f">Título<input class="in" name="titulo" maxlength="100" placeholder="Ej. Excelente profesor"></label>
        <label class="f">Comentario<textarea class="in" name="comentario" maxlength="1000"></textarea></label><div class="err" role="alert" id="err"></div>
        <button class="btn" type="submit">Enviar reseña</button></form>`;

  const clock = () => {
    const cd = $('#cd', el);
    if (!cd) return;
    const diff = new Date(t.fecha_inicio) - Date.now();
    cd.textContent = diff > 0 ? hms(diff) : '¡Es hora!';
  };
  const refresh = async () => { t = await api.get('/tutorias/' + params.id); if (alive() && !$('#rv', el)?.contains(document.activeElement)) draw(); };

  on(el, 'click', '[data-ics]', () => icsFile(t));
  on(el, 'click', '[data-enter]', (_e, b) => run(b, async () => { await api.post(`/tutorias/${t.id}/entrar`); go(`#/tutoria/${t.id}/sala`); }));
  on(el, 'click', '[data-cancel]', (_e, b) => run(b, async () => { if (!confirm('¿Cancelar esta tutoría? Se avisará a la otra persona.')) return; await api.post(`/tutorias/${t.id}/cancelar`); toast('Tutoría cancelada'); await refresh(); }));
  on(el, 'click', '[data-finish]', (_e, b) => run(b, async () => { if (!confirm('¿Marcar la clase como finalizada?')) return; await api.post(`/tutorias/${t.id}/finalizar`); toast('Clase finalizada'); await refresh(); }));
  on(el, 'click', '[data-cam]', async (_e, b) => {
    try {
      if (stream) { stop(); stream = null; $('#me video', el)?.remove(); b.setAttribute('aria-pressed', 'false'); return; }
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const v = document.createElement('video'); v.autoplay = true; v.muted = true; v.playsInline = true; v.srcObject = stream;
      $('#me', el).prepend(v); b.setAttribute('aria-pressed', 'true');
    } catch { toast('No pudimos acceder a tu cámara o micrófono. Revisa los permisos del navegador.', true); }
  });
  on(el, 'click', '[data-mic]', (_e, b) => {
    if (!stream) return toast('Primero activa la cámara de prueba', true);
    const track = stream.getAudioTracks()[0]; if (!track) return;
    track.enabled = !track.enabled; b.setAttribute('aria-pressed', String(!track.enabled));
  });
  el.addEventListener('submit', (e) => {
    if (e.target.id !== 'rv') return;
    e.preventDefault();
    const d = formData(e.target);
    if (!d.puntaje) { $('#err', el).textContent = 'Elige de 1 a 5 estrellas'; return; }
    run($('button[type=submit]', el), async () => { await api.post(`/tutorias/${t.id}/resena`, d); toast('¡Gracias por tu reseña!'); await refresh(); }, $('#err', el));
  });

  function sala() {
    const name = encodeURIComponent(JSON.stringify(`${state.user.nombre} ${state.user.apellido}`));
    const src = t.enlace_sala ? `${t.enlace_sala}#userInfo.displayName=${name}&config.prejoinPageEnabled=false&config.disableDeepLinking=true` : '';
    el.innerHTML = `<div class="row between" style="margin-bottom:12px"><div><h2>${esc(t.materia)}</h2><p class="muted small">${esc(isTutor ? t.estudiante : t.tutor)} · ${hours(t.duracion_horas)}</p></div>
      <div class="row"><a class="btn btn-ghost btn-sm" href="${esc(t.enlace_sala || '#')}" target="_blank" rel="noopener">Abrir en otra pestaña</a>
      ${isTutor ? '<button class="btn btn-ok btn-sm" data-finish>Finalizar clase</button>' : ''}<a class="btn btn-sm" href="#/tutoria/${t.id}">Salir de la sala</a></div></div>
      ${src ? `<iframe class="room" src="${esc(src)}" allow="camera; microphone; fullscreen; display-capture; autoplay" title="Videollamada de la tutoría"></iframe>
      <p class="hint" style="margin-top:8px">Videollamada integrada con Jitsi. Si no carga, usa “Abrir en otra pestaña”.</p>` : emptyBox('Esta tutoría no tiene sala virtual.')}`;
    on(el, 'click', '[data-finish]', (_e, b) => run(b, async () => { if (!confirm('¿Finalizar la clase para ambos?')) return; await api.post(`/tutorias/${t.id}/finalizar`); toast('Clase finalizada'); go('#/tutoria/' + t.id); }));
  }

  draw();
  every(clock, 1000);
  every(() => refresh().catch(() => {}), 20000);
}

// ---------------------------------------------------------------- Notificaciones
const NOTIF_LINK = { nueva_solicitud: '#/tutor/solicitudes', oferta_recibida: '#/estudiante', resena: '#/tutor' };
export async function notificaciones() {
  const { el, alive } = mount('#/notificaciones', 'Notificaciones');
  const r = await api.get('/notificaciones');
  if (!alive()) return;
  el.innerHTML = r.items.length ? `<div class="grid">${r.items.map((n) => {
    const href = n.tutoria_id ? '#/tutoria/' + n.tutoria_id : NOTIF_LINK[n.tipo];
    return `<article class="card notif ${n.leida ? '' : 'new'}">${icon('bell')}<div class="grow"><b>${esc(n.titulo)}</b><p class="muted small">${esc(n.mensaje || '')}</p><p class="hint">${fmtWhen(n.creada_en)}</p></div>${href ? `<a class="btn btn-ghost btn-sm" href="${href}">Ver</a>` : ''}</article>`;
  }).join('')}</div>` : emptyBox('No tienes notificaciones.');
  if (r.no_leidas) { await api.post('/notificaciones/leer'); setUnread(0); }
}

// ---------------------------------------------------------------- Perfil
export async function perfil() {
  const { el, alive } = mount('#/perfil', 'Mi perfil');
  const u = state.user;
  const isTutor = u.rol === 'tutor';
  const pe = u.perfil_estudiante || {}, pt = u.perfil_tutor || {};
  const materias = isTutor ? await api.get('/materias') : [];
  if (!alive()) return;
  const has = (id, n) => (pt.materias || []).some((m) => m.materia_id == id && m.nivel_educativo === n);
  el.innerHTML = `<div class="grid g2" style="grid-template-columns:1.4fr 1fr;align-items:start"><form class="card stack" id="f" novalidate>
    <div class="row">${avatar(u.nombre, 'av-lg')}<div><h2>${esc(u.nombre)} ${esc(u.apellido)}</h2><p class="muted">${esc(u.correo)} · ${isTutor ? 'Tutor' : 'Estudiante'}</p>${isTutor ? stars(pt.calificacion_promedio, pt.total_resenas) : ''}</div></div>
    <div class="row" style="flex-wrap:nowrap"><label class="f grow">Nombre<input class="in" name="nombre" value="${esc(u.nombre)}" required></label><label class="f grow">Apellido<input class="in" name="apellido" value="${esc(u.apellido)}" required></label></div>
    <div class="row" style="flex-wrap:nowrap"><label class="f grow">Celular (para avisos por WhatsApp/SMS)<input class="in" name="telefono" type="tel" value="${esc(u.telefono || '')}"></label>
      <label class="f grow">Ciudad<input class="in" name="ciudad" value="${esc((isTutor ? pt.ciudad : pe.ciudad) || '')}"></label></div>
    ${isTutor ? `<label class="f">Zona (para clases presenciales)<input class="in" name="zona" value="${esc(pt.zona || '')}" placeholder="Norte, Centro..."></label>
      <label class="f">Tarifa base por hora<input class="in" name="tarifa_hora_base" inputmode="numeric" value="${esc(pt.tarifa_hora_base ? Math.round(pt.tarifa_hora_base) : '')}"></label>
      <label class="f">Biografía<textarea class="in" name="biografia" maxlength="1000">${esc(pt.biografia || '')}</textarea></label>
      <fieldset style="border:0;padding:0;margin:0"><legend style="font:600 .75rem var(--f-head);color:var(--soft);margin-bottom:6px">Materias que enseñas y nivel</legend>
        <div class="card" style="padding:8px 14px">${materias.map((m) => `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--sand)"><b>${esc(m.nombre)}</b>
          <span class="row" style="gap:14px">${Object.entries(NIVELES).map(([k, v]) => `<label class="row small" style="gap:6px"><input type="checkbox" data-mat="${m.id}|${k}" ${has(m.id, k) ? 'checked' : ''}> ${v}</label>`).join('')}</span></div>`).join('')}</div></fieldset>`
    : `<div class="row" style="flex-wrap:nowrap"><label class="f grow">Nivel educativo<select class="in" name="nivel_educativo">${Object.entries(NIVELES).map(([k, v]) => `<option value="${k}" ${pe.nivel_educativo === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label class="f grow">Institución<input class="in" name="institucion" value="${esc(pe.institucion || '')}"></label></div>`}
    <div class="err" role="alert" id="err"></div><button class="btn" type="submit">Guardar cambios</button></form>
    <aside class="card stack"><h3>Sesión</h3><p class="muted small">Cuenta creada el ${fmtDate(u.creado_en)}.</p><a class="btn btn-ghost" href="#/salir" data-logout>${icon('logout')} Cerrar sesión</a></aside></div>`;
  $('#f', el).addEventListener('submit', (e) => {
    e.preventDefault();
    run($('button[type=submit]', el), async () => {
      const d = formData(e.target);
      const basic = { nombre: d.nombre, apellido: d.apellido, telefono: d.telefono, ciudad: d.ciudad, nivel_educativo: d.nivel_educativo, institucion: d.institucion };
      Object.keys(basic).forEach((k) => (basic[k] === undefined || basic[k] === '') && delete basic[k]);
      await api.patch('/auth/me', basic);
      if (isTutor) {
        await api.put('/tutor/perfil', {
          biografia: d.biografia, ciudad: d.ciudad || undefined, zona: d.zona || undefined,
          tarifa_hora_base: d.tarifa_hora_base ? Number(d.tarifa_hora_base.replace(/\D/g, '')) : undefined,
          materias: $$('[data-mat]:checked', el).map((c) => { const [materia_id, nivel_educativo] = c.dataset.mat.split('|'); return { materia_id: Number(materia_id), nivel_educativo }; }),
        });
      }
      await loadUser(); toast('Perfil actualizado'); go('#/perfil');
    }, $('#err', el));
  });
}
