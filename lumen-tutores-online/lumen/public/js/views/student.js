import { api } from '../api.js';
import { state, mount, go, every, onLeave } from '../core.js';
import { esc, $, $$, on, run, toast, formData, money, NIVELES, DIAS, fmtWhen, fmtDate, hours, mmss, stars, avatar, logo, icon } from '../ui.js';
import { tutorCard, tutoriaCard, reviewCard, emptyBox } from './parts.js';

// ---------------------------------------------------------------- Dashboard
export async function dashboard() {
  const { el, alive } = mount('#/estudiante', '¿Qué quieres aprender hoy?');
  const d = await api.get('/estudiante/dashboard');
  if (!alive()) return;
  const act = d.solicitud_activa;
  el.innerHTML = `
    ${act ? `<div class="banner-ok" style="background:#F8E4BF;margin-bottom:18px"><div class="grow"><b>Tienes una solicitud activa</b><p class="small muted">${esc(act.materia)} · ${hours(act.duracion_horas)}</p></div><a class="btn btn-sm" href="#/estudiante/solicitud/${act.id}">Ver ofertas</a></div>` : ''}
    <div class="grid g2">
      <div class="card card-navy stack"><h2>¿Necesitas ayuda ya?</h2><p class="muted">Te conectamos con un tutor disponible: publica tu solicitud y recibe ofertas en segundos.</p>
        <div><a class="btn btn-amber" href="#/estudiante/solicitud/nueva">Pedir ahora</a></div></div>
      <div class="card stack"><h2>Buscar tutores</h2><p class="muted">Agenda con anticipación por materia, nivel, zona y disponibilidad.</p>
        <form class="row" style="flex-wrap:nowrap" id="q"><input class="in" name="q" placeholder="Materia o nombre del tutor" aria-label="Buscar materia o tutor"><button class="btn">Buscar</button></form></div>
    </div>
    <div class="sec-title"><h2>Tus próximas tutorías</h2><a href="#/tutorias">Ver todas</a></div>
    <div class="grid g2">${d.proximas.length ? d.proximas.map((t) => tutoriaCard(t, 'estudiante')).join('') : emptyBox('Aún no tienes clases agendadas.', '<a href="#/estudiante/solicitud/nueva">Pide tu primera tutoría</a>')}</div>
    <div class="sec-title"><h2>Tutores recomendados</h2><a href="#/estudiante/buscar">Ver más</a></div>
    <div class="grid g2">${d.recomendados.map(tutorCard).join('')}</div>`;
  $('#q', el).addEventListener('submit', (e) => { e.preventDefault(); go('#/estudiante/buscar?q=' + encodeURIComponent(formData(e.target).q || '')); });
}

// ---------------------------------------------------------------- Búsqueda de tutores
export async function buscar({ query }) {
  const { el, alive } = mount('#/estudiante/buscar', 'Encuentra tu tutor');
  const materias = await api.get('/materias');
  if (!alive()) return;
  const dias = DIAS.slice(1).map((d, i) => `<option value="${i + 1}">${d}</option>`).join('');
  el.innerHTML = `<form class="card grid g4" id="f" role="search">
    <label class="f">Buscar<input class="in" name="q" value="${esc(query.get('q') || '')}" placeholder="Nombre o materia"></label>
    <label class="f">Materia<select class="in" name="materia_id"><option value="">Todas</option>${materias.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join('')}</select></label>
    <label class="f">Nivel<select class="in" name="nivel"><option value="">Todos</option>${Object.entries(NIVELES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
    <label class="f">Ciudad<input class="in" name="ciudad" placeholder="Barranquilla"></label>
    <label class="f">Zona (presencial)<input class="in" name="zona" placeholder="Norte, Centro..."></label>
    <label class="f">Día disponible<select class="in" name="dia"><option value="">Cualquiera</option>${dias}</select></label>
    <label class="f">A la hora<input class="in" name="hora" type="time"></label>
    <label class="f">Ahora mismo<span class="row" style="padding-top:6px"><span class="switch"><input type="checkbox" name="ahora" value="1" aria-label="Solo disponibles ahora"><span></span></span><span class="small">Solo disponibles</span></span></label>
  </form><p class="muted small" id="count" style="margin:14px 0" aria-live="polite"></p><div class="grid g2" id="res"></div>`;
  const form = $('#f', el);
  let timer;
  const search = async () => {
    const r = await api.get('/tutores', formData(form));
    if (!alive()) return;
    $('#count', el).textContent = `${r.length} tutor${r.length === 1 ? '' : 'es'} encontrado${r.length === 1 ? '' : 's'}`;
    $('#res', el).innerHTML = r.length ? r.map(tutorCard).join('') : emptyBox('No encontramos tutores con esos filtros. Prueba quitando alguno o <a href="#/estudiante/solicitud/nueva">publica una solicitud</a> y deja que ellos te ofrezcan.');
  };
  form.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => search().catch((e) => toast(e.message, true)), 250); });
  onLeave(() => clearTimeout(timer));
  search();
}

