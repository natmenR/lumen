// IA generativa (requerimiento del proyecto): asistente que ayuda a
//  1) el estudiante a precisar su solicitud y prepararse para la clase, y
//  2) el tutor a redactar una oferta personalizada.
// Usa la API de Anthropic si hay ANTHROPIC_API_KEY; si no, responde con plantillas locales.
const config = require('../config');
const requests = require('../repositories/requests');
const { bad, notFound } = require('../utils/http');

async function ask(system, user) {
  if (!config.anthropic.key) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': config.anthropic.key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: config.anthropic.model, max_tokens: 700, system, messages: [{ role: 'user', content: user }] }),
      signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json();
    const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) { console.error('[ia] usando respuesta local:', e.message); return null; }
}

async function solicitud({ materia, nivel, tema, texto }) {
  if (!materia) throw bad('Indica la materia');
  const ai = await ask(
    'Eres el asistente académico de Lumen, plataforma colombiana de tutorías. Responde SOLO con JSON válido en español: {"tema_sugerido": string (máx 80 caracteres), "subtemas": [3 strings], "plan": [3 pasos cortos para aprovechar la clase], "preparar": [3 cosas que el estudiante debe llevar]}.',
    `Materia: ${materia}. Nivel: ${nivel || 'pregrado'}. Tema indicado: ${tema || 'no indicado'}. Dificultad que describe: ${texto || 'no indicada'}.`);
  if (ai?.tema_sugerido) return { ...ai, origen: 'ia' };
  return {
    tema_sugerido: tema || `Repaso de ${materia}: conceptos clave y ejercicios`,
    subtemas: [`Conceptos base de ${materia}`, 'Ejercicios resueltos paso a paso', 'Errores frecuentes y cómo evitarlos'],
    plan: ['Cuéntale al tutor qué parte te bloquea', 'Resuelvan juntos un ejercicio modelo', 'Intenta uno por tu cuenta y pide retroalimentación'],
    preparar: ['Tus apuntes o guía de clase', 'Los ejercicios donde te quedaste', 'Calculadora, cuaderno y buena conexión'],
    origen: 'plantilla',
  };
}

async function oferta(user, solicitudId) {
  const s = await requests.findById(solicitudId);
  if (!s) throw notFound('Solicitud no encontrada');
  const ai = await ask(
    'Eres un tutor profesional redactando una oferta breve, cálida y concreta para un estudiante. Responde SOLO con JSON: {"mensaje": string (máx 280 caracteres, en español, sin saludos genéricos)}.',
    `Materia: ${s.materia}. Tema: ${s.tema_especifico || 'general'}. Nivel: ${s.nivel_educativo}. Duración: ${s.duracion_horas} h. Modalidad: ${s.modalidad}. Estudiante: ${s.estudiante_nombre}.`);
  if (ai?.mensaje) return { mensaje: String(ai.mensaje).slice(0, 500), origen: 'ia' };
  return {
    mensaje: `Hola ${s.estudiante_nombre}, puedo ayudarte con ${s.tema_especifico || s.materia}. Trabajamos con ejemplos paso a paso y resolvemos tus dudas en vivo. ¡Cuando quieras empezamos!`,
    origen: 'plantilla',
  };
}

module.exports = { solicitud, oferta };
