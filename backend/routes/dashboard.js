/**
 * Rotas do dashboard (protegidas por autenticação)
 * Retorna dados apenas para usuários autenticados
 */

const express = require('express');
const { getAuthDb } = require('../config/authdb');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

/**
 * GET /dashboard
 * Obter dados do dashboard para usuário autenticado
 */
router.get('/', (req, res, next) => {
  try {
    // Dados mockados do dashboard
    const dashboardData = {
      user: req.user,
      stats: {
        totalUsers: 1,
        activeUsers: 1,
        totalSessions: Math.floor(Math.random() * 100) + 50,
        serverUptime: process.uptime()
      },
      recentActivity: [
        {
          id: 1,
          action: 'Login realizado',
          timestamp: new Date().toISOString(),
          user: req.user.username
        },
        {
          id: 2,
          action: 'Dashboard acessado',
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          user: req.user.username
        },
        {
          id: 3,
          action: 'Sistema inicializado',
          timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          user: 'Sistema'
        }
      ],
      notifications: [
        {
          id: 1,
          type: 'info',
          title: 'Bem-vindo!',
          message: `Olá ${req.user.fullName || req.user.username}, bem-vindo ao dashboard!`,
          timestamp: new Date().toISOString(),
          read: false
        },
        {
          id: 2,
          type: 'success',
          title: 'Sistema Online',
          message: 'Todos os serviços estão funcionando normalmente.',
          timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
          read: false
        }
      ],
      charts: {
        userActivity: {
          labels: ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'],
          data: [12, 19, 3, 5, 2, 3, 9]
        },
        systemPerformance: {
          cpu: Math.floor(Math.random() * 30) + 20,
          memory: Math.floor(Math.random() * 40) + 30,
          disk: Math.floor(Math.random() * 20) + 10
        }
      }
    };

    console.log(`✅ Dashboard acessado por: ${req.user.username} (ID: ${req.user.id})`);

    res.json({
      message: 'Dados do dashboard obtidos com sucesso',
      data: dashboardData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro ao obter dados do dashboard:', error);
    next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', error.message));
  }
});

/**
 * GET /dashboard/stats
 * Obter estatísticas detalhadas
 */
router.get('/stats', (req, res, next) => {
  try {
    const db = getAuthDb();

    // Buscar estatísticas reais do banco
    db.get('SELECT COUNT(*) as totalUsers FROM users WHERE is_active = 1', (err, userCount) => {
      if (err) {
        console.error('❌ Erro ao buscar estatísticas:', err.message);
        return next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', err.message));
      }

      const stats = {
        users: {
          total: userCount.totalUsers,
          active: userCount.totalUsers,
          inactive: 0
        },
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          platform: process.platform
        },
        performance: {
          cpu: Math.floor(Math.random() * 30) + 20,
          memory: Math.floor(Math.random() * 40) + 30,
          disk: Math.floor(Math.random() * 20) + 10,
          network: Math.floor(Math.random() * 50) + 25
        }
      };

      res.json({
        message: 'Estatísticas obtidas com sucesso',
        stats: stats,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    console.error('❌ Erro ao obter estatísticas:', error);
    next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', error.message));
  }
});

/**
 * GET /dashboard/profile
 * Obter perfil detalhado do usuário
 */
router.get('/profile', (req, res, next) => {
  try {
    const db = getAuthDb();

    db.get(
      'SELECT id, username, email, full_name, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id],
      (err, user) => {
        if (err) {
          console.error('❌ Erro ao buscar perfil:', err.message);
          return next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', err.message));
        }

        if (!user) {
          return next(new ApiError(404, 'Usuário não encontrado', 'USER_NOT_FOUND'));
        }

        res.json({
          message: 'Perfil obtido com sucesso',
          profile: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.full_name,
            createdAt: user.created_at,
            updatedAt: user.updated_at
          },
          timestamp: new Date().toISOString()
        });
      }
    );

  } catch (error) {
    console.error('❌ Erro ao obter perfil:', error);
    next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', error.message));
  }
});

/**
 * PUT /dashboard/profile
 * Atualizar perfil do usuário
 */
router.put('/profile', (req, res, next) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName && !email) {
      return next(new ApiError(400, 'Pelo menos um campo deve ser fornecido para atualização', 'NO_FIELDS_TO_UPDATE'));
    }

    const db = getDatabase();
    let updateFields = [];
    let updateValues = [];

    if (fullName) {
      updateFields.push('full_name = ?');
      updateValues.push(fullName);
    }

    if (email) {
      // Validar formato do email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new ApiError(400, 'Formato de email inválido', 'INVALID_EMAIL'));
      }
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(req.user.id);

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(updateQuery, updateValues, function(err) {
      if (err) {
        console.error('❌ Erro ao atualizar perfil:', err.message);

        if (err.message.includes('UNIQUE constraint failed')) {
          return next(new ApiError(409, 'Email já está em uso', 'EMAIL_EXISTS'));
        }

        return next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', err.message));
      }

      console.log(`✅ Perfil atualizado: ${req.user.username} (ID: ${req.user.id})`);

      res.json({
        message: 'Perfil atualizado com sucesso',
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    console.error('❌ Erro ao atualizar perfil:', error);
    next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', error.message));
  }
});

module.exports = router;

