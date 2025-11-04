const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Shared DB connection config
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';

// Database names
const DB_NAME = process.env.DB_NAME || 'stencil';
const CRED_DB_NAME = process.env.CRED_DB_NAME || 'credenciales';

let poolStencil;
let poolCred;

async function connectStencil() {
  if (poolStencil) return poolStencil;
  poolStencil = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  });
  return poolStencil;
}

async function connectCred() {
  if (poolCred) return poolCred;
  poolCred = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: CRED_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: false
  });
  return poolCred;
}

async function migrateIfNeeded() {
  // Migrate stencil database
  const stencilMigrationsFile = path.join(__dirname, 'migrations', 'stencil.sql');
  if (fs.existsSync(stencilMigrationsFile)) {
    const sql = fs.readFileSync(stencilMigrationsFile, 'utf8');
    const p = await connectStencil();
    try {
      await p.query(sql);
      console.log('Migrations applied (stencil.sql)');
    } catch (err) {
      console.error('Stencil migration error:', err);
      throw err;
    }
  }

  // Migrate credenciales database
  const credMigrationsFile = path.join(__dirname, 'migrations', 'credenciales.sql');
  if (fs.existsSync(credMigrationsFile)) {
    const sql = fs.readFileSync(credMigrationsFile, 'utf8');
    const p = await connectCred();
    try {
      await p.query(sql);
      console.log('Migrations applied (credenciales.sql)');
    } catch (err) {
      console.error('Credenciales migration error:', err);
      throw err;
    }
  }
}

module.exports = { connectStencil, connectCred, migrateIfNeeded };
