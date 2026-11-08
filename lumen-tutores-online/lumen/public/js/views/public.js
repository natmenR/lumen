import { api } from '../api.js';
import { state, mountPublic, go, home, loadUser } from '../core.js';
import { esc, $, on, run, toast, formData, logo, icon } from '../ui.js';

const nav = () => `<header class="pub-nav"><a class="brand-pub" href="#/">${logo(40)} Lumen</a>
  <div class="row"><a class="btn btn-ghost btn-sm" href="#/login">Iniciar sesión</a><a class="btn btn-amber btn-sm" href="#/registro">Registrarse</a></div></header>`;

const hasSeenOnboarding = () => { try { return localStorage.getItem('lumen_onb') === '1'; } catch { return false; } };

export async function landing() {
  const { el } = mountPublic(`<div class="pub">${nav()}
    <section class="hero">
      <div>
        <h1>Aprende sin límites, recibe ayuda cuando la necesites.</h1>
        <p class="lead">Lumen conecta a estudiantes con tutores calificados. Pide ayuda ahora y recibe ofertas en segundos, o agenda tu clase con anticipación, en línea o presencial.</p>
        <div class="row"><a class="btn btn-amber" id="cta">Buscar ayuda ahora</a><a class="btn btn-ghost" href="#como">Ver cómo funciona</a></div>
      </div>
      <div class="demo" role="img" aria-label="Ejemplo de ofertas de tutores recibidas en Lumen">
        <div class="tag"><span class="pulse"></span> Cálculo Diferencial · 1 hora · Virtual</div>
        <h3>3 tutores quieren ayudarte</h3>
        <div class="offer-mini"><div class="av av-sm">A</div><div><b>Andrés R.</b><div class="small" style="color:#b8bdd4">★ 4.9 · Cálculo y Álgebra</div></div><span class="price">$24.000</span></div>
        <div class="offer-mini"><div class="av av-sm">C</div><div><b>Camila S.</b><div class="small" style="color:#b8bdd4">★ 4.8 · Matemáticas</div></div><span class="price">$22.000</span></div>
        <div class="offer-mini"><div class="av av-sm">J</div><div><b>Juan P.</b><div class="small" style="color:#b8bdd4">★ 4.7 · Programación</div></div><span class="price">$27.000</span></div>
        <p class="small" style="color:#b8bdd4;margin-top:12px">Ejemplo ilustrativo del flujo de solicitud.</p>
      </div>
    </section>
    <section class="stats-band" id="stats" aria-label="Cifras de Lumen"></section>
    <section class="how" id="como"><h2>Así funciona</h2>
      <div class="grid g3">
        <div class="card"><h3>1. Cuéntanos qué necesitas</h3><p class="muted">Materia, tema, nivel, modalidad, duración y presupuesto por hora.</p></div>
        <div class="card"><h3>2. Compara ofertas</h3><p class="muted">Los tutores disponibles responden con su precio y un mensaje. Tú eliges con calificaciones a la vista.</p></div>
        <div class="card"><h3>3. Estudia sin salir de Lumen</h3><p class="muted">La videollamada está integrada: sin instalar nada más. Si prefieres, también hay clases presenciales.</p></div>
      </div>
      <p class="muted" style="margin-top:20px">¿Das clases? <a href="#/registro">Regístrate como tutor</a> y envía ofertas a estudiantes que buscan tu materia.</p>
    </section>
    <footer class="foot">Lumen · Aprendizaje en movimiento · Universidad de la Costa, Desarrollo Web 2026</footer></div>`);
  $('#cta', el).addEventListener('click', () => {
    if (state.user) return go(state.user.rol === 'estudiante' ? '#/estudiante/solicitud/nueva' : home());
    go(hasSeenOnboarding() ? '#/registro' : '#/onboarding');
  });
  try {
    const s = await api.get('/public/stats');
    $('#stats', el).innerHTML = [[s.tutores, 'tutores registrados'], [Number(s.calificacion) || '—', 'calificación promedio'], [s.materias, 'materias'], [s.tutorias, 'clases finalizadas']]
      .map(([n, l]) => `<div class="stat"><b>${esc(n)}</b><span>${l}</span></div>`).join('');
  } catch { /* las cifras son opcionales */ }
}

