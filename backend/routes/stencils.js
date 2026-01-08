const express = require('express');
const router = express.Router();

// GET /api/stencils/:identifier - Get stencil info by id OR by numero (returns latest for numero)
router.get('/:identifier', async (req, res) => {
  const db = req.dbStencil;
  const identifier = req.params.identifier;

  try {
    // Try by primary id first if identifier looks like an integer
    if (/^\d+$/.test(identifier)) {
      const [byId] = await db.query('SELECT id, numero, model FROM stencil WHERE id = ?', [identifier]);
      if (byId && byId.length) {
        return res.json(byId[0]);
      }
    }

    // Otherwise treat identifier as `numero` and return the latest update for that numero
    const [rows] = await db.query('SELECT id, numero, model FROM stencil WHERE numero = ? ORDER BY id DESC LIMIT 1', [identifier]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'stencil not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('stencils GET error', err);
    res.status(500).json({ error: 'db error' });
  }
});

module.exports = router;
