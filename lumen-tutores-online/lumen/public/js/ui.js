// Utilidades de interfaz compartidas por todas las vistas.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const money = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
export const NIVELES = { colegio: 'Colegio', pregrado: 'Pregrado', posgrado: 'Posgrado' };
export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const ESTADOS = { confirmada: ['Confirmada', 'chip-ok'], en_curso: ['En curso', 'chip-warn'], finalizada: ['Finalizada', ''], cancelada: ['Cancelada', 'chip-bad'] };

export function fmtWhen(iso) {
  const d = new Date(iso), n = new Date();
  const t = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(d, n)) return `Hoy, ${t}`;
  if (same(d, new Date(n.getTime() + 864e5))) return `Mañana, ${t}`;
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' }) + `, ${t}`;
}
export const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
export const hours = (h) => (Number(h) === 1 ? '1 hora' : `${Number(h)} horas`);
export const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
export const hms = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600); return `${h ? h + ':' : ''}${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };

const ICONS = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>', search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/>',
  bell: '<path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 004 0"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', inbox: '<path d="M4 13l3-8h10l3 8v6H4zM4 13h5l1 2h4l1-2h5"/>',
  logout: '<path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9"/>', mic: '<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',
  check: '<path d="M5 13l4 4L19 7"/>', spark: '<path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
export const icon = (n) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

export const logo = (size = 34) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="32" cy="32" rx="30" ry="26" fill="#1C2340"/><ellipse cx="32" cy="32" rx="30" ry="26" fill="none" stroke="#E8A33D" stroke-width="2"/><path d="M32 8l6.5 18.5L58 32l-19.5 5.5L32 56l-6.5-18.5L6 32l19.5-5.5z" fill="#E8A33D"/><circle cx="46" cy="16" r="2.4" fill="#F5F0E6"/></svg>`;
export const stars = (n, total) => `<span class="stars" aria-label="Calificación ${Number(n).toFixed(1)} de 5">★ ${Number(n) ? Number(n).toFixed(1) : 'Nuevo'}${total ? ` <span class="muted small">(${total})</span>` : ''}</span>`;
export const avatar = (name, cls = '', i = 0) => `<div class="av ${cls} c${i % 4}" aria-hidden="true">${esc((name || '?')[0].toUpperCase())}</div>`;
export const spinner = () => '<div class="spin" role="status" aria-label="Cargando"></div>';

export function toast(msg, bad = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (bad ? ' bad' : '');
  t.textContent = msg;
  $('#toasts').append(t);
  setTimeout(() => t.remove(), 4200);
}

// Delegación de eventos: on(root,'click','[data-x]', (e, el) => ...)
export function on(root, type, sel, fn) {
  root.addEventListener(type, (e) => { const el = e.target.closest(sel); if (el && root.contains(el)) fn(e, el); });
}

// Ejecuta una acción asíncrona deshabilitando el botón y mostrando errores.
export async function run(btn, fn, errBox) {
  const label = btn?.innerHTML;
  if (btn) btn.disabled = true;
  if (errBox) errBox.textContent = '';
  try { return await fn(); }
  catch (e) { if (errBox) errBox.textContent = e.message; else toast(e.message, true); }
  finally { if (btn?.isConnected) { btn.disabled = false; btn.innerHTML = label; } }
}

export const formData = (form) => Object.fromEntries(new FormData(form));

// ---- Estructura de la app autenticada ----
const NAV = {
  estudiante: [['#/estudiante', 'home', 'Inicio'], ['#/estudiante/buscar', 'search', 'Buscar tutores'], ['#/estudiante/solicitud/nueva', 'plus', 'Pedir ayuda'],
    ['#/tutorias', 'video', 'Mis tutorías'], ['#/notificaciones', 'bell', 'Avisos'], ['#/perfil', 'user', 'Perfil']],
  tutor: [['#/tutor', 'home', 'Inicio'], ['#/tutor/solicitudes', 'inbox', 'Solicitudes'], ['#/tutorias', 'video', 'Mis tutorías'],
    ['#/tutor/disponibilidad', 'clock', 'Disponibilidad'], ['#/notificaciones', 'bell', 'Avisos'], ['#/perfil', 'user', 'Perfil']],
};

export function shell(user, active, title, inner, unread = 0) {
  const nav = NAV[user.rol].map(([href, ic, label]) =>
    `<a class="nav" href="${href}" ${href === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${href === '#/notificaciones' && unread ? `<b class="dot" data-unread>${unread}</b>` : ''}</a>`).join('');
  return `<div class="app">
    <nav class="side" aria-label="Principal"><a class="brand" href="#/${user.rol === 'tutor' ? 'tutor' : 'estudiante'}">${logo(36)} Lumen</a>${nav}
      <div class="spacer"></div><a class="nav" href="#/salir" data-logout>${icon('logout')}<span>Salir</span></a></nav>
    <main class="main" id="main"><header class="top"><div><p class="muted small">Hola, ${esc(user.nombre)}</p><h1>${esc(title)}</h1></div>
      <div class="me"><a class="bell" href="#/notificaciones" aria-label="Notificaciones">${icon('bell')}${unread ? '<i data-unread-dot></i>' : ''}</a>${avatar(user.nombre)}</div></header>
      <div id="view">${inner}</div></main></div>`;
}
