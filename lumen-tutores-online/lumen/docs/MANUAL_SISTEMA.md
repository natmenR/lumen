# Manual del sistema · Lumen

## Arquitectura
Aplicación monolítica: API REST (Node.js + Express) que además sirve el cliente web (HTML/CSS/JS modular sin build). Base de datos PostgreSQL (Neon). Autenticación con JWT en cookie httpOnly (SameSite=Lax).

```
Navegador (SPA hash-router) ⇄ /api (Express) → services → repositories → PostgreSQL (esquema lumen)
```

## Capas y principios SOLID
- **routes/**: solo HTTP (parseo, rol, respuesta).
- **services/**: reglas de negocio (`requests`, `tutorias`, `auth`, `notifier`, `ai`, `messaging`). Cada servicio tiene una responsabilidad (S) y depende de repositorios y utilidades, no de Express (D).
- **repositories/**: todo el SQL; cambiar de motor solo afecta esta capa (O/D).
- **messaging / ai**: canales intercambiables (SMTP, Twilio, Anthropic) con respaldo local, sin tocar el flujo (O/L).
- **middlewares/**: autenticación, autorización por rol, manejo de errores uniforme.

## Base de datos
Definida en `database/bd.sql` (11 tablas, 8 enums, 3 vistas y 3 triggers). Diagrama editable en `docs/diagrama.pgerd` (pgAdmin ERD).
- `trg_aceptar_oferta`: al aceptar una oferta rechaza las demás y marca la solicitud `asignada`.
- `trg_reputacion`: recalcula promedio y total de reseñas del tutor.
- `trg_validar_resena`: solo tutorías finalizadas y por sus participantes.
Todas las consultas usan `lumen.<tabla>` para funcionar con el pooler de Neon.

## Reglas de negocio clave
- Oferta inmediata expira en `OFFER_TTL_MINUTES` (5); las de solicitudes programadas duran 24 h. La solicitud inmediata expira a los `REQUEST_TTL_MINUTES` (30). El vencimiento se aplica al consultar.
- Un tutor solo envía una oferta por solicitud. Aceptar la oferta ocurre en una transacción con bloqueo de filas; crea la tutoría con sala Jitsi única.
- La sala se habilita 15 min antes del inicio; solo el tutor finaliza; solo el estudiante califica, una vez, tras finalizar.
- El tutor solo ve el nombre de pila del estudiante.

## API (prefijo `/api`)
| Grupo | Endpoints |
|---|---|
| Auth | `POST auth/register · login · logout · forgot · reset`, `GET/PATCH auth/me` |
| Catálogo | `GET materias`, `GET tutores`, `GET tutores/:id`, `GET public/stats` |
| Solicitudes | `POST solicitudes`, `GET solicitudes/mias`, `GET solicitudes/:id`, `POST solicitudes/:id/cancelar`, `POST solicitudes/:id/ofertas` |
| Ofertas | `GET ofertas/:id`, `POST ofertas/:id/aceptar` |
| Tutor | `GET tutor/dashboard · solicitudes · ofertas · disponibilidad`, `PUT tutor/disponibilidad · perfil` |
| Estudiante | `GET estudiante/dashboard` |
| Tutorías | `GET tutorias`, `GET tutorias/:id`, `POST tutorias/:id/entrar · finalizar · cancelar · resena` |
| Otros | `GET notificaciones`, `POST notificaciones/leer`, `POST ia/solicitud`, `POST ia/oferta` |

## Configuración (.env)
Ver `.env.example`. Variables: `DATABASE_URL`, `JWT_SECRET`, `APP_URL`, `OFFER_TTL_MINUTES`, `REQUEST_TTL_MINUTES`, `JITSI_DOMAIN`, `SMTP_*`, `TWILIO_*`, `ANTHROPIC_API_KEY`, `EXPOSE_RESET_LINK`.

## Seguridad
Hash bcrypt (10 rondas), cookie httpOnly/SameSite, helmet con CSP estricta (solo recursos propios, Google Fonts y el dominio Jitsi), límite de intentos en autenticación, validación con zod, SQL parametrizado, escape de HTML en el cliente, respuestas genéricas en recuperación de contraseña y autorización por rol y por propiedad del recurso.

## Pruebas manuales sugeridas
1. Julia crea solicitud inmediata de Cálculo → en otra ventana Andrés y Camila envían ofertas → Julia acepta → ambos ven la tutoría → Andrés finaliza → Julia califica.
2. Registro de un tutor nuevo, selección de materias y disponibilidad → aparece en la búsqueda.
