const { ApiError } = require('./errorHandler');

function requireApiKey(req, res, next) {
  const providedKey = req.headers['x-api-key'];
  const expectedKey = process.env.API_KEY;

  if (!expectedKey) {
    return next(new ApiError(500, 'API key não configurada', 'API_KEY_NOT_CONFIGURED'));
  }

  if (!providedKey || providedKey !== expectedKey) {
    return next(new ApiError(401, 'Chave de API inválida', 'INVALID_API_KEY'));
  }

  next();
}

module.exports = { requireApiKey };
