# Lumen · Aprendizaje en Movimiento

Plataforma web de tutorías en línea y presenciales. Conecta a estudiantes con tutores calificados: el estudiante publica lo que necesita, los tutores le envían ofertas, él elige la mejor y la clase se realiza por videollamada integrada.

**Aplicación en línea:** `PEGAR_URL_DEL_HOSTING`

## Integrantes

- Mendoza Ruidiaz Natalia
- Cala Ardila Jhonny Gabriel
- Henríquez de León Ricardo
- Jairo

## Funcionalidades

**Acceso común**
- Landing con la presentación de Lumen y onboarding.
- Registro como estudiante o tutor, inicio de sesión (correo/contraseña, Google, Apple) y recuperación de contraseña.
- Redirección al panel según el rol.

**Estudiante**
- Dashboard con próximas tutorías y tutores recomendados.
- Nueva solicitud: materia, tema, nivel educativo, modalidad (virtual/presencial), duración y presupuesto por hora.
- Comparación de ofertas (calificación, precio, mensaje) y selección del tutor.
- Acceso a la sala de videollamada y opción de agregar la clase al calendario.

**Tutor**
- Dashboard con solicitudes entrantes, calificaciones y reseñas.
- Revisión de solicitudes, envío de ofertas con precio y mensaje, aceptar o rechazar.
- Listado de tutorías y videollamadas próximas, con acceso a la sala.

## Flujo principal

```
Estudiante publica una solicitud
        ↓
Tutores disponibles envían ofertas
        ↓
Estudiante compara y elige una oferta
        ↓
Se confirma la tutoría
        ↓
Ambos acceden a la sala de videollamada
        ↓
El estudiante califica al tutor
```

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | HTML, CSS (completar) |
| Backend | (completar) |
| Base de datos | PostgreSQL |

## Estructura del proyecto



```
lumen/
├── frontend/
    |-pages

├── backend/
├── .env.
|- .gitignore
└── README.md
```

## Base de datos

Modelo relacional en **PostgreSQL** con 12 tablas: `usuarios`, `tokens_recuperacion`, `perfiles_estudiante`, `perfiles_tutor`, `materias`, `tutor_materias`, `disponibilidad_tutor`, `solicitudes`, `ofertas`, `tutorias`, `resenas` y `notificaciones`.

Incluye triggers para la reputación de los tutores y el cierre de ofertas al aceptar una, y vistas para las pantallas de solicitudes, ofertas y próximas tutorías.

- Script SQL: [`database/lumen_schema.sql`](database/lumen_schema.sql)
- Diagrama Entidad-Relación: [`database/lumen_modelo_ER.drawio`](database/lumen_modelo_ER.drawio)

La conexión se configura con la variable `DATABASE_URL` (ver `.env.example`).
