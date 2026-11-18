const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'database_management',
};

if (!/^[A-Za-z0-9_]+$/.test(config.database)) {
  throw new Error('DB_NAME may only contain letters, numbers and underscores');
}

const sequelize = new Sequelize(config.database, config.user, config.password, {
  host: config.host,
  port: config.port,
  dialect: 'mysql',
  logging: false,
});

// Creates the database itself if it does not exist yet, so no manual SQL step is needed.
async function ensureDatabase() {
  const { database, ...connection } = config;
  const conn = await mysql.createConnection(connection);
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
  await conn.end();
}

module.exports = sequelize;
module.exports.ensureDatabase = ensureDatabase;
