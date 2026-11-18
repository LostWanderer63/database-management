require('dotenv').config();

const path = require('path');
const express = require('express');

const sequelize = require('./util/database');
const { ensureDatabase } = require('./util/database');
const registry = require('./services/tableRegistry');
const tableRoutes = require('./routes/tableRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/tables', tableRoutes);

// Express 5 forwards errors thrown in async handlers here.
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ message: err.message });
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeDatabaseError') {
    const message = err.errors ? err.errors.map((e) => `${e.path} ${e.message}`).join(', ') : err.message;
    return res.status(400).json({ message });
  }
  console.error(err);
  res.status(500).json({ message: 'Something went wrong' });
});

async function start() {
  await ensureDatabase();
  await sequelize.authenticate();
  await registry.loadExistingTables();
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
}

if (require.main === module) {
  start().catch((err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });
}

module.exports = app;