// ---------------------------------------------------------------- Perfil público de un tutor
export async function tutorPerfil({ params }) {
  const { el, alive } = mount('#/estudiante/buscar', 'Perfil del tutor');
  const t = await api.get('/tutores/' + params.id);
  if (!alive()) return;
  const dias = {};
  t.disponibilidad.forEach((d) => (dias[d.dia_semana] ||= []).push(`${d.hora_inicio}–${d.hora_fin}`));
  const first = t.materias_nivel[0];
  el.innerHTML = `<a href="#/estudiante/buscar" class="small">← Volver a la búsqueda</a>
  <div class="grid g2" style="margin-top:12px;grid-template-columns:1.4fr 1fr;align-items:start">
    <div class="stack-lg"><div class="card stack"><div class="row" style="flex-wrap:nowrap">${avatar(t.nombre, 'av-lg')}<div><h2>${esc(t.nombre)} ${esc(t.apellido)}</h2>${stars(t.calificacion_promedio, t.total_resenas)}
      <p class="muted small">${esc(t.ciudad || '')}${t.zona ? ' · ' + esc(t.zona) : ''}</p></div></div><p>${esc(t.biografia || '')}</p>
      <div class="row">${t.materias_nivel.map((m) => `<span class="chip">${esc(m.materia)} · ${NIVELES[m.nivel_educativo]}</span>`).join('')}</div></div>
      <div><h2 style="margin-bottom:12px">Reseñas</h2><div class="grid">${t.resenas.length ? t.resenas.map(reviewCard).join('') : emptyBox('Aún no tiene reseñas.')}</div></div></div>
    <aside class="stack"><div class="card card-navy stack"><span class="price">${t.tarifa_hora_base ? money(t.tarifa_hora_base) : 'A convenir'}<small> /hora base</small></span>
      ${t.disponible_ahora ? '<span class="chip chip-ok" style="justify-self:start">Disponible hoy</span>' : ''}
      <a class="btn btn-amber" href="#/estudiante/solicitud/nueva?tutor=${t.id}${first ? '&materia=' + first.materia_id : ''}">Reservar tutoría</a>
      <p class="small muted">Se envía una solicitud al tutor; puede responder con su oferta y tú confirmas.</p></div>
      <div class="card"><h3>Disponibilidad semanal</h3>${Object.keys(dias).length ? `<div class="summary" style="margin-top:10px"><dl>${Object.entries(dias).map(([d, h]) => `<dt>${DIAS[d]}</dt><dd>${h.join(', ')}</dd>`).join('')}</dl></div>` : '<p class="muted small">Sin horarios publicados.</p>'}</div></aside></div>`;
}

