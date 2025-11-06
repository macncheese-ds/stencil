const express = require('express');
require('dotenv').config();
const router = express.Router();

// GET /api/history?line=LINE_NAME&from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/', async (req, res) => {
  const db = req.dbStencil;
  const { line, from, to } = req.query;
  const where = [];
  const params = [];

  if (line) {
    where.push('linea = ?');
    params.push(line);
  }
  if (from) {
    where.push('(fh_i >= ? OR fh_d >= ?)');
    params.push(from + ' 00:00:00', from + ' 00:00:00');
  }
  if (to) {
    where.push('(fh_i <= ? OR fh_d <= ?)');
    params.push(to + ' 23:59:59', to + ' 23:59:59');
  }

  let sql = `SELECT id, linea, stencil, fh_i, fh_d, usuario, usuario1 FROM registros`;
  if (where.length) sql += ' WHERE ' + where.join(' AND ');
  sql += ' ORDER BY fh_i DESC, id DESC LIMIT 500';

  try {
    const [rows] = await db.query(sql, params);
    res.json({ history: rows });
  } catch (err) {
    console.error('Error in GET /history:', err);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
