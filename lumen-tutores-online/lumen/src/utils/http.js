class HttpError extends Error {
  constructor(status, message, details) { super(message); this.status = status; this.details = details; }
}
const bad = (m, d) => new HttpError(400, m, d);
const unauthorized = (m = 'Debes iniciar sesión') => new HttpError(401, m);
const forbidden = (m = 'No tienes permiso para esta acción') => new HttpError(403, m);
const notFound = (m = 'No encontrado') => new HttpError(404, m);
const conflict = (m) => new HttpError(409, m);

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Valida con zod y lanza 400 con mensaje legible.
function parse(schema, data) {
  const r = schema.safeParse(data);
  if (!r.success) {
    const first = r.error.issues[0];
    throw bad(`${first.path.join('.') || 'datos'}: ${first.message}`, r.error.issues);
  }
  return r.data;
}
module.exports = { HttpError, bad, unauthorized, forbidden, notFound, conflict, wrap, parse };
