const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
require('dotenv').config();

// Configuration: min, max, supervisor values (can be overridden via .env)
const DEFAULT_MIN = parseFloat(process.env.TENSION_MIN || '0');
const DEFAULT_MAX = parseFloat(process.env.TENSION_MAX || '100');
const DEFAULT_SUPERVISOR = process.env.TENSION_SUPERVISOR || 'SUPERVISOR';

/**
 * Authenticate user by num_empleado (employee badge number)
 * Normalizes the input to remove leading zeros and trailing 'A'/'a'
 */
async function authenticateUserByBadge(dbCred, numEmpleado, password) {
  if (!numEmpleado || !password) {
    console.log('authenticateUserByBadge: missing numEmpleado or password');
    return null;
  }
  
  try {
    // Normalize input: remove leading zeros, trailing 'A' or 'a', and trim whitespace
    const normalized = numEmpleado.toString().trim().replace(/^0+/, '').replace(/[Aa]$/, '');
    
    console.log('authenticateUserByBadge: Original:', numEmpleado, 'Normalized:', normalized);
    
    // Get all users and compare normalized num_empleado
    const [rows] = await dbCred.query('SELECT * FROM users WHERE num_empleado IS NOT NULL');
    
    // Find user by comparing normalized values
    const user = rows.find(row => {
      if (!row.num_empleado) return false;
      const dbNormalized = row.num_empleado.toString().trim().replace(/^0+/, '').replace(/[Aa]$/, '');
      return dbNormalized === normalized;
    });
    
    if (!user) {
      console.log('authenticateUserByBadge: user not found with normalized badge:', normalized);
      return null;
    }
    
    console.log('authenticateUserByBadge: user found, checking password');
    
    // Convert pass_hash Buffer to string if needed
    const passHash = Buffer.isBuffer(user.pass_hash) ? user.pass_hash.toString('utf8') : user.pass_hash;
    const ok = await bcrypt.compare(password, passHash);
    
    if (!ok) {
      console.log('authenticateUserByBadge: password mismatch');
      return null;
    }
    
    console.log('authenticateUserByBadge: success for user:', user.nombre);
    return user;
  } catch (e) {
    console.error('authenticateUserByBadge error:', e);
    return null;
  }
}