const SLIDES = [
  ['Encuentra el tutor perfecto', 'Filtra por materia, nivel, zona y disponibilidad hasta dar con quien te explica mejor.'],
  ['Agenda a tu manera', 'Reserva con anticipación o pide ayuda ahora mismo y te conectamos con el primer tutor disponible.'],
  ['Tu clase, sin salir de Lumen', 'Conéctate por videollamada integrada, sin instalar nada más.'],
];
export function onboarding() {
  let i = 0;
  const { el } = mountPublic('<div class="onb"><div class="panel" id="p"></div></div>');
  const finish = () => { try { localStorage.setItem('lumen_onb', '1'); } catch { /* noop */ } go('#/registro'); };
  const draw = () => {
    const [t, d] = SLIDES[i];
    $('#p', el).innerHTML = `<div style="justify-self:end"><button class="link muted" data-skip>omitir</button></div>
      <div class="badge">${logo(70)}</div><h2>${t}</h2><p class="muted">${d}</p>
      <div class="dots" aria-hidden="true">${SLIDES.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <button class="btn btn-block" data-next>${i === 2 ? 'Comenzar' : 'Siguiente'}</button>`;
    $('[data-next]', el).focus();
  };
  on(el, 'click', '[data-next]', () => (i < 2 ? (i++, draw()) : finish()));
  on(el, 'click', '[data-skip]', finish);
  draw();
}

const side = () => `<aside class="auth-side"><a class="brand-pub" href="#/" style="color:#fff">${logo(44)} Lumen</a>
  <div><h2>Aprende sin límites, recibe ayuda cuando la necesites.</h2>
  <ul><li><b>Tutores calificados</b>Reputación visible por estrellas y reseñas.</li><li><b>Acceso inmediato</b>Pide ayuda y recibe ofertas en segundos.</li><li><b>Videollamada integrada</b>Tu clase, sin salir de Lumen.</li></ul></div>
  <span class="small" style="color:#b8bdd4">Aprendizaje en movimiento</span></aside>`;

const social = () => `<div class="divider">o continúa con</div><div class="row" style="flex-wrap:nowrap"><button type="button" class="btn btn-ghost grow" data-social>Google</button><button type="button" class="btn btn-ghost grow" data-social>Apple</button></div>`;

function bindSocial(el) { on(el, 'click', '[data-social]', () => toast('El acceso con Google/Apple estará disponible al configurar las credenciales OAuth.')); }

export function login() {
  const { el } = mountPublic(`<div class="auth">${side()}<div class="auth-form"><form id="f" novalidate>
    <div><h2>Bienvenido de vuelta</h2><p class="muted">Inicia sesión para continuar tu progreso</p></div>
    <label class="f">Correo<input class="in" name="correo" type="email" autocomplete="email" required placeholder="tucorreo@ejemplo.com"></label>
    <label class="f">Contraseña<input class="in" name="password" type="password" autocomplete="current-password" required></label>
    <div style="text-align:right"><a class="small" href="#/recuperar">¿Olvidaste la contraseña?</a></div>
    <div class="err" role="alert" id="err"></div>
    <button class="btn btn-block" type="submit">Iniciar sesión</button>${social()}
    <p class="center muted">¿No tienes cuenta? <a href="#/registro"><b>Regístrate</b></a></p>
    <div class="card small"><b>Cuentas de prueba</b> (clave <code>Lumen123*</code>)<div class="row" style="margin-top:8px">
      <button type="button" class="btn btn-ghost btn-sm" data-demo="julia@lumen.com">Estudiante: Julia</button>
      <button type="button" class="btn btn-ghost btn-sm" data-demo="andres@lumen.com">Tutor: Andrés</button></div></div>
  </form></div></div>`);
  bindSocial(el);
  on(el, 'click', '[data-demo]', (_e, b) => { el.querySelector('[name=correo]').value = b.dataset.demo; el.querySelector('[name=password]').value = 'Lumen123*'; });
  $('#f', el).addEventListener('submit', (e) => {
    e.preventDefault();
    run($('button[type=submit]', el), async () => {
      const r = await api.post('/auth/login', formData(e.target));
      state.user = r.user; await loadUser(); go(home());
    }, $('#err', el));
  });
}

