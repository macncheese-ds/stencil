const express = require('express');
const bcrypt = require('bcrypt');
require('dotenv').config();

const router = express.Router();
const LINES = parseInt(process.env.LINES || '4', 10);
const HOURS = parseInt(process.env.HOURS || '8', 10);

// Helper to log events to stencil DB (registros table)
async function logRegistro(dbStencil, linea, stencil, usuario, usuario1, fh_i, fh_d) {
  try {
    await dbStencil.query('INSERT INTO registros (linea, stencil, usuario, usuario1, fh_i, fh_d) VALUES (?, ?, ?, ?, ?, ?)', 
      [linea, stencil || '', usuario || '', usuario1 || '', fh_i, fh_d]);
  } catch (e) {
    console.error('logRegistro error', e);
  }
}

// Helper to authenticate user from cred DB
async function authenticateUser(dbCred, usuario, password) {
  if (!usuario || !password) return null;
  try {
    const [rows] = await dbCred.query('SELECT * FROM users WHERE usuario = ?', [usuario]);
    const row = rows && rows[0];
    if (!row) return null;
    const ok = await bcrypt.compare(password, row.pass_hash);
    if (!ok) return null;
    return row;
  } catch (e) {
    console.error('authenticateUser error:', e);
    return null;
  }
}

// Get state of all lines - derive from registros table (latest record per line)
router.get('/', async (req, res) => {
  const db = req.dbStencil;
  if (!db) {
    console.error('dbStencil not attached to request');
    return res.status(500).json({ error: 'db not initialized' });
  }
  try {
    // Get the latest record for each line to determine current state
    const [rows] = await db.query(`
      SELECT linea, stencil, fh_i, fh_d, fh_r, usuario, usuario1
      FROM registros
      WHERE (linea, id) IN (
        SELECT linea, MAX(id) FROM registros GROUP BY linea
      )
      ORDER BY linea ASC
    `);
    
    const map = {};
    rows.forEach(r => {
      // running = fh_d is NULL (end time not set yet)
      const running = r.fh_d === null;
      const start_time = r.fh_i ? new Date(r.fh_i).getTime() : null;
      map[r.linea] = {
        running,
        stencil: r.stencil,
        fh_i: r.fh_i,
        start_time,
        user: r.usuario
      };
    });
    
    const out = [];
    for (let i = 0; i < LINES; i++) {
      out.push(map[i + 1] || { running: false });
    }
    res.json({ lines: out, hours: HOURS });
  } catch (err) {
    console.error('Error in GET /lines:', err.message, err);
    res.status(500).json({ error: 'db error', details: err.message });
  }
});

router.post('/:id/start', async (req, res) => {
  const db = req.dbStencil;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 0 || id >= LINES) return res.status(400).json({ error: 'invalid line id' });
  const { stencil } = req.body;
  if (!stencil) return res.status(400).json({ error: 'stencil required' });
  try {
    const fh_i = new Date().toISOString().slice(0, 19).replace('T', ' ');
    // Insert new record with fh_i set, fh_d and fh_r will be NULL
    await db.query(
      'INSERT INTO registros (linea, stencil, fh_i, fh_d, fh_r) VALUES (?, ?, ?, NULL, NULL)',
      [id + 1, stencil, fh_i]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error in POST /start:', err.message, err);
    res.status(500).json({ error: 'db error', details: err.message });
  }
});

// Stop a line
router.post('/:id/stop', async (req, res) => {
  const db = req.dbStencil;
  const dbCred = req.dbCred;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 0 || id >= LINES) return res.status(400).json({ error: 'invalid line id' });
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'usuario and password required' });
  try {
    const user = await authenticateUser(dbCred, usuario, password);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    // Get the latest running record for this line
    const [rows] = await db.query(
      'SELECT id, fh_i FROM registros WHERE linea = ? AND fh_d IS NULL ORDER BY id DESC LIMIT 1',
      [id + 1]
    );
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'no running cycle to stop' });
    }
    const recordId = rows[0].id;
    const fh_d = new Date().toISOString().slice(0, 19).replace('T', ' ');
    // Update the record with stop time (fh_d) and user
    await db.query(
      'UPDATE registros SET fh_d = ?, usuario = ? WHERE id = ?',
      [fh_d, user.usuario, recordId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Error in POST /stop:', err.message, err);
    res.status(500).json({ error: 'db error', details: err.message });
  }
});

// Reset/Complete a line (set fh_r and create new entry if 8 hours elapsed)
router.post('/:id/reset', async (req, res) => {
  const db = req.dbStencil;
  const dbCred = req.dbCred;
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 0 || id >= LINES) return res.status(400).json({ error: 'invalid line id' });
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'usuario and password required' });
  try {
    const user = await authenticateUser(dbCred, usuario, password);
    if (!user) return res.status(401).json({ error: 'invalid credentials' });
    
    // Get the latest record for this line
    const [rows] = await db.query(
      'SELECT id, fh_i, fh_d FROM registros WHERE linea = ? ORDER BY id DESC LIMIT 1',
      [id + 1]
    );
    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'no cycle to reset' });
    }
    
    const record = rows[0];
    const fh_i = new Date(record.fh_i).getTime();
    const fh_d = record.fh_d ? new Date(record.fh_d).getTime() : Date.now();
    const elapsed = fh_d - fh_i;
    const targetMs = HOURS * 3600 * 1000;
    
    if (elapsed < targetMs) {
      return res.status(400).json({ error: 'cycle not completed yet', elapsed, target: targetMs });
    }
    
    // Set fh_r (completion time) on the current record
    const fh_r = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      'UPDATE registros SET fh_r = ? WHERE id = ?',
      [fh_r, record.id]
    );
    
    res.json({ ok: true });
  } catch (err) {
    console.error('Error in POST /reset:', err.message, err);
    res.status(500).json({ error: 'db error', details: err.message });
  }
});

module.exports = router;
