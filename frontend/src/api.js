// Obtener historial filtrado por línea y rango de fechas
export async function getHistory({ line, from, to, limit = 500 }) {
  const params = [];
  if (line) params.push(`line=${encodeURIComponent(line)}`);
  if (from) params.push(`from=${encodeURIComponent(from)}`);
  if (to) params.push(`to=${encodeURIComponent(to)}`);
  let url = `${API_BASE}/history`;
  if (params.length) url += '?' + params.join('&');
  const res = await axios.get(url, { headers: authHeaders() });
  return res.data;
}
import axios from 'axios';

// Use relative path in production, absolute in development
const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.MODE === 'production' ? '/api' : 'http://localhost:8564/api');

let token = null;
export function setToken(t) { token = t; }

function authHeaders() {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function login(usuario, password) {
  const res = await axios.post(`${API_BASE}/auth/login`, { usuario, password });
  return res.data;
}

export async function register(data) {
  const res = await axios.post(`${API_BASE}/auth/register`, data);
  return res.data;
}

export async function getLines() {
  const res = await axios.get(`${API_BASE}/lines`, { headers: authHeaders() });
  return res.data;
}

export async function startLine(id, stencil, usuario, nombre, password) {
  const res = await axios.post(`${API_BASE}/lines/${id}/start`, { stencil, usuario, nombre, password });
  return res.data;
}

export async function stopLine(id, usuario, nombre, password) {
  const res = await axios.post(`${API_BASE}/lines/${id}/stop`, { usuario, nombre, password }, { headers: authHeaders() });
  return res.data;
}

export async function getLogs(limit = 100) {
  const res = await axios.get(`${API_BASE}/logs?limit=${limit}`, { headers: authHeaders() });
  return res.data;
}

export async function lookupUser(numEmpleado) {
  const res = await axios.get(`${API_BASE}/auth/lookup/${numEmpleado}`);
  return res.data;
}