export function register() {
  const { el } = mountPublic(`<div class="auth">${side()}<div class="auth-form"><form id="f" novalidate>
    <div><h2>Crea tu cuenta</h2><p class="muted">Elige cómo usarás Lumen</p></div>
    <div class="seg" role="radiogroup" aria-label="Tipo de cuenta">
      <input type="radio" name="rol" id="r1" value="estudiante" checked><label for="r1">Estudiante</label>
      <input type="radio" name="rol" id="r2" value="tutor"><label for="r2">Tutor</label></div>
    <div class="row" style="flex-wrap:nowrap"><label class="f grow">Nombre<input class="in" name="nombre" required autocomplete="given-name"></label><label class="f grow">Apellido<input class="in" name="apellido" required autocomplete="family-name"></label></div>
    <label class="f">Correo<input class="in" name="correo" type="email" required autocomplete="email"></label>
    <div class="row" style="flex-wrap:nowrap"><label class="f grow">Ciudad<input class="in" name="ciudad" placeholder="Barranquilla" autocomplete="address-level2"></label>
      <label class="f grow">Celular (opcional)<input class="in" name="telefono" type="tel" placeholder="+57 300 000 0000" autocomplete="tel"></label></div>
    <label class="f" id="nivel">Nivel educativo<select class="in" name="nivel_educativo"><option value="colegio">Colegio</option><option value="pregrado" selected>Pregrado</option><option value="posgrado">Posgrado</option></select></label>
    <label class="f">Contraseña<input class="in" name="password" type="password" required autocomplete="new-password" minlength="8"><span class="hint">Mínimo 8 caracteres, con letras y números.</span></label>
    <div class="err" role="alert" id="err"></div>
    <button class="btn btn-block" type="submit">Crear cuenta</button>${social()}
    <p class="center muted">¿Ya tienes cuenta? <a href="#/login"><b>Inicia sesión</b></a></p></form></div></div>`);
  bindSocial(el);
  on(el, 'change', '[name=rol]', (_e, r) => $('#nivel', el).classList.toggle('hidden', r.value === 'tutor'));
  $('#f', el).addEventListener('submit', (e) => {
    e.preventDefault();
    run($('button[type=submit]', el), async () => {
      const d = formData(e.target);
      if (d.rol === 'tutor') delete d.nivel_educativo;
      const r = await api.post('/auth/register', d);
      state.user = r.user; await loadUser(); toast('¡Cuenta creada! Bienvenido a Lumen'); go(state.user.rol === 'tutor' ? '#/perfil' : '#/estudiante');
    }, $('#err', el));
  });
}

export function forgot() {
  const { el } = mountPublic(`<div class="auth">${side()}<div class="auth-form"><form id="f" novalidate>
    <div><h2>¿Olvidaste tu contraseña?</h2><p class="muted">Escribe tu correo y te enviamos un enlace para crear una nueva.</p></div>
    <label class="f">Correo<input class="in" name="correo" type="email" required autocomplete="email"></label>
    <div class="err" role="alert" id="err"></div><div id="ok"></div>
    <button class="btn btn-block" type="submit">Enviar</button><p class="center"><a href="#/login">Volver a iniciar sesión</a></p></form></div></div>`);
  $('#f', el).addEventListener('submit', (e) => {
    e.preventDefault();
    run($('button[type=submit]', el), async () => {
      const r = await api.post('/auth/forgot', formData(e.target));
      $('#ok', el).innerHTML = `<div class="card small" role="status">Si el correo existe, recibirás un enlace en unos minutos.${r.dev_link ? `<br><br><b>Modo demostración</b> (sin correo configurado): <a href="${esc(r.dev_link)}">abrir enlace de recuperación</a>` : ''}</div>`;
    }, $('#err', el));
  });
}

export function reset({ params }) {
  const { el } = mountPublic(`<div class="auth">${side()}<div class="auth-form"><form id="f" novalidate>
    <div><h2>Crea una nueva contraseña</h2></div>
    <label class="f">Nueva contraseña<input class="in" name="password" type="password" required autocomplete="new-password" minlength="8"></label>
    <div class="err" role="alert" id="err"></div>
    <button class="btn btn-block" type="submit">Guardar contraseña</button></form></div></div>`);
  $('#f', el).addEventListener('submit', (e) => {
    e.preventDefault();
    run($('button[type=submit]', el), async () => {
      await api.post('/auth/reset', { token: params.token, password: formData(e.target).password });
      toast('Contraseña actualizada. Ya puedes iniciar sesión'); go('#/login');
    }, $('#err', el));
  });
}
