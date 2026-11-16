// Punto de entrada: enrutador por hash, guardas por rol y sesión.
import { api } from './api.js';
import { state, beginNavigation, loadUser, root, go, home, every, setUnread } from './core.js';
import { toast, esc, on } from './ui.js';
import * as pub from './views/public.js';
import * as stu from './views/student.js';
import * as tut from './views/tutor.js';
import * as sh from './views/shared.js';

// [patrón, vista, acceso]  acceso: 'public' | 'guest' (solo sin sesión) | 'estudiante' | 'tutor' | 'any'
const ROUTES = [
  ['/', pub.landing, 'public'], ['/onboarding', pub.onboarding, 'guest'], ['/login', pub.login, 'guest'], ['/registro', pub.register, 'guest'],
  ['/recuperar', pub.forgot, 'guest'], ['/reset/:token', pub.reset, 'public'],
  ['/estudiante', stu.dashboard, 'estudiante'], ['/estudiante/buscar', stu.buscar, 'estudiante'], ['/estudiante/tutor/:id', stu.tutorPerfil, 'estudiante'],
  ['/estudiante/solicitud/nueva', stu.nueva, 'estudiante'], ['/estudiante/solicitud/:id', stu.solicitud, 'estudiante'], ['/estudiante/oferta/:id', stu.oferta, 'estudiante'],
  ['/tutor', tut.dashboard, 'tutor'], ['/tutor/solicitudes', tut.solicitudes, 'tutor'], ['/tutor/solicitud/:id', tut.solicitud, 'tutor'], ['/tutor/disponibilidad', tut.disponibilidad, 'tutor'],
  ['/tutorias', sh.tutorias, 'any'], ['/tutoria/:id', sh.tutoria, 'any'], ['/tutoria/:id/:mode', sh.tutoria, 'any'],
  ['/notificaciones', sh.notificaciones, 'any'], ['/perfil', sh.perfil, 'any'],
].map(([path, view, access]) => ({ re: new RegExp('^' + path.replace(/:(\w+)/g, '(?<$1>[^/]+)') + '$'), view, access }));

async function render() {
  beginNavigation();
  const [path, qs = ''] = (location.hash.slice(1) || '/').split('?');
  if (path === '/salir') { await api.post('/auth/logout').catch(() => {}); state.user = null; state.unread = 0; return go('#/'); }
  const m = ROUTES.map((r) => ({ r, x: r.re.exec(path) })).find((o) => o.x);
  if (!m) return go('#/');
  const { r, x } = m;
  if (r.access === 'guest' && state.user) return go(home());
  if (!['public', 'guest'].includes(r.access)) {
    if (!state.user) return go('#/login');
    if (r.access !== 'any' && r.access !== state.user.rol) return go(home());
  }
  try { await r.view({ params: x.groups || {}, query: new URLSearchParams(qs) }); }
  catch (e) {
    if (e.status === 401) { state.user = null; return go('#/login'); }
    root().innerHTML = `<div class="pub"><div class="empty" style="margin:15vh auto;max-width:460px"><h2>Algo salió mal</h2><p>${esc(e.message)}</p><p style="margin-top:14px"><a class="btn" href="${state.user ? home() : '#/'}">Ir al inicio</a></p></div></div>`;
  }
}

document.addEventListener('click', async (e) => {
  const a = e.target.closest('[data-logout]');
  if (!a) return;
  e.preventDefault(); go('#/salir');
});

// Revisa notificaciones nuevas cada 20 s (solicitudes, ofertas, confirmaciones).
async function pollUnread() {
  if (!state.user) return;
  try {
    const r = await api.get('/auth/me');
    if (r.no_leidas > state.unread) toast('Tienes notificaciones nuevas');
    setUnread(r.no_leidas);
  } catch { /* se reintenta */ }
}

window.addEventListener('hashchange', render);
(async () => { await loadUser(); setInterval(pollUnread, 20000); await render(); })();