// ---------------------------------------------------------------- Nueva solicitud
export async function nueva({ query }) {
  const { el, alive } = mount('#/estudiante/solicitud/nueva', 'Nueva solicitud');
  const materias = await api.get('/materias');
  if (!alive()) return;
  const target = query.get('tutor');
  const city = state.user.perfil_estudiante?.ciudad || '';
  el.innerHTML = `<div class="grid g2" style="grid-template-columns:1.3fr 1fr;align-items:start">
  <form class="card stack" id="f" novalidate>
    ${target ? '<div class="chip chip-warn" style="justify-self:start">Reserva dirigida a un tutor: le avisaremos para que te ofrezca</div>' : ''}
    <label class="f">Materia<select class="in" name="materia_id" required><option value="">Elige una materia</option>${materias.map((m) => `<option value="${m.id}" ${m.id == query.get('materia') ? 'selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select></label>
    <label class="f">Tema específico (opcional)<input class="in" name="tema_especifico" maxlength="200" placeholder="Ej. Derivadas parciales"></label>
    <fieldset style="border:0;padding:0;margin:0"><legend class="f" style="font:600 .75rem var(--f-head);color:var(--soft);margin-bottom:6px">Nivel educativo</legend><div class="seg">
      ${Object.entries(NIVELES).map(([k, v]) => `<input type="radio" name="nivel_educativo" id="n-${k}" value="${k}" ${k === (state.user.perfil_estudiante?.nivel_educativo || 'pregrado') ? 'checked' : ''}><label for="n-${k}">${v}</label>`).join('')}</div></fieldset>
    <fieldset style="border:0;padding:0;margin:0"><legend class="f" style="font:600 .75rem var(--f-head);color:var(--soft);margin-bottom:6px">Modalidad</legend><div class="seg">
      <input type="radio" name="modalidad" id="m-v" value="virtual" checked><label for="m-v">Virtual</label><input type="radio" name="modalidad" id="m-p" value="presencial"><label for="m-p">Presencial</label></div></fieldset>
    <label class="f hidden" id="cityBox">Ciudad (clases presenciales)<input class="in" name="ciudad" value="${esc(city)}" placeholder="Barranquilla"></label>
    <fieldset style="border:0;padding:0;margin:0"><legend class="f" style="font:600 .75rem var(--f-head);color:var(--soft);margin-bottom:6px">¿Cuándo?</legend><div class="seg">
      <input type="radio" name="tipo" id="t-i" value="inmediata" checked><label for="t-i">Ahora mismo</label><input type="radio" name="tipo" id="t-p" value="programada"><label for="t-p">Programar</label></div></fieldset>
    <label class="f hidden" id="dateBox">Fecha y hora<input class="in" type="datetime-local" name="fecha_local"></label>
    <div class="f">Duración<div class="stepper"><button type="button" data-step="-0.5" aria-label="Menos tiempo">−</button><b id="dur">1 hora</b><button type="button" data-step="0.5" aria-label="Más tiempo">+</button></div><input type="hidden" name="duracion_horas" value="1"></div>
    <label class="f">Presupuesto por hora (opcional)<input class="in" name="presupuesto_hora" inputmode="numeric" placeholder="$ Ej. 25000"><span class="hint">Los tutores podrán ofertar cerca a este valor.</span></label>
    <div class="err" role="alert" id="err"></div>
    <button class="btn btn-block" type="submit">Buscar tutores disponibles</button>
  </form>
  <aside class="stack">
    <div class="card summary"><h3 style="margin-bottom:10px">Revisa antes de publicar</h3><dl id="sum"></dl></div>
    <div class="card ai-box stack"><div class="row">${icon('spark')}<h3>Asistente con IA</h3></div>
      <p class="small muted">Cuéntanos qué te cuesta y te ayudamos a precisar el tema y a prepararte.</p>
      <textarea class="in" id="aiText" placeholder="Ej. No entiendo cuándo usar la regla de la cadena"></textarea>
      <button type="button" class="btn btn-amber btn-sm" id="aiBtn">Sugerir con IA</button><div id="aiOut" aria-live="polite"></div></div>
  </aside></div>`;
  const f = $('#f', el);
  const val = (n) => f.elements[n].value;
  const sum = () => {
    const m = materias.find((x) => x.id == val('materia_id'));
    const pres = Number(val('presupuesto_hora').replace(/\D/g, ''));
    const when = val('tipo') === 'inmediata' ? 'Ahora mismo' : (val('fecha_local') ? fmtWhen(new Date(val('fecha_local')).toISOString()) : 'Por definir');
    $('#sum', el).innerHTML = `<dt>Materia</dt><dd>${esc(m?.nombre || '—')}</dd><dt>Tema</dt><dd>${esc(val('tema_especifico') || 'General')}</dd><dt>Nivel</dt><dd>${NIVELES[val('nivel_educativo')]}</dd>
      <dt>Modalidad</dt><dd>${val('modalidad') === 'virtual' ? 'Virtual' : 'Presencial · ' + esc(val('ciudad') || '—')}</dd><dt>Cuándo</dt><dd>${when}</dd><dt>Duración</dt><dd>${hours(val('duracion_horas'))}</dd>
      <dt>Presupuesto</dt><dd>${pres ? money(pres) + '/h' : 'Abierto a ofertas'}</dd>${pres ? `<dt>Total estimado</dt><dd><b>${money(pres * val('duracion_horas'))}</b></dd>` : ''}`;
  };
  const toggles = () => { $('#cityBox', el).classList.toggle('hidden', val('modalidad') !== 'presencial'); $('#dateBox', el).classList.toggle('hidden', val('tipo') !== 'programada'); };
  on(f, 'click', '[data-step]', (_e, b) => {
    const v = Math.min(8, Math.max(0.5, Number(val('duracion_horas')) + Number(b.dataset.step)));
    f.elements.duracion_horas.value = v; $('#dur', el).textContent = hours(v); sum();
  });
  f.addEventListener('input', () => { toggles(); sum(); }); toggles(); sum();

  $('#aiBtn', el).addEventListener('click', (e) => run(e.currentTarget, async () => {
    const m = materias.find((x) => x.id == val('materia_id'));
    if (!m) return toast('Primero elige la materia', true);
    const r = await api.post('/ia/solicitud', { materia: m.nombre, nivel: val('nivel_educativo'), tema: val('tema_especifico'), texto: $('#aiText', el).value });
    $('#aiOut', el).innerHTML = `<p><b>${esc(r.tema_sugerido)}</b></p><button type="button" class="link small" data-use="${esc(r.tema_sugerido)}">Usar como tema</button>
      <p class="small" style="margin-top:8px"><b>Subtemas</b></p><ul class="small">${r.subtemas.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p class="small"><b>Plan de la clase</b></p><ul class="small">${r.plan.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p class="small"><b>Lleva contigo</b></p><ul class="small">${r.preparar.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      <p class="hint">${r.origen === 'ia' ? 'Generado con IA' : 'Sugerencia automática (configura ANTHROPIC_API_KEY para respuestas con IA)'}</p>`;
  }));
  on(el, 'click', '[data-use]', (_e, b) => { f.elements.tema_especifico.value = b.dataset.use; sum(); });

  f.addEventListener('submit', (e) => {
    e.preventDefault();
    run($('button[type=submit]', f), async () => {
      const d = formData(f);
      const body = { ...d, tutor_objetivo: target || undefined };
      delete body.fecha_local;
      body.presupuesto_hora = d.presupuesto_hora ? d.presupuesto_hora.replace(/\D/g, '') : undefined;
      if (d.tipo === 'programada') {
        if (!d.fecha_local) throw new Error('Elige la fecha y hora de la tutoría');
        body.fecha_programada = new Date(d.fecha_local).toISOString();
      }
      if (d.modalidad === 'virtual') delete body.ciudad;
      const s = await api.post('/solicitudes', body);
      toast('¡Solicitud publicada!');
      go('#/estudiante/solicitud/' + s.id);
    }, $('#err', el));
  });
}

// ---------------------------------------------------------------- Seguimiento de la solicitud: búsqueda → ofertas
export async function solicitud({ params }) {
  const { el, alive } = mount('#/estudiante', 'Tu solicitud');
  let sig = '';
  let data;
  const draw = () => {
    const s = data;
    if (s.estado === 'asignada' && s.tutoria_id) return go('#/tutoria/' + s.tutoria_id + '/confirmada');
    const resumen = `${esc(s.materia)} · ${hours(s.duracion_horas)} · ${s.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}`;
    if (s.estado !== 'activa') {
      el.innerHTML = `<div class="card center stack" style="max-width:520px;margin:auto"><h2>${s.estado === 'cancelada' ? 'Solicitud cancelada' : 'La solicitud expiró'}</h2><p class="muted">${resumen}</p><a class="btn" href="#/estudiante/solicitud/nueva">Crear una nueva</a></div>`;
      return;
    }
    if (!s.ofertas.length) {
      el.innerHTML = `<div class="center stack" style="max-width:520px;margin:auto"><div class="radar"><i></i><i></i><i></i><div class="core">${logo(60)}</div></div>
        <h2>${s.tutores_viendo ? `${s.tutores_viendo} profesor${s.tutores_viendo === 1 ? '' : 'es'} ${s.tutores_viendo === 1 ? 'está viendo' : 'están viendo'} tu solicitud` : 'Buscando tutores disponibles'}</h2>
        <p class="muted">${resumen}</p><p class="muted">Recibirás ofertas en los próximos segundos. Puedes dejar esta pantalla abierta.</p>
        <div><button class="btn btn-danger" data-cancel>Cancelar solicitud</button></div></div>`;
      return;
    }
    el.innerHTML = `<div class="row between"><div><h2>Elige una oferta</h2><p class="muted small">${resumen}</p></div>${s.presupuesto_hora ? `<span class="chip">Tu presupuesto: ${money(s.presupuesto_hora)}/hora</span>` : ''}</div>
      <div class="grid" style="margin-top:16px">${s.ofertas.map((o, i) => `<article class="card offer">${avatar(o.nombre, '', i)}
        <div><h3>${esc(o.nombre)} ${esc(o.apellido[0])}.</h3>${stars(o.calificacion_promedio, o.total_resenas)} <span class="muted small">· ${esc((o.materias || []).slice(0, 2).join(', '))}</span>
          ${o.mensaje ? `<p class="muted small" style="margin-top:4px">“${esc(o.mensaje)}”</p>` : ''}</div>
        <div class="acts"><span class="price">${money(o.precio_hora)}<small> /hora</small></span><span class="timer" data-exp="${esc(o.expira_en)}">--:--</span>
          <div class="row"><a class="btn btn-ghost btn-sm" href="#/estudiante/oferta/${o.id}">Ver detalle</a><button class="btn btn-ok btn-sm" data-accept="${o.id}">Aceptar</button></div></div></article>`).join('')}</div>
      <p style="margin-top:16px"><button class="link" data-cancel>Cancelar solicitud</button></p>`;
    tick();
  };
  const tick = () => $$('[data-exp]', el).forEach((n) => { n.textContent = 'Expira en ' + mmss(new Date(n.dataset.exp) - Date.now()); });
  const load = async () => {
    try {
      data = await api.get('/solicitudes/' + params.id);
      if (!alive()) return;
      const s = JSON.stringify([data.estado, data.tutores_viendo, data.tutoria_id, data.ofertas.map((o) => o.id)]);
      if (s !== sig) { sig = s; draw(); }
    } catch (e) { if (alive()) toast(e.message, true); }
  };
  on(el, 'click', '[data-cancel]', (_e, b) => run(b, async () => { if (!confirm('¿Cancelar esta solicitud?')) return; await api.post(`/solicitudes/${params.id}/cancelar`); toast('Solicitud cancelada'); go('#/estudiante'); }));
  on(el, 'click', '[data-accept]', (_e, b) => run(b, async () => {
    const r = await api.post(`/ofertas/${b.dataset.accept}/aceptar`);
    go('#/tutoria/' + r.tutoria_id + '/confirmada');
  }));
  await load();
  every(load, 3000);
  every(tick, 1000);
}

// ---------------------------------------------------------------- Detalle de una oferta
export async function oferta({ params }) {
  const { el, alive } = mount('#/estudiante', 'Detalle de la oferta');
  const { oferta: o, solicitud: s } = await api.get('/ofertas/' + params.id);
  if (!alive()) return;
  const vigente = s.estado === 'activa' && o.estado === 'pendiente';
  el.innerHTML = `<a href="#/estudiante/solicitud/${s.id}" class="small">← Volver a las ofertas</a>
  <div class="grid g2" style="margin-top:12px;grid-template-columns:1.3fr 1fr;align-items:start">
    <div class="stack-lg"><div class="card stack"><div class="row" style="flex-wrap:nowrap">${avatar(o.nombre, 'av-lg')}<div><h2>${esc(o.nombre)} ${esc(o.apellido)}</h2>${stars(o.calificacion_promedio, o.total_resenas)}
      <p class="muted small">${esc(o.tutor_ciudad || '')}</p></div></div>
      ${o.mensaje ? `<blockquote style="margin:0;padding:12px 16px;background:var(--sand-2);border-radius:12px">“${esc(o.mensaje)}”</blockquote>` : ''}
      <p class="muted small">${esc(o.biografia || '')}</p><div class="row">${o.materias.map((m) => `<span class="chip">${esc(m)}</span>`).join('')}</div></div>
      ${o.resenas.length ? `<div><h3 style="margin-bottom:10px">Lo que dicen sus estudiantes</h3><div class="grid">${o.resenas.map(reviewCard).join('')}</div></div>` : ''}</div>
    <aside class="card summary stack"><h3>Condiciones</h3><dl><dt>Materia</dt><dd>${esc(s.materia)}</dd><dt>Duración</dt><dd>${hours(s.duracion_horas)}</dd><dt>Modalidad</dt><dd>${s.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}</dd>
      <dt>Precio por hora</dt><dd>${money(o.precio_hora)}</dd><dt>Total</dt><dd><b>${money(o.precio_hora * s.duracion_horas)}</b></dd></dl>
      ${vigente ? `<p class="timer" style="justify-self:start" data-exp="${esc(o.expira_en)}"></p><button class="btn btn-ok btn-block" id="ok">Aceptar esta oferta</button>` : '<p class="chip chip-bad" style="justify-self:start">Esta oferta ya no está disponible</p>'}
    </aside></div>`;
  const tick = () => $$('[data-exp]', el).forEach((n) => { n.textContent = 'Expira en ' + mmss(new Date(n.dataset.exp) - Date.now()); });
  tick(); every(tick, 1000);
  $('#ok', el)?.addEventListener('click', (e) => run(e.currentTarget, async () => { const r = await api.post(`/ofertas/${o.id}/aceptar`); go('#/tutoria/' + r.tutoria_id + '/confirmada'); }));
}
