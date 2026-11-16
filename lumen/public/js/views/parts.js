// Fragmentos de interfaz reutilizados en varias vistas.
import { esc, money, NIVELES, ESTADOS, fmtWhen, hours, stars, avatar } from '../ui.js';

export const tutorCard = (t, i = 0) => `<article class="card stack">
  <div class="row" style="flex-wrap:nowrap">${avatar(t.nombre, '', i)}<div class="grow"><h3>${esc(t.nombre)} ${esc(t.apellido)}</h3>${stars(t.calificacion_promedio, t.total_resenas)}</div>
  ${t.disponible_ahora ? '<span class="chip chip-ok">Disponible hoy</span>' : ''}</div>
  <p class="muted small">${esc(t.biografia || 'Tutor en Lumen')}</p>
  <div class="row">${(t.materias || []).map((m) => `<span class="chip">${esc(m)}</span>`).join('')}</div>
  <div class="row between"><span class="price">${t.tarifa_hora_base ? money(t.tarifa_hora_base) : 'A convenir'}<small> /hora</small></span>
  <a class="btn btn-sm" href="#/estudiante/tutor/${t.id}">Ver perfil</a></div>
  ${t.ciudad ? `<p class="hint">${esc(t.ciudad)}${t.zona ? ' · ' + esc(t.zona) : ''}</p>` : ''}</article>`;

export function tutoriaCard(t, role) {
  const [label, cls] = ESTADOS[t.estado] || [t.estado, ''];
  const other = role === 'tutor' ? `Estudiante: ${t.estudiante_nombre}` : `con ${t.tutor_nombre}`;
  return `<article class="card card-navy"><div class="row between" style="flex-wrap:nowrap">
    <div><h3>${esc(t.materia)}</h3><p class="muted">${esc(other)}</p><p style="margin-top:4px"><b>${fmtWhen(t.fecha_inicio)}</b> <span class="muted">· ${hours(t.duracion_horas)} · ${t.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}</span></p></div>
    <div class="acts" style="display:grid;gap:8px;justify-items:end"><span class="chip ${cls}">${label}</span><span class="price">${money(t.precio_total)}</span>
    <a class="btn btn-amber btn-sm" href="#/tutoria/${t.id}">${t.puede_entrar ? 'Entrar a sala' : 'Ver detalle'}</a></div></div></article>`;
}

export const requestRow = (s, href, extra = '') => `<article class="card card-navy"><div class="row between" style="flex-wrap:nowrap">
  <div><h3>${esc(s.materia)}</h3><p class="muted">Estudiante: ${esc(s.estudiante)}</p>
  <p style="margin-top:4px" class="price">${s.presupuesto_hora ? money(s.presupuesto_hora) : 'Sin presupuesto'}<small> /hora · ${hours(s.duracion_horas)}</small></p>
  <p class="muted small" style="margin-top:4px">${NIVELES[s.nivel_educativo]} · ${s.modalidad === 'virtual' ? 'Virtual' : 'Presencial'}${s.tema_especifico ? ' · ' + esc(s.tema_especifico) : ''}</p></div>
  <div style="display:grid;gap:8px;justify-items:end">${extra}<a class="btn btn-amber btn-sm" href="${href}">Ver detalles</a></div></div></article>`;

export const reviewCard = (r) => `<article class="card"><div class="row between"><h3>${esc(r.titulo || 'Reseña')}</h3><span class="stars">★ ${r.puntaje}</span></div>
  <p class="muted small">${esc(r.comentario || '')}</p>${r.estudiante ? `<p class="hint" style="margin-top:6px">— ${esc(r.estudiante)}</p>` : ''}</article>`;

export const emptyBox = (msg, cta = '') => `<div class="empty"><p>${msg}</p>${cta ? `<p style="margin-top:12px">${cta}</p>` : ''}</div>`;
