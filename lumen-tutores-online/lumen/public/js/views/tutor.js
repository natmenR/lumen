import { api } from '../api.js';
import { state, mount, go } from '../core.js';
import { esc, $, on, run, toast, formData, money, NIVELES, DIAS, fmtWhen, hours, stars, icon } from '../ui.js';
import { tutoriaCard, requestRow, reviewCard, emptyBox } from './parts.js';

const dismissKey = () => `lumen_dismissed_${state.user.id}`;
const dismissed = () => { try { return JSON.parse(localStorage.getItem(dismissKey()) || '[]'); } catch { return []; } };
const dismiss = (id) => { try { localStorage.setItem(dismissKey(), JSON.stringify([...dismissed(), String(id)])); } catch { /* noop */ } };
const visible = (list) => list.filter((s) => !dismissed().includes(String(s.id)));

const offerChip = (s) => (s.mi_oferta ? '<span class="chip chip-warn">Oferta enviada</span>' : (s.coincide ? '<span class="chip chip-ok">Coincide con tus materias</span>' : ''));

// ---------------------------------------------------------------- Dashboard
export async function dashboard() {
  const { el, alive } = mount('#/tutor', 'Tu actividad');
  const d = await api.get('/tutor/dashboard');
  if (!alive()) return;
  const pt = state.user.perfil_tutor || {};
  el.innerHTML = `<div class="grid g4">
      <div class="card stat"><b>${Number(pt.calificacion_promedio) ? '★ ' + Number(pt.calificacion_promedio).toFixed(1) : 'Nuevo'}</b><span>Calificación (${pt.total_resenas || 0} reseñas)</span></div>
      <div class="card stat"><b>${d.stats.proximas}</b><span>Tutorías próximas</span></div>
      <div class="card stat"><b>${d.stats.ofertas_pendientes}</b><span>Ofertas en espera</span></div>
      <div class="card stat"><b>${money(d.stats.ingresos_mes)}</b><span>Ingresos del mes</span></div></div>
    <div class="card row between" style="margin-top:16px"><div><h3>Disponible ahora</h3><p class="muted small">Recibirás avisos de solicitudes inmediatas que coincidan con tus materias.</p></div>
      <label class="switch"><input type="checkbox" id="avail" ${pt.disponible_ahora ? 'checked' : ''} aria-label="Disponible ahora"><span></span></label></div>
    <div class="sec-title"><h2>Solicitudes recientes</h2><a href="#/tutor/solicitudes">Ver todas</a></div>
    <div class="grid g2">${visible(d.solicitudes).length ? visible(d.solicitudes).map((s) => requestRow(s, '#/tutor/solicitud/' + s.id, offerChip(s))).join('') : emptyBox('No hay solicitudes que coincidan con tus materias ahora mismo. <br><a href="#/perfil">Completa tus materias</a> o <a href="#/tutor/solicitudes">revisa todas las solicitudes</a>.')}</div>
    <div class="sec-title"><h2>Próximas tutorías</h2><a href="#/tutorias">Ver todas</a></div>
    <div class="grid g2">${d.proximas.length ? d.proximas.map((t) => tutoriaCard(t, 'tutor')).join('') : emptyBox('Aún no tienes clases confirmadas.')}</div>
    <div class="sec-title"><h2>Calificaciones y reseñas</h2></div>
    <div class="grid g2">${d.resenas.length ? d.resenas.map(reviewCard).join('') : emptyBox('Tus primeras reseñas aparecerán aquí.')}</div>`;
  $('#avail', el).addEventListener('change', async (e) => {
    try { await api.put('/tutor/perfil', { disponible_ahora: e.target.checked }); state.user.perfil_tutor.disponible_ahora = e.target.checked; toast(e.target.checked ? 'Ahora apareces como disponible' : 'Ya no apareces como disponible'); }
    catch (err) { e.target.checked = !e.target.checked; toast(err.message, true); }
  });
}

// ---------------------------------------------------------------- Solicitudes disponibles
export async function solicitudes() {
  const { el, alive } = mount('#/tutor/solicitudes', 'Solicitudes disponibles');
  let todas = false;
  const load = async () => {
    const list = visible(await api.get('/tutor/solicitudes', { todas: todas ? 1 : '' }));
    if (!alive()) return;
    $('#list', el).innerHTML = list.length ? list.map((s) => requestRow(s, '#/tutor/solicitud/' + s.id, offerChip(s))).join('') : emptyBox('No hay solicitudes por ahora. Vuelve en unos minutos.');
  };
  el.innerHTML = `<div class="row between" style="margin-bottom:16px"><p class="muted">Estudiantes que están buscando ayuda.</p>
    <label class="row small"><span class="switch"><input type="checkbox" id="all"><span></span></span> Ver todas las materias</label></div><div class="grid g2" id="list">${'<div class="spin"></div>'}</div>`;
  $('#all', el).addEventListener('change', (e) => { todas = e.target.checked; load(); });
  await load();
}

