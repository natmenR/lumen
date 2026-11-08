

-- =====================================================================
-- LUMEN · Aprendizaje en Movimiento
-- Plataforma de Tutorías en Línea / Presencial
-- Base de datos relacional · PostgreSQL 14+
-- Asignatura: Desarrollo Web · Universidad de la Costa (CUC)
-- =====================================================================

DROP SCHEMA IF EXISTS lumen CASCADE;
CREATE SCHEMA lumen;
SET search_path TO lumen;

-- ---------------------------------------------------------------------
-- 1. TIPOS ENUMERADOS
-- ---------------------------------------------------------------------
CREATE TYPE rol_usuario        AS ENUM ('estudiante', 'tutor');
CREATE TYPE nivel_educativo    AS ENUM ('colegio', 'pregrado', 'posgrado');
CREATE TYPE modalidad_tutoria  AS ENUM ('virtual', 'presencial');
CREATE TYPE tipo_solicitud     AS ENUM ('inmediata', 'programada');
CREATE TYPE estado_solicitud   AS ENUM ('activa', 'asignada', 'cancelada', 'expirada');
CREATE TYPE estado_oferta      AS ENUM ('pendiente', 'aceptada', 'rechazada', 'expirada');
CREATE TYPE estado_tutoria     AS ENUM ('confirmada', 'en_curso', 'finalizada', 'cancelada');
CREATE TYPE canal_notificacion AS ENUM ('app', 'correo', 'sms', 'whatsapp');

-- ---------------------------------------------------------------------
-- 2. USUARIOS Y ACCESO (Registro, Inicio de sesión, Recuperación)
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL,
    apellido       VARCHAR(100) NOT NULL,
    correo         VARCHAR(150) NOT NULL UNIQUE,
    password_hash  VARCHAR(255),                       -- NULL si ingresa con Google/Apple
    proveedor_auth VARCHAR(20)  NOT NULL DEFAULT 'local'
                   CHECK (proveedor_auth IN ('local', 'google', 'apple')),
    rol            rol_usuario  NOT NULL,
    telefono       VARCHAR(20),
    avatar_url     TEXT,
    activo         BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_password_local
        CHECK (proveedor_auth <> 'local' OR password_hash IS NOT NULL)
);

