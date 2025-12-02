const oracledb = require('oracledb');

let pool = null;

function getOracleConfig() {
  const host = process.env.ORACLE_HOST;
  const port = process.env.ORACLE_PORT || '1521';
  const service = process.env.ORACLE_SERVICE_NAME || process.env.ORACLE_SERVICE || process.env.ORACLE_SVC || process.env.ORACLE_SID;
  let connectString = process.env.ORACLE_CONNECTION_STRING;
  if (!connectString && host && (service || process.env.ORACLE_SID)) {
    connectString = `${host}:${port}/${service || process.env.ORACLE_SID}`;
  }
  return {
    user: process.env.ORACLE_USER || 'appuser',
    password: process.env.ORACLE_PASSWORD || 'apppassword',
    connectString: connectString || 'localhost:1521/FREEPDB1',
  };
}

function toOracleBinds(params) {
  if (!params) return {};
  const binds = {};
  params.forEach((val, i) => {
    const key = `b${i + 1}`;
    let v = val;
    if (typeof v === 'boolean') v = v ? 1 : 0;
    binds[key] = v;
  });
  return binds;
}

function convertSql(sql, params) {
  // Replace common Postgres/SQLite patterns with Oracle equivalents
  let outSql = sql;

  // Normalize boolean TRUE/FALSE to 1/0 comparisons
  outSql = outSql.replace(/=\s*TRUE/gi, '= 1').replace(/=\s*FALSE/gi, '= 0');

  // Handle LIMIT ? OFFSET ? -> OFFSET :bX ROWS FETCH NEXT :bY ROWS ONLY
  // Note: source order is LIMIT, OFFSET; Oracle expects OFFSET, FETCH NEXT
  const limitOffsetPattern = /\sLIMIT\s*\?\s*OFFSET\s*\?/i;
  let reorderedParams = params ? [...params] : [];
  if (limitOffsetPattern.test(outSql)) {
    // swap param order
    if (reorderedParams.length >= 2) {
      const [limit, offset] = reorderedParams;
      reorderedParams[0] = offset;
      reorderedParams[1] = limit;
    }
    outSql = outSql.replace(limitOffsetPattern, ' OFFSET :b1 ROWS FETCH NEXT :b2 ROWS ONLY');
  }

  // Replace positional ? with :bN
  let idx = 1;
  outSql = outSql.replace(/\?/g, () => `:b${idx++}`);

  return { sql: outSql, params: reorderedParams };
}

async function initOracle() {
  if (pool) return;
  const cfg = getOracleConfig();
  try {
    oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
    if (process.env.ORACLE_CLIENT_LIB_DIR) {
      try {
        oracledb.initOracleClient({ libDir: process.env.ORACLE_CLIENT_LIB_DIR });
      } catch (e) {
        // Ignorar se não disponível; thin mode funcionará
      }
    }
    pool = await oracledb.createPool(cfg);
    // Test connection
    const conn = await pool.getConnection();
    await conn.execute('SELECT 1 FROM dual');
    await conn.close();
    console.log('✓ Oracle conectado');
  } catch (err) {
    console.error('✗ Erro ao conectar Oracle:', err.message);
    // Não interromper a aplicação; manter pool nulo e permitir modo degradado
    pool = null;
  }
}

function getOracle() {
  if (!pool) throw new Error('Oracle não inicializado');

  return {
    async query(sql, params = []) {
      const { sql: q, params: p } = convertSql(sql, params);
      const binds = toOracleBinds(p);
      const conn = await pool.getConnection();
      try {
        const res = await conn.execute(q, binds, { autoCommit: true });
        return { rows: res.rows || [], rowCount: res.rowsAffected || 0 };
      } finally {
        await conn.close();
      }
    },
    get(sql, params = [], callback) {
      this.all(sql, params, (err, rows) => {
        if (err) return callback(err);
        callback(null, rows[0]);
      });
    },
    asyncAll(sql, params = []) {
      return this.query(sql, params).then(r => r.rows);
    },
    all(sql, params = [], callback) {
      (async () => {
        try {
          const r = await this.query(sql, params);
          callback(null, r.rows);
        } catch (e) {
          callback(e);
        }
      })();
    },
    run(sql, params = [], callback) {
      (async () => {
        const conn = await pool.getConnection();
        try {
          let outBindName = null;
          let q = sql;
          let bindsArray = Array.isArray(params) ? [...params] : [];
          // Detect pattern RETURNING id
          if (/RETURNING\s+id\s*$/i.test(q) || /RETURNING\s+id\s*,?/i.test(q)) {
            // Replace trailing "RETURNING id" with Oracle syntax
            outBindName = 'out_id';
            // remove possible trailing RETURNING id
            q = q.replace(/RETURNING\s+id/i, 'RETURNING id INTO :out_id');
          }
          // Convert placeholders
          let { sql: conv, params: p } = convertSql(q, bindsArray);
          // Build binds
          const binds = toOracleBinds(p);
          if (outBindName) {
            binds[outBindName] = { dir: oracledb.BIND_OUT, type: oracledb.NUMBER };
          }
          const res = await conn.execute(conv, binds, { autoCommit: true });
          const ctx = { lastID: null, changes: res.rowsAffected || 0 };
          if (outBindName && res.outBinds && res.outBinds[outBindName] !== undefined) {
            const val = Array.isArray(res.outBinds[outBindName]) ? res.outBinds[outBindName][0] : res.outBinds[outBindName];
            ctx.lastID = val;
          }
          if (callback) callback.call(ctx, null);
        } catch (e) {
          if (callback) callback(e);
        } finally {
          await conn.close();
        }
      })();
    }
  };
}

module.exports = {
  initOracle,
  getOracle,
  isOracleReady: () => !!pool
};