// POST /api/tensions - Register new tension
router.post('/', async (req, res) => {
  const db = req.dbStencil;
  const dbCred = req.dbCred;
  
  console.log('\n============ POST /api/tensions ============');
  console.log('Full req.body:', req.body);
  
  const { numero, id, da, db: dbv, dc, dd, de, num_empleado, password } = req.body;
  const stencilNumero = (numero !== undefined && numero !== null) ? numero : id;

  console.log('Extracted - numero:', stencilNumero);
  console.log('Extracted - num_empleado:', num_empleado);
  console.log('Extracted - password:', password ? 'EXISTS (length: ' + password.length + ')' : 'MISSING');
  console.log('============================================\n');
  
  if (!stencilNumero && stencilNumero !== 0) {
    console.log('❌ VALIDATION FAILED: numero is missing');
    return res.status(400).json({ error: 'numero required' });
  }

  // Validate numeric values for da..de with two decimals
  // All values are converted to negative
  const parseNum = (v) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number.parseFloat(v);
    if (Number.isNaN(n)) return NaN;
    // Convert to negative (if positive, make negative; if already negative, keep it)
    const absVal = Math.abs(n);
    return Math.round(absVal * 100) / 100 * -1;
  };

  const vals = [da, dbv, dc, dd, de].map(parseNum);
  if (vals.some(v => Number.isNaN(v))) {
    console.log('❌ VALIDATION FAILED: Numeric values are invalid');
    return res.status(400).json({ error: 'da..de must be numeric' });
  }
  
  console.log('Valores convertidos a negativos:', vals);

  // Authenticate using employee badge number
  if (!num_empleado || !password) {
    console.log('❌ VALIDATION FAILED: num_empleado:', num_empleado, '| password:', password);
    return res.status(400).json({ error: 'num_empleado and password required' });
  }
  
  try {
    console.log('Authenticating user by badge:', num_empleado);
    const user = await authenticateUserByBadge(dbCred, num_empleado, password);
    if (!user) {
      console.log('Authentication failed for badge:', num_empleado);
      return res.status(401).json({ error: 'invalid credentials' });
    }
    
    console.log('Authentication successful for user:', user.nombre);

    const operador = user.nombre;

    // Get model from stencil table by numero using the most recent update for that numero
    const [rows] = await db.query('SELECT model FROM stencil WHERE numero = ? ORDER BY id DESC LIMIT 1', [stencilNumero]);
    const model = rows && rows[0] ? rows[0].model : null;

    const min = DEFAULT_MIN;
    const max = DEFAULT_MAX;
    const supervisor = DEFAULT_SUPERVISOR;

    console.log('Inserting tension record:', { numero: stencilNumero, model, operador, min, max, supervisor });

    // Insert with parameterized query; fecha is DATETIME -> use NOW()
    const sql = 'INSERT INTO tension(fecha, numero, model, da, db, dc, dd, de, min, max, operador, supervisor) VALUES(NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const params = [stencilNumero, model, vals[0], vals[1], vals[2], vals[3], vals[4], min, max, operador, supervisor];
    await db.query(sql, params);

    // Return the newly inserted record (latest for this numero)
    const [[recent]] = await db.query('SELECT * FROM tension WHERE numero = ? ORDER BY fecha DESC LIMIT 1', [stencilNumero]);
    console.log('Tension record created successfully:', recent);
    res.status(201).json({ record: recent });
  } catch (err) {
    console.error('tensions POST error', err);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /apStencili/tensions/latest - Get latest tension per id (or specific id if ?id= provided)
router.get('/latest', async (req, res) => {
  const db = req.dbStencil;
  const qnum = req.query.numero || req.query.id;

  try {
    if (qnum) {
      // Return latest for specific numero
      const [rows] = await db.query('SELECT * FROM tension WHERE numero = ? ORDER BY fecha DESC LIMIT 1', [qnum]);
      return res.json({ record: rows[0] || null });
    }

    // Return latest per each numero, with highest id if same fecha, ordered by numero DESC
    // Optimized query using GROUP BY for better performance
    const sql = `SELECT t.* FROM tension t
                 INNER JOIN (
                   SELECT numero, MAX(id) as max_id
                   FROM tension
                   WHERE (numero, fecha, id) IN (
                     SELECT numero, fecha, MAX(id)
                     FROM tension
                     GROUP BY numero, fecha
                   )
                   GROUP BY numero
                 ) m ON t.numero = m.numero AND t.id = m.max_id
                 ORDER BY t.numero DESC`;
    const [rows] = await db.query(sql);
    return res.json({ records: rows });
  } catch (err) {
    console.error('tensions latest error', err);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/tensions/:numero/all - Get all history for specific numero
router.get('/:numero/all', async (req, res) => {
  const db = req.dbStencil;
  const numero = req.params.numero;

  try {
    const [rows] = await db.query('SELECT * FROM tension WHERE numero = ? ORDER BY fecha DESC', [numero]);
    res.json({ records: rows });
  } catch (err) {
    console.error('tensions history error', err);
    res.status(500).json({ error: 'db error' });
  }
});

// GET /api/tensions/export - Export all tensions as CSV
router.get('/export', async (req, res) => {
  const db = req.dbStencil;
  
  try {
    const [rows] = await db.query('SELECT * FROM tension ORDER BY fecha, numero');
    
    // Convert to CSV with all fields (include auto-increment id and numero)
    const cols = ['id','fecha','numero','model','da','db','dc','dd','de','min','max','operador','supervisor'];
    const lines = [cols.join(',')];
    
    for (const r of rows) {
      const line = cols.map(c => {
        const v = r[c] === null || r[c] === undefined ? '' : String(r[c]);
        // Escape commas and quotes
        if (v.includes(',') || v.includes('\n') || v.includes('\r') || v.includes('"')) {
          return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
      }).join(',');
      lines.push(line);
    }
    
    const csv = lines.join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tensions_export.csv"');
    res.send(csv);
  } catch (err) {
    console.error('tensions export error', err);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