CREATE TABLE tokens_recuperacion (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT       NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expira_en  TIMESTAMPTZ  NOT NULL,
    usado      BOOLEAN      NOT NULL DEFAULT FALSE,
    creado_en  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 3. PERFILES POR ROL (relación 1:1 con usuarios)
-- ---------------------------------------------------------------------
CREATE TABLE perfiles_estudiante (
    usuario_id      BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    nivel_educativo nivel_educativo NOT NULL DEFAULT 'pregrado',
    institucion     VARCHAR(150),
    ciudad          VARCHAR(100)
);

CREATE TABLE perfiles_tutor (
    usuario_id            BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
    biografia             TEXT,
    ciudad                VARCHAR(100),
    zona                  VARCHAR(100),                -- área geográfica para clases presenciales
    tarifa_hora_base      NUMERIC(10,2) CHECK (tarifa_hora_base >= 0),
    disponible_ahora      BOOLEAN       NOT NULL DEFAULT FALSE,
    calificacion_promedio NUMERIC(3,2)  NOT NULL DEFAULT 0 CHECK (calificacion_promedio BETWEEN 0 AND 5),
    total_resenas         INTEGER       NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- 4. CATÁLOGO ACADÉMICO Y DISPONIBILIDAD
-- ---------------------------------------------------------------------
CREATE TABLE materias (
    id     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    area   VARCHAR(100)
);

CREATE TABLE tutor_materias (
    tutor_id        BIGINT  NOT NULL REFERENCES perfiles_tutor(usuario_id) ON DELETE CASCADE,
    materia_id      INTEGER NOT NULL REFERENCES materias(id) ON DELETE CASCADE,
    nivel_educativo nivel_educativo NOT NULL,
    PRIMARY KEY (tutor_id, materia_id, nivel_educativo)
);

CREATE TABLE disponibilidad_tutor (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tutor_id    BIGINT   NOT NULL REFERENCES perfiles_tutor(usuario_id) ON DELETE CASCADE,
    dia_semana  SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),   -- 1 = lunes
    hora_inicio TIME     NOT NULL,
    hora_fin    TIME     NOT NULL,
    CONSTRAINT chk_horario CHECK (hora_fin > hora_inicio)
);

-- ---------------------------------------------------------------------
-- 5. FLUJO PRINCIPAL: SOLICITUD → OFERTAS → TUTORÍA
-- ---------------------------------------------------------------------
CREATE TABLE solicitudes (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    estudiante_id    BIGINT  NOT NULL REFERENCES perfiles_estudiante(usuario_id),
    materia_id       INTEGER NOT NULL REFERENCES materias(id),
    tema_especifico  VARCHAR(200),
    nivel_educativo  nivel_educativo   NOT NULL,
    modalidad        modalidad_tutoria NOT NULL,
    tipo             tipo_solicitud    NOT NULL DEFAULT 'inmediata',
    fecha_programada TIMESTAMPTZ,                      -- solo si tipo = 'programada'
    duracion_horas   NUMERIC(3,1)      NOT NULL CHECK (duracion_horas > 0),
    presupuesto_hora NUMERIC(10,2)     CHECK (presupuesto_hora >= 0),
    ciudad           VARCHAR(100),                     -- obligatoria en presencial
    estado           estado_solicitud  NOT NULL DEFAULT 'activa',
    creada_en        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_programada  CHECK (tipo <> 'programada' OR fecha_programada IS NOT NULL),
    CONSTRAINT chk_presencial  CHECK (modalidad <> 'presencial' OR ciudad IS NOT NULL)
);

CREATE TABLE ofertas (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id BIGINT NOT NULL REFERENCES solicitudes(id) ON DELETE CASCADE,
    tutor_id     BIGINT NOT NULL REFERENCES perfiles_tutor(usuario_id),
    precio_hora  NUMERIC(10,2) NOT NULL CHECK (precio_hora >= 0),
    mensaje      TEXT,
    estado       estado_oferta NOT NULL DEFAULT 'pendiente',
    creada_en    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    expira_en    TIMESTAMPTZ   NOT NULL,
    UNIQUE (solicitud_id, tutor_id)                    -- un tutor, una oferta por solicitud
);

CREATE TABLE tutorias (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    solicitud_id  BIGINT NOT NULL UNIQUE REFERENCES solicitudes(id),
    oferta_id     BIGINT NOT NULL UNIQUE REFERENCES ofertas(id),
    estudiante_id BIGINT NOT NULL REFERENCES perfiles_estudiante(usuario_id),
    tutor_id      BIGINT NOT NULL REFERENCES perfiles_tutor(usuario_id),
    fecha_inicio  TIMESTAMPTZ NOT NULL,
    duracion_horas NUMERIC(3,1) NOT NULL CHECK (duracion_horas > 0),
    precio_hora   NUMERIC(10,2) NOT NULL,
    precio_total  NUMERIC(12,2) GENERATED ALWAYS AS (precio_hora * duracion_horas) STORED,
    modalidad     modalidad_tutoria NOT NULL,
    enlace_sala   TEXT,                                -- sala de videollamada integrada
    estado        estado_tutoria NOT NULL DEFAULT 'confirmada',
    creada_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 6. REPUTACIÓN Y NOTIFICACIONES
-- ---------------------------------------------------------------------
CREATE TABLE resenas (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tutoria_id    BIGINT NOT NULL UNIQUE REFERENCES tutorias(id) ON DELETE CASCADE,
    estudiante_id BIGINT NOT NULL REFERENCES perfiles_estudiante(usuario_id),
    tutor_id      BIGINT NOT NULL REFERENCES perfiles_tutor(usuario_id),
    puntaje       SMALLINT NOT NULL CHECK (puntaje BETWEEN 1 AND 5),
    titulo        VARCHAR(100),
    comentario    TEXT,
    creada_en     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notificaciones (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tutoria_id BIGINT REFERENCES tutorias(id) ON DELETE SET NULL,
    tipo       VARCHAR(40)  NOT NULL,                  -- nueva_solicitud, oferta_recibida, tutoria_confirmada...
    titulo     VARCHAR(150) NOT NULL,
    mensaje    TEXT,
    canal      canal_notificacion NOT NULL DEFAULT 'app',
    leida      BOOLEAN     NOT NULL DEFAULT FALSE,
    creada_en  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------
-- 7. ÍNDICES (búsquedas frecuentes)
-- ---------------------------------------------------------------------
CREATE INDEX idx_solicitudes_estado_materia ON solicitudes (estado, materia_id);
CREATE INDEX idx_solicitudes_estudiante     ON solicitudes (estudiante_id);
CREATE INDEX idx_ofertas_solicitud          ON ofertas (solicitud_id);
CREATE INDEX idx_ofertas_tutor              ON ofertas (tutor_id);
CREATE INDEX idx_tutorias_estudiante_fecha  ON tutorias (estudiante_id, fecha_inicio);
CREATE INDEX idx_tutorias_tutor_fecha       ON tutorias (tutor_id, fecha_inicio);
CREATE INDEX idx_tutor_materias_materia     ON tutor_materias (materia_id);
CREATE INDEX idx_perfiles_tutor_zona        ON perfiles_tutor (ciudad, zona);
CREATE INDEX idx_disponibilidad_tutor       ON disponibilidad_tutor (tutor_id, dia_semana);
CREATE INDEX idx_notificaciones_usuario     ON notificaciones (usuario_id, leida);

-- ---------------------------------------------------------------------
-- 8. TRIGGERS DE LÓGICA DE NEGOCIO
-- ---------------------------------------------------------------------

-- 8.1 Recalcula la reputación del tutor al registrar una reseña
CREATE OR REPLACE FUNCTION fn_actualizar_reputacion() RETURNS TRIGGER AS $$
BEGIN
    UPDATE perfiles_tutor
       SET calificacion_promedio = (SELECT ROUND(AVG(puntaje)::numeric, 2)
                                      FROM resenas WHERE tutor_id = NEW.tutor_id),
           total_resenas         = (SELECT COUNT(*) FROM resenas WHERE tutor_id = NEW.tutor_id)
     WHERE usuario_id = NEW.tutor_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reputacion
AFTER INSERT OR UPDATE OF puntaje ON resenas
FOR EACH ROW EXECUTE FUNCTION fn_actualizar_reputacion();

-- 8.2 Al aceptar una oferta: rechaza las demás y marca la solicitud como asignada
CREATE OR REPLACE FUNCTION fn_aceptar_oferta() RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estado = 'aceptada' AND OLD.estado <> 'aceptada' THEN
        UPDATE ofertas
           SET estado = 'rechazada'
         WHERE solicitud_id = NEW.solicitud_id
           AND id <> NEW.id
           AND estado = 'pendiente';

        UPDATE solicitudes
           SET estado = 'asignada'
         WHERE id = NEW.solicitud_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_aceptar_oferta
AFTER UPDATE OF estado ON ofertas
FOR EACH ROW EXECUTE FUNCTION fn_aceptar_oferta();

-- 8.3 Solo se puede reseñar una tutoría finalizada y por su propio estudiante/tutor
CREATE OR REPLACE FUNCTION fn_validar_resena() RETURNS TRIGGER AS $$
DECLARE
    t tutorias%ROWTYPE;
BEGIN
    SELECT * INTO t FROM tutorias WHERE id = NEW.tutoria_id;
    IF t.estado <> 'finalizada' THEN
        RAISE EXCEPTION 'Solo se pueden reseñar tutorías finalizadas';
    END IF;
    IF t.estudiante_id <> NEW.estudiante_id OR t.tutor_id <> NEW.tutor_id THEN
        RAISE EXCEPTION 'La reseña no corresponde a los participantes de la tutoría';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validar_resena
BEFORE INSERT ON resenas
FOR EACH ROW EXECUTE FUNCTION fn_validar_resena();

-- ---------------------------------------------------------------------
-- 9. VISTAS ÚTILES PARA EL BACKEND
-- ---------------------------------------------------------------------

-- Solicitudes abiertas que ve el tutor (pantalla "Solicitudes entrantes")
CREATE VIEW v_solicitudes_disponibles AS
SELECT s.id, m.nombre AS materia, s.tema_especifico, s.nivel_educativo, s.modalidad,
       s.duracion_horas, s.presupuesto_hora,
       u.nombre AS estudiante, s.creada_en
  FROM solicitudes s
  JOIN materias m ON m.id = s.materia_id
  JOIN usuarios u ON u.id = s.estudiante_id
 WHERE s.estado = 'activa';

-- Ofertas que ve el estudiante (pantalla "Elige una oferta")
CREATE VIEW v_ofertas_solicitud AS
SELECT o.id, o.solicitud_id, u.nombre AS tutor, pt.calificacion_promedio,
       o.precio_hora, o.mensaje, o.expira_en
  FROM ofertas o
  JOIN perfiles_tutor pt ON pt.usuario_id = o.tutor_id
  JOIN usuarios u        ON u.id = o.tutor_id
 WHERE o.estado = 'pendiente';

-- Próximas tutorías de cualquier usuario (Mis tutorías / Mis videollamadas)
CREATE VIEW v_proximas_tutorias AS
SELECT t.id, t.fecha_inicio, t.duracion_horas, t.precio_total, t.modalidad, t.estado,
       t.enlace_sala,
       ue.nombre AS estudiante, ut.nombre AS tutor, t.estudiante_id, t.tutor_id
  FROM tutorias t
  JOIN usuarios ue ON ue.id = t.estudiante_id
  JOIN usuarios ut ON ut.id = t.tutor_id
 WHERE t.estado IN ('confirmada', 'en_curso');

-- ---------------------------------------------------------------------
-- 10. DATOS DE EJEMPLO (basados en el prototipo)
-- ---------------------------------------------------------------------
INSERT INTO usuarios (nombre, apellido, correo, password_hash, rol) VALUES
 ('Julia',  'Martínez', 'julia@lumen.com',  'HASH_BCRYPT_DEMO', 'estudiante'),
 ('Natalia','Mendoza',  'natalia@lumen.com','HASH_BCRYPT_DEMO', 'estudiante'),
 ('Mónica', 'Pérez',    'monica@lumen.com', 'HASH_BCRYPT_DEMO', 'estudiante'),
 ('Andrés', 'Rodríguez','andres@lumen.com', 'HASH_BCRYPT_DEMO', 'tutor'),
 ('Camila', 'Sánchez',  'camila@lumen.com', 'HASH_BCRYPT_DEMO', 'tutor'),
 ('Juan',   'Pérez',    'juan@lumen.com',   'HASH_BCRYPT_DEMO', 'tutor');

INSERT INTO perfiles_estudiante (usuario_id, nivel_educativo, ciudad) VALUES
 (1, 'pregrado', 'Barranquilla'),
 (2, 'pregrado', 'Barranquilla'),
 (3, 'colegio',  'Barranquilla');

INSERT INTO perfiles_tutor (usuario_id, biografia, ciudad, tarifa_hora_base, disponible_ahora) VALUES
 (4, 'Ingeniero con experiencia en Cálculo y Álgebra.', 'Barranquilla', 24000, TRUE),
 (5, 'Licenciada en Matemáticas.',                      'Barranquilla', 22000, TRUE),
 (6, 'Ingeniero de sistemas y tutor de programación.',  'Barranquilla', 27000, FALSE);

INSERT INTO materias (nombre, area) VALUES
 ('Cálculo Diferencial', 'Matemáticas'),
 ('Química',             'Ciencias'),
 ('Inglés',              'Idiomas'),
 ('Programación',        'Ingeniería'),
 ('Física',              'Ciencias');

INSERT INTO tutor_materias (tutor_id, materia_id, nivel_educativo) VALUES
 (4, 1, 'pregrado'), (5, 1, 'pregrado'), (6, 1, 'pregrado'), (6, 4, 'pregrado');

INSERT INTO disponibilidad_tutor (tutor_id, dia_semana, hora_inicio, hora_fin) VALUES
 (4, 1, '14:00', '18:00'), (4, 3, '14:00', '18:00'), (5, 2, '08:00', '12:00');

-- Flujo del prototipo: Julia pide ayuda → 3 ofertas → elige a Andrés
INSERT INTO solicitudes (estudiante_id, materia_id, tema_especifico, nivel_educativo,
                         modalidad, tipo, duracion_horas, presupuesto_hora)
VALUES (1, 1, 'Derivadas parciales', 'pregrado', 'virtual', 'inmediata', 1, 25000);

INSERT INTO ofertas (solicitud_id, tutor_id, precio_hora, mensaje, expira_en) VALUES
 (1, 4, 24000, 'Puedo ayudarte hoy mismo.', NOW() + INTERVAL '2 minutes'),
 (1, 5, 22000, 'Disponible ahora.',          NOW() + INTERVAL '2 minutes'),
 (1, 6, 27000, 'Te explico con ejemplos.',   NOW() + INTERVAL '2 minutes');

UPDATE ofertas SET estado = 'aceptada' WHERE id = 1;   -- dispara trg_aceptar_oferta

INSERT INTO tutorias (solicitud_id, oferta_id, estudiante_id, tutor_id, fecha_inicio,
                      duracion_horas, precio_hora, modalidad, enlace_sala)
VALUES (1, 1, 1, 4, NOW() + INTERVAL '1 hour', 1, 24000, 'virtual',
        'https://meet.jit.si/lumen-tutoria-1');

INSERT INTO notificaciones (usuario_id, tutoria_id, tipo, titulo, mensaje) VALUES
 (1, 1, 'tutoria_confirmada', '¡Tutoría confirmada!', 'Andrés aceptó tu solicitud.'),
 (4, 1, 'tutoria_confirmada', 'Oferta aceptada',      'Julia aceptó tu propuesta.');
