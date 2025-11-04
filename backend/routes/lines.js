const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const LINES = parseInt(process.env.LINES || '4', 10);
const HOURS = parseInt(process.env.HOURS || '8', 10);

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing token' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'invalid auth header' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Helper to log events to stencil DB (registros table)
async function logRegistro(dbStencil, linea, stencil, usuario, usuario1, fh_i, fh_d) {
  try {
    await dbStencil.query('INSERT INTO registros (linea, stencil, usuario, usuario1, fh_i, fh_d) VALUES (?, ?, ?, ?, ?, ?)', 
      [linea, stencil || '', usuario || '', usuario1 || '', fh_i, fh_d]);
  } catch (e) {
    console.error('logRegistro error', e);
  }
}

// Get state of all lines
router.get('/', async (req, res) => {
  const db = req.dbStencil;
  try {
    const [rows] = await db.query("SELECT `key`, `value` FROM estado WHERE `key` LIKE 'line%';");
    const map = {};
    rows.forEach(r => {
      try { map[r.key] = JSON.parse(r.value); } catch (e) { map[r.key] = { running: false }; }
    });
    const out = [];
    for (let i = 0; i < LINES; i++) {
      out.push(map[`line${i}`] || { running: false });
    }
    res.json({ lines: out, hours: HOURS });
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

// Start a line
router.post('/:id/start', authMiddleware, async (req, res) => {
  const db = req.dbStencil;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 0 || id >= LINES) return res.status(400).json({ error: 'invalid line id' });
  const { stencil } = req.body;
  if (!stencil) return res.status(400).json({ error: 'stencil required' });
  const start_time = Date.now();
  const fh_i = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const value = JSON.stringify({ running: true, stencil, start_time, user: req.user.usuario, fh_i });
  try {
    await db.query('INSERT INTO estado (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [`line${id}`, value]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

// Stop a line
router.post('/:id/stop', authMiddleware, async (req, res) => {
  const db = req.dbStencil;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 0 || id >= LINES) return res.status(400).json({ error: 'invalid line id' });
  const value = JSON.stringify({ running: false });
  try {
    await db.query('INSERT INTO estado (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [`line${id}`, value]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

// Reset after complete
router.post('/:id/reset', authMiddleware, async (req, res) => {
  const db = req.dbStencil;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 0 || id >= LINES) return res.status(400).json({ error: 'invalid line id' });
  try {
    const [rows] = await db.query('SELECT `value` FROM estado WHERE `key` = ?', [`line${id}`]);
    if (!rows || rows.length === 0) return res.status(400).json({ error: 'no cycle to reset' });
    let info;
    try { info = JSON.parse(rows[0].value); } catch (e) { return res.status(400).json({ error: 'invalid state' }); }
    if (!info.start_time || !info.fh_i) return res.status(400).json({ error: 'no start_time or fh_i present' });
    const elapsed = Date.now() - info.start_time;
    if (elapsed < HOURS * 3600 * 1000) return res.status(400).json({ error: 'cycle not completed yet' });
    // Log to registros with start and end times
    const fh_d = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await logRegistro(db, id + 1, info.stencil || '', info.user || req.user.usuario, req.user.usuario, info.fh_i, fh_d);
    const value = JSON.stringify({ running: false });
    await db.query('INSERT INTO estado (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = VALUES(`value`)', [`line${id}`, value]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
