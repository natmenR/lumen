# Lumen · Aprendizaje en Movimiento

Plataforma web de tutorías en línea y presenciales. Conecta a estudiantes con tutores calificados: el estudiante publica una solicitud, los tutores le envían ofertas, él elige la mejor y la clase se realiza por videollamada integrada.

> Proyecto final **TutoresOn-Line** · Asignatura: Desarrollo Web
> Universidad de la Costa (CUC) · Facultad de Ingeniería · Barranquilla, Colombia
> Docente: Ing. Edgar Murillo Vergel

## Integrantes

- Mendoza Ruiz Natalia
- Cala Ardila Jhonny Gabriel
- Henríquez de León Ricardo
- Jairo 

## Enlaces

| Recurso | URL |
|---|---|
| Repositorio (código HTML/CSS de todas las interfaces) | `PEGAR_URL_DEL_REPOSITORIO` |
| Aplicación desplegada (navegabilidad completa) | `PEGAR_URL_DEL_HOSTING` |

## Funcionalidades

**Acceso común**
- Landing con la presentación de Lumen y onboarding.
- Registro como estudiante o tutor, inicio de sesión (correo/contraseña, Google, Apple) y recuperación de contraseña.
- Redirección al panel según el rol.

**Estudiante**
- Dashboard con próximas tutorías y tutores recomendados.
- Nueva solicitud: materia, tema, nivel educativo, modalidad (virtual/presencial), duración y presupuesto por hora.
- Recepción y comparación de ofertas (calificación, precio, mensaje), selección del tutor y confirmación.
- Acceso a la sala de videollamada y opción de agregar la clase al calendario.

**Tutor**
- Dashboard con solicitudes entrantes, calificaciones y reseñas.
- Revisión de solicitudes, envío de ofertas con precio y mensaje, aceptar o rechazar.
- Listado de tutorías y videollamadas próximas, con acceso a la sala.

## Flujo principal

```
Estudiante publica solicitud
        ↓
Tutores disponibles reciben la solicitud y envían ofertas
        ↓
Estudiante compara y elige una oferta
        ↓
Se confirma la tutoría (las demás ofertas quedan rechazadas)
        ↓
Ambos acceden a la sala de videollamada
        ↓
Al finalizar, el estudiante califica al tutor
```

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | HTML, CSS (completar: JavaScript / framework) |
| Backend | (completar) |
| Base de datos | PostgreSQL |
| Hosting de la base de datos | Neon |
| Despliegue del frontend | (completar: Netlify / Vercel / GitHub Pages) |

## Estructura del proyecto

> Ajustar a la estructura real del repositorio.

```
lumen/
├── database/
│   ├── lumen_schema.sql        # Esquema, triggers, vistas y datos de ejemplo
│   └── lumen_modelo_ER.drawio  # Diagrama Entidad-Relación
├── frontend/                   # HTML, CSS e interfaces
├── backend/                    # API
├── .env.example
├── .gitignore
└── README.md
```

## Base de datos

El diseño es relacional en **PostgreSQL** y está dentro del esquema `lumen`.

**Tablas (12):** `usuarios`, `tokens_recuperacion`, `perfiles_estudiante`, `perfiles_tutor`, `materias`, `tutor_materias`, `disponibilidad_tutor`, `solicitudes`, `ofertas`, `tutorias`, `resenas`, `notificaciones`.

**Lógica incluida en el script:**
- Triggers: recalcula la calificación del tutor al registrar una reseña, rechaza las demás ofertas al aceptar una y solo permite reseñar tutorías finalizadas.
- Vistas: `v_solicitudes_disponibles`, `v_ofertas_solicitud`, `v_proximas_tutorias`.

El diagrama ER está en `database/lumen_modelo_ER.drawio` (se abre en [draw.io](https://app.diagrams.net)).

### Crear la base de datos

1. Crear un proyecto en [Neon](https://neon.com) (plan gratuito).
2. Copiar la *connection string* del proyecto.
3. Ejecutar `database/lumen_schema.sql` en el SQL Editor de Neon.

> **Advertencia:** el script empieza con `DROP SCHEMA lumen CASCADE`, que borra todo el esquema. Ejecútalo una sola vez en la base compartida y avisa al equipo antes de volver a correrlo.

Para que las consultas encuentren las tablas sin escribir `lumen.` cada vez (cambiar el usuario por el de tu cadena de conexión):

```sql
ALTER ROLE neondb_owner SET search_path TO lumen, public;
```

## Configuración local

1. Clonar el repositorio:
   ```bash
   git clone PEGAR_URL_DEL_REPOSITORIO
   cd lumen
   ```
2. Crear el archivo `.env` a partir del ejemplo:
   ```bash
   cp .env.example .env
   ```
3. Completar `DATABASE_URL` con la cadena de conexión que comparte el equipo (por mensaje directo, nunca en el repositorio).
4. Instalar dependencias y ejecutar (completar según la tecnología del backend):
   ```bash
   # ejemplo con Node.js
   npm install
   npm start
   ```

### Variables de entorno

`.env.example`:

```
DATABASE_URL=postgresql://usuario:clave@host/basedatos?sslmode=require
PORT=3000
```

> El archivo `.env` **no se sube a GitHub**. Debe estar en `.gitignore`.

## Despliegue

- **Frontend:** se publica desde el repositorio (Netlify, Vercel o GitHub Pages).
- **Backend (si aplica):** se publica en Render o Railway, configurando `DATABASE_URL` en las variables de entorno del servicio.
- **Base de datos:** Neon (la misma para desarrollo y despliegue).

Nota sobre el plan gratuito de Neon: el cómputo se suspende tras unos minutos sin actividad, por lo que la primera consulta puede tardar un poco más. Conviene abrir la app antes de la sustentación.

## Metodología

Trabajo en equipo con enfoque ágil (Scrum): dailys, entregas parciales (reviews) y retrospectiva semanal. Product Owner: Prof. Edgar Murillo.

## Licencia

Proyecto académico. Universidad de la Costa, 2026.