// ---------------------------------------------------------------- Detalle + oferta
export async function solicitud({ params }) {
  const { el, alive } = mount('#/tutor/solicitudes', 'Detalle de la solicitud');
  const s = await api.get('/solicitudes/' + params.id);
  if (!alive()) return;
  const sent = s.mi_oferta;
  const base = s.presupuesto_hora || state.user.perfil_tutor?.tarifa_hora_base || '';
  el.innerHTML = `<a href="#/tutor/solicitudes" class="small">← Volver a solicitudes</a>
  <div class="grid g2" style="margin-top:12px;align-items:start">
    <div class="card summary stack"><h2>${esc(s.materia)}</h2><dl><dt>Estudiante</dt><dd>${esc(s.estudiante_nombre)}</dd><dt>Tema</dt><dd>${esc(s.tema_especifico || 'General')}</dd>
      <dt>Nivel</dt><dd>${NIVELES[s.nivel_educativo]}</dd><dt>Modalidad</dt><dd>${s.modalidad === 'virtual' ? 'Virtual' : 'Presencial · ' + esc(s.ciudad || '')}</dd>
      <dt>Cuándo</dt><dd>${s.tipo === 'inmediata' ? 'Ahora mismo' : fmtWhen(s.fecha_programada)}</dd><dt>Duración</dt><dd>${hours(s.duracion_horas)}</dd>
      <dt>Presupuesto</dt><dd>${s.presupuesto_hora ? money(s.presupuesto_hora) + '/hora' : 'Abierto'}</dd></dl></div>
    ${sent ? `<div class="card stack center"><div class="ok-ico" style="margin:auto">${icon('check')}</div><h2>Oferta enviada</h2><p class="muted">Ofreciste ${money(sent.precio_hora)}/hora. Te avisaremos cuando el estudiante decida.</p>
      <a class="btn" href="#/tutor">Volver a mi panel</a></div>`
    : `<form class="card stack" id="f" novalidate><h2>Crea tu oferta</h2>
      <label class="f">Precio por hora<input class="in" name="precio_hora" inputmode="numeric" value="${esc(base ? Math.round(base) : '')}" required placeholder="$ 24000"></label>
      <p class="small muted" id="tot"></p>
      <label class="f">Mensaje para el estudiante<textarea class="in" name="mensaje" maxlength="500" placeholder="Cuéntale cómo puedes ayudarle"></textarea></label>
      <button type="button" class="btn btn-ghost btn-sm" id="ai" style="justify-self:start">${icon('spark')} Redactar con IA</button>
      <div class="err" role="alert" id="err"></div>
      <div class="row"><button class="btn grow" type="submit">Enviar oferta</button><button class="btn btn-ghost" type="button" id="no">Rechazar</button></div></form>`}</div>`;
  if (sent) return;
  const f = $('#f', el);
  const price = () => Number(f.elements.precio_hora.value.replace(/\D/g, ''));
  const tot = () => { $('#tot', el).textContent = price() ? `Total para ${hours(s.duracion_horas)}: ${money(price() * s.duracion_horas)}` : ''; };
  f.elements.precio_hora.addEventListener('input', tot); tot();
  $('#ai', el).addEventListener('click', (e) => run(e.currentTarget, async () => {
    const r = await api.post('/ia/oferta', { solicitud_id: s.id });
    f.elements.mensaje.value = r.mensaje; toast(r.origen === 'ia' ? 'Mensaje generado con IA' : 'Mensaje sugerido (configura ANTHROPIC_API_KEY para usar IA)');
  }));
  $('#no', el).addEventListener('click', () => { dismiss(s.id); toast('Solicitud ocultada'); go('#/tutor/solicitudes'); });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    run($('button[type=submit]', f), async () => {
      await api.post(`/solicitudes/${s.id}/ofertas`, { precio_hora: price(), mensaje: f.elements.mensaje.value });
      toast('¡Oferta enviada!'); go('#/tutor/solicitud/' + s.id);
    }, $('#err', el));
  });
}

// ---------------------------------------------------------------- Disponibilidad semanal
export async function disponibilidad() {
  const { el, alive } = mount('#/tutor/disponibilidad', 'Tu disponibilidad');
  let slots = await api.get('/tutor/disponibilidad');
  if (!alive()) return;
  const draw = () => {
    el.innerHTML = `<p class="muted" style="margin-bottom:12px">Define en qué franjas puedes dar clases. Los estudiantes te encuentran por día y hora.</p>
    <div class="card"><div class="slots">${DIAS.slice(1).map((d, i) => {
      const mine = slots.map((s, idx) => ({ ...s, idx })).filter((s) => s.dia_semana === i + 1);
      return `<div class="slot-row"><b>${d}</b><div>${mine.map((s) => `<span class="slot">${s.hora_inicio}–${s.hora_fin}<button data-del="${s.idx}" aria-label="Quitar franja ${d} ${s.hora_inicio}">×</button></span>`).join('')}
        <form class="row" data-add="${i + 1}" style="gap:6px;display:inline-flex"><input class="in" type="time" name="a" required aria-label="Inicio ${d}" style="width:120px;padding:6px 8px"><input class="in" type="time" name="b" required aria-label="Fin ${d}" style="width:120px;padding:6px 8px"><button class="btn btn-ghost btn-sm">Añadir</button></form></div></div>`;
    }).join('')}</div></div><div style="margin-top:16px"><button class="btn" id="save">Guardar disponibilidad</button></div>`;
  };
  on(el, 'click', '[data-del]', (_e, b) => { slots.splice(Number(b.dataset.del), 1); draw(); });
  el.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-add]');
    if (!form) return;
    e.preventDefault();
    const { a, b } = formData(form);
    if (b <= a) return toast('La hora final debe ser posterior a la inicial', true);
    slots.push({ dia_semana: Number(form.dataset.add), hora_inicio: a, hora_fin: b });
    slots.sort((x, y) => x.dia_semana - y.dia_semana || x.hora_inicio.localeCompare(y.hora_inicio));
    draw();
  });
  on(el, 'click', '#save', (_e, b) => run(b, async () => { slots = await api.put('/tutor/disponibilidad', { franjas: slots }); toast('Disponibilidad guardada'); draw(); }));
  draw();
}
