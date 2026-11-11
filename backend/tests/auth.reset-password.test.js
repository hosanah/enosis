const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const authDb = require('../config/authdb');

test('POST /auth/reset-password atualiza a senha no SQLite de autenticação', async (t) => {
  const db = new sqlite3.Database(':memory:');
  const originalGetAuthDb = authDb.getAuthDb;
  const originalApiKey = process.env.API_KEY;
  authDb.getAuthDb = () => db;
  process.env.API_KEY = 'reset-test-key';

  await new Promise((resolve, reject) => {
    db.run(
      'CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, password TEXT, updated_at TIMESTAMP)',
      (error) => error ? reject(error) : resolve()
    );
  });
  const oldPasswordHash = await bcrypt.hash('old-password', 4);
  await new Promise((resolve, reject) => {
    db.run('INSERT INTO users (id, email, password) VALUES (1, ?, ?)', ['ana@example.com', oldPasswordHash], (error) => error ? reject(error) : resolve());
  });

  const app = express();
  app.use(express.json());
  app.use('/auth', require('../routes/auth'));
  app.use(require('../middleware/errorHandler').errorHandler);
  const server = app.listen(0);
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await new Promise((resolve) => db.close(resolve));
    authDb.getAuthDb = originalGetAuthDb;
    if (originalApiKey === undefined) delete process.env.API_KEY;
    else process.env.API_KEY = originalApiKey;
  });

  const response = await fetch(`http://127.0.0.1:${server.address().port}/auth/reset-password`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': 'reset-test-key' },
    body: JSON.stringify({ email: 'ana@example.com', password: 'new-password' })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { message: 'Senha atualizada com sucesso' });
  const updatedUser = await new Promise((resolve, reject) => {
    db.get('SELECT password FROM users WHERE email = ?', ['ana@example.com'], (error, row) => error ? reject(error) : resolve(row));
  });
  assert.equal(await bcrypt.compare('new-password', updatedUser.password), true);
});
