import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8564/api';

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

export async function startLine(id, stencil) {
  const res = await axios.post(`${API_BASE}/lines/${id}/start`, { stencil });
  return res.data;
}

export async function stopLine(id, usuario, password) {
  const res = await axios.post(`${API_BASE}/lines/${id}/stop`, { usuario, password }, { headers: authHeaders() });
  return res.data;
}

export async function resetLine(id, usuario, password) {
  const res = await axios.post(`${API_BASE}/lines/${id}/reset`, { usuario, password }, { headers: authHeaders() });
  return res.data;
}

export async function getLogs() {
  const res = await axios.get(`${API_BASE}/logs`, { headers: authHeaders() });
  return res.data;
}
