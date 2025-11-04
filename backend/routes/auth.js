const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function generateToken(user) {
  return jwt.sign({ usuario: user.usuario, nombre: user.nombre, rol: user.rol }, JWT_SECRET, { expiresIn: '12h' });
}

// Login using credenciales DB
router.post('/login', async (req, res) => {
  const db = req.dbCred;
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'usuario and password required' });
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE usuario = ?', [usuario]);
    const row = rows && rows[0];
    if (!row) return res.status(401).json({ error: 'invalid credentials' });
    const ok = await bcrypt.compare(password, row.pass_hash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = generateToken(row);
    res.json({ token, usuario: row.usuario, nombre: row.nombre, rol: row.rol });
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
