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
    // Convert pass_hash Buffer to string if needed
    const passHash = Buffer.isBuffer(row.pass_hash) ? row.pass_hash.toString('utf8') : row.pass_hash;
    const ok = await bcrypt.compare(password, passHash);
    if (!ok) return res.status(401).json({ error: 'invalid credentials' });
    const token = generateToken(row);
    res.json({ token, usuario: row.usuario, nombre: row.nombre, rol: row.rol });
  } catch (err) {
    res.status(500).json({ error: 'db error' });
  }
});

// Lookup user by num_empleado
router.get('/lookup/:numEmpleado', async (req, res) => {
  const db = req.dbCred;
  let numEmpleado = req.params.numEmpleado;
  if (!numEmpleado) return res.status(400).json({ error: 'num_empleado required' });
  
  try {
    // Normalize input: remove leading zeros, trailing 'A' or 'a', and trim whitespace
    // Examples: "0179A" -> "179", "179" -> "179", "0179a" -> "179", "179A" -> "179"
    const normalized = numEmpleado.trim().replace(/^0+/, '').replace(/[Aa]$/, '');
    
    console.log('Lookup - Original:', numEmpleado, 'Normalized:', normalized);
    
    // Get all users and compare normalized num_empleado
    const [rows] = await db.query('SELECT usuario, nombre, num_empleado FROM users WHERE num_empleado IS NOT NULL');
    
    // Find user by comparing normalized values
    const user = rows.find(row => {
      if (!row.num_empleado) return false;
      const dbNormalized = row.num_empleado.toString().trim().replace(/^0+/, '').replace(/[Aa]$/, '');
      return dbNormalized === normalized;
    });
    
    if (!user) {
      console.log('User not found with normalized number:', normalized);
      return res.status(404).json({ error: 'user not found' });
    }
    
    console.log('User found:', user.nombre, 'with num_empleado:', user.num_empleado);
    res.json({ usuario: user.usuario, nombre: user.nombre, num_empleado: user.num_empleado });
  } catch (err) {
    console.error('Lookup error:', err);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
