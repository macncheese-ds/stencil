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
  // Migrations disabled - using existing database tables
  console.log('Using existing database tables (migrations disabled)');
}


module.exports = { connectStencil, connectCred, migrateIfNeeded };
