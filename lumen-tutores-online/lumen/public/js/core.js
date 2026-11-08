// Estado de sesión y utilidades de navegación compartidas.
import { api } from './api.js';
import { shell, $ } from './ui.js';

export const state = { user: null, unread: 0 };
let cleanups = [];
let gen = 0;

export const root = () => document.getElementById('app');
export const go = (hash) => { location.hash = hash; };
export const home = () => (state.user?.rol === 'tutor' ? '#/tutor' : '#/estudiante');

export function beginNavigation() {
  cleanups.forEach((f) => { try { f(); } catch { /* noop */ } });
  cleanups = [];
  return ++gen;
}
export const onLeave = (fn) => cleanups.push(fn);
export const every = (fn, ms) => { const id = setInterval(fn, ms); onLeave(() => clearInterval(id)); return id; };

export async function loadUser() {
  try { const r = await api.get('/auth/me'); state.user = r.user; state.unread = r.no_leidas; }
  catch { state.user = null; state.unread = 0; }
  return state.user;
}

// Pinta el marco (menú + encabezado) y devuelve el contenedor de la vista.
// alive() indica si el usuario sigue en esta pantalla tras un await.
export function mount(active, title, inner = '<div class="spin" role="status" aria-label="Cargando"></div>') {
  const my = gen;
  root().innerHTML = shell(state.user, active, title, inner, state.unread);
  window.scrollTo(0, 0);
  return { el: $('#view'), alive: () => my === gen };
}

export function mountPublic(html) {
  const my = gen;
  root().innerHTML = html;
  window.scrollTo(0, 0);
  return { el: root(), alive: () => my === gen };
}

export function setUnread(n) {
  state.unread = n;
  const link = document.querySelector('a.nav[href="#/notificaciones"]');
  link?.querySelector('[data-unread]')?.remove();
  if (link && n) link.insertAdjacentHTML('beforeend', `<b class="dot" data-unread>${n}</b>`);
  const bell = document.querySelector('.bell');
  bell?.querySelector('i')?.remove();
  if (bell && n) bell.insertAdjacentHTML('beforeend', '<i></i>');
}
