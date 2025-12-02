/**
 * Middleware de autenticação JWT
 * Verifica e valida tokens JWT nas requisições
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getAuthDb } = require('../config/authdb');
const { ApiError } = require('./errorHandler');

/**
 * Middleware para verificar token JWT
 */
function authenticateToken(req, res, next) {
  // Obter token do header Authorization
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // Verificar se token existe
  if (!token) {
    return next(new ApiError(401, 'Token de acesso requerido', 'TOKEN_REQUIRED'));
  }

  // Verificar e decodificar token
  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      console.log('❌ Erro na verificação do token:', err.message);

      if (err.name === 'TokenExpiredError') {
        return next(new ApiError(401, 'Token expirado', 'TOKEN_EXPIRED'));
      }

      if (err.name === 'JsonWebTokenError') {
        return next(new ApiError(401, 'Token inválido', 'TOKEN_INVALID'));
      }

      return next(new ApiError(401, 'Falha na autenticação', 'AUTH_FAILED'));
    }

    try {
      // Verificar se usuário ainda existe no banco
      const db = getAuthDb();
      
      db.get(
        'SELECT id, username, email, full_name, is_active FROM users WHERE id = ? AND is_active = 1',
        [decoded.userId],
        (err, user) => {
          if (err) {
            console.error('❌ Erro ao buscar usuário:', err.message);
            return next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', err.message));
          }

          if (!user) {
            return next(new ApiError(401, 'Usuário não encontrado ou inativo', 'USER_NOT_FOUND'));
          }

          // Adicionar informações do usuário à requisição
          req.user = {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name
          };

          // Adicionar token decodificado
          req.token = decoded;

          console.log(`✅ Usuário autenticado: ${user.username} (ID: ${user.id})`);
          next();
        }
      );
    } catch (error) {
      console.error('❌ Erro no middleware de autenticação:', error);
      return next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', error.message));
    }
  });
}

/**
 * Middleware opcional - não falha se token não existir
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      req.user = null;
      return next();
    }

    try {
      const db = getAuthDb();
      
      db.get(
        'SELECT id, username, email, full_name FROM users WHERE id = ? AND is_active = 1',
        [decoded.userId],
        (err, user) => {
          if (err || !user) {
            req.user = null;
          } else {
            req.user = {
              id: user.id,
              username: user.username,
              email: user.email,
              fullName: user.full_name
            };
          }
          next();
        }
      );
    } catch (error) {
      req.user = null;
      next();
    }
  });
}

/**
 * Gerar token JWT
 */
function generateToken(userId, username) {
  const payload = {
    userId: userId,
    username: username,
    iat: Math.floor(Date.now() / 1000), // Issued at
  };

  const options = {
    expiresIn: '24h', // Token expira em 24 horas
    issuer: 'fullstack-app',
    audience: 'fullstack-users'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, options);
}

/**
 * Gerar refresh token e salvar sessão no banco
 */
async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  const db = getAuthDb();
  await db.query(
    'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
    [userId, tokenHash, expiresAt]
  );

  return token;
}

/**
 * Verificar refresh token
 */
async function verifyRefreshToken(token) {
  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const db = getAuthDb();
    const result = await db.query(
      `SELECT s.user_id, u.username
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token_hash = ?
         AND s.expires_at > CURRENT_TIMESTAMP
         AND s.revoked_at IS NULL`,
      [tokenHash]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      userId: result.rows[0].user_id,
      username: result.rows[0].username
    };
  } catch (error) {
    console.error('❌ Erro ao verificar refresh token:', error.message);
    return null;
  }
}

/**
 * Verificar se token é válido (sem middleware)
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Decodificar token sem verificar (para debug)
 */
function decodeToken(token) {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

module.exports = {
  authenticateToken,
  optionalAuth,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyToken,
  decodeToken
};

