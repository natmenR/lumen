# Lumen · Aprendizaje en movimiento
Plataforma web de tutorías en línea / presencial · Proyecto final "Tutores On-Line" · Desarrollo Web · Universidad de la Costa (2026)

Integrantes: Natalia Mendoza Ruiz · Jhonny Gabriel Cala Ardila · Ricardo Henríquez de León

## Arranque rápido
Requiere Node.js 18+ (probado en 22).

```bash
npm install
npm start          # http://localhost:3000
```
El archivo `.env` ya apunta a la base de datos en **Neon**. Al arrancar, el servidor:
1. crea el esquema `lumen` ejecutando `database/bd.sql` si todavía no existe;
2. reemplaza el hash de mentira de los usuarios demo por uno bcrypt real.

Opcional: `npm run db:seed` agrega 3 tutores más, historial con reseñas y 2 solicitudes abiertas (idempotente).
`npm run db:setup` **borra y recrea** el esquema desde `bd.sql`.

### Cuentas demo (clave `Lumen123*`)
| Rol | Correo |
|---|---|
| Estudiante | julia@lumen.com · natalia@lumen.com · monica@lumen.com |
| Tutor | andres@lumen.com · camila@lumen.com · juan@lumen.com (tras `db:seed`: laura@, carlos@, sofia@) |

### Si la conexión a Neon falla
Quita `&channel_binding=require` de `DATABASE_URL` en `.env`. Seguridad: rota la contraseña de Neon, porque fue compartida en un chat, y nunca subas `.env` a un repositorio (ya está en `.gitignore`).

## Flujo implementado (según la rúbrica)
**Acceso común:** landing → onboarding (3 pantallas) → registro con rol → inicio de sesión → recuperación de contraseña → panel según rol.
**Estudiante:** dashboard → pedir ayuda → nueva solicitud (con resumen previo) → búsqueda de tutores en tiempo real → ofertas con cuenta regresiva → detalle → selección → tutoría confirmada → clase lista (vista previa de cámara/micrófono) → sala de videollamada → reseña.
**Tutor:** dashboard → solicitudes disponibles → detalle → oferta (precio + mensaje) → confirmación → mis tutorías → preparar clase → gestión de disponibilidad y perfil.

## Requerimientos del PDF y dónde están
| Requerimiento | Implementación |
|---|---|
| Registro / login estudiantes y tutores | `src/services/auth.js`, bcrypt + JWT en cookie httpOnly |
| Búsqueda por materia, nivel, área geográfica y disponibilidad | `GET /api/tutores` (`repositories/catalog.js`) |
| Reputación por estrellas | tabla `resenas` + trigger `fn_actualizar_reputacion` |
| Reserva de sesiones | solicitud programada (fecha futura) o "Reservar tutoría" desde el perfil del tutor |
| Disponibilidad y aceptar/rechazar solicitudes | `/tutor/disponibilidad`, ofertas y "Rechazar" |
| Videoconferencia integrada | iframe de Jitsi (`JITSI_DOMAIN`, sin API key) |
| Correo / SMS / WhatsApp con registro de la tutoría | `services/messaging.js` (SMTP y Twilio; sin credenciales se registra en consola). Cada envío queda en `notificaciones` |
| Tiempo real tipo Uber/Rappi (opcional) | solicitud inmediata → ofertas con expiración (polling cada 3 s) |
| IA generativa | `services/ai.js`: asistente que precisa la solicitud del estudiante y redacta la oferta del tutor (Anthropic si hay `ANTHROPIC_API_KEY`, plantillas si no) |
| Seguridad | helmet + CSP, rate limit en auth, validación zod, consultas parametrizadas, control por rol y propiedad |
| BD relacional | `database/bd.sql`, diagrama en `docs/diagrama.pgerd` |
| SOLID / organización | rutas → servicios → repositorios, config separada (ver Manual del sistema) |

## Estructura
```
src/  config.js · app.js · server.js
      db/ (pool, bootstrap) · middlewares/ · routes/ · services/ · repositories/ · utils/
public/ index.html · css/ · js/ (core, api, ui, app, views/) · img/
database/bd.sql · docs/ (manuales, propuesta, diagrama) · scripts/ (db-setup, seed)
```

## Despliegue (Render / Railway / similar)
1. Sube el proyecto a GitHub (sin `.env`).
2. Servicio web Node: build `npm install`, start `npm start`.
3. Variables: `DATABASE_URL`, `JWT_SECRET` (largo y aleatorio), `NODE_ENV=production`, `APP_URL=https://tu-dominio`, y opcionales SMTP / Twilio / `ANTHROPIC_API_KEY`.
4. Con SMTP configurado no se muestra el enlace de recuperación en pantalla; sin SMTP deja `EXPOSE_RESET_LINK=true` solo para demostración.

## Limitaciones conocidas
- Los botones "Google/Apple" muestran un aviso: requieren credenciales OAuth.
- Se entrega solo la versión web (sin móvil nativo); la interfaz es responsive.
- Jitsi público puede pedir inicio de sesión del moderador al incrustarse en meet.jit.si; para producción usa tu propio dominio Jitsi/JaaS (`JITSI_DOMAIN`).
