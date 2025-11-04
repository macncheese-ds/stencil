const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

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

// Get registros (admin only)
router.get('/', authMiddleware, async (req, res) => {
  if (!req.user || req.user.rol !== 'Administrador') return res.status(403).json({ error: 'admin required' });
  const db = req.dbStencil;
  try {
    const [rows] = await db.query('SELECT * FROM registros ORDER BY id DESC LIMIT 1000');
    res.json({ registros: rows });
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
