const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { connectStencil, connectCred, migrateIfNeeded } = require('./db');
const authRoutes = require('./routes/auth');
const linesRoutes = require('./routes/lines');
const logsRoutes = require('./routes/logs');
const historyRoutes = require('./routes/history');

const PORT = process.env.PORT || 8564;

const app = express();
app.use(cors());
app.use(bodyParser.json());

(async () => {
  try {
    const poolStencil = await connectStencil();
    const poolCred = await connectCred();

    if (process.argv.includes('--migrate')) {
      await migrateIfNeeded();
      console.log('Migrations run; exiting');
      process.exit(0);
    }

    await migrateIfNeeded();

    // attach both pools to req
    app.use((req, res, next) => {
      req.dbStencil = poolStencil;
      req.dbCred = poolCred;
      next();
    });

    // Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/lines', linesRoutes);

  app.use('/api/logs', logsRoutes);
  app.use('/api/history', historyRoutes);

    app.get('/health', (req, res) => res.json({ ok: true }));

    app.listen(PORT, () => {
      console.log(`Stencil backend listening on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
})();
