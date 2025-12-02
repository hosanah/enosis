const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { seedDiretrizes } = require('./diretrizes.seed');

let db = null;

function getAuthDbPath() {
  return process.env.AUTH_DB_PATH || path.join(__dirname, '..', 'database', 'auth.db');
}

function openDb() {
  const dbPath = getAuthDbPath();
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  db = new sqlite3.Database(dbPath);
}

function initSchema() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        'CREATE TABLE IF NOT EXISTS users (' +
          'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
          'username TEXT UNIQUE NOT NULL,' +
          'email TEXT UNIQUE NOT NULL,' +
          'password TEXT NOT NULL,' +
          'full_name TEXT,' +
          'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,' +
          'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,' +
          'is_active INTEGER DEFAULT 1' +
        ')'
      );

      db.run(
        'CREATE TABLE IF NOT EXISTS sessions (' +
          'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
          'user_id INTEGER NOT NULL,' +
          'token_hash TEXT NOT NULL,' +
          'expires_at TIMESTAMP NOT NULL,' +
          'revoked_at TIMESTAMP,' +
          'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,' +
          'FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE' +
        ')',
        (err) => {
          if (err) return reject(err);
          // Tabela de diretrizes (configurações controladas pelo admin)
          db.run(
            'CREATE TABLE IF NOT EXISTS diretrizes (' +
              'code TEXT PRIMARY KEY,' +
              'nome TEXT NOT NULL,' +
              'descricao TEXT,' +
              'valor TEXT,' +
              'habilitado INTEGER DEFAULT 1,' +
              'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP' +
            ')',
            (e2) => {
              if (e2) return reject(e2);
              resolve();
            }
          );
        }
      );
    });
  });
}

async function createDefaultUser() {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE username = ?', ['admin'], async (err, row) => {
      if (err) return reject(err);
      if (row) return resolve();
      try {
        const hashed = await bcrypt.hash('admin123', 12);
        db.run(
          'INSERT INTO users (username, email, password, full_name) VALUES (?, ?, ?, ?)',
          ['admin', 'admin@example.com', hashed, 'Administrador'],
          (e) => (e ? reject(e) : resolve())
        );
      } catch (e) {
        reject(e);
      }
    });
  });
}

async function initAuthDatabase() {
  if (db) return;
  openDb();
  await initSchema();
  await createDefaultUser();
  await seedDiretrizes(db);
  console.log('SQLite de autenticacao inicializado');
}

function getAuthDb() {
  if (!db) throw new Error('SQLite de autenticacao nao inicializado');
  return {
    query(sql, params = []) {
      return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
          if (err) return reject(err);
          resolve({ rows, rowCount: rows?.length || 0 });
        });
      });
    },
    get(sql, params = [], cb) {
      db.get(sql, params, cb);
    },
    all(sql, params = [], cb) {
      db.all(sql, params, cb);
    },
    run(sql, params = [], cb) {
      db.run(sql, params, cb);
    }
  };
}

module.exports = {
  initAuthDatabase,
  getAuthDb
};

