// Cliente HTTP de la API de Lumen.
export class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

async function req(method, url, body) {
  const r = await fetch('/api' + url, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(data.error || 'Error inesperado', r.status);
  return data;
}
const qs = (o = {}) => {
  const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null && v !== false));
  return p.toString() ? '?' + p : '';
};

export const api = {
  get: (u, params) => req('GET', u + qs(params)),
  post: (u, b = {}) => req('POST', u, b),
  put: (u, b) => req('PUT', u, b),
  patch: (u, b) => req('PATCH', u, b),
};
