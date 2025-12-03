/**
 * Rotas do dashboard (protegidas por autenticacao)
 * Retorna dados apenas para usuarios autenticados
 */

const express = require('express');
const { getAuthDb } = require('../config/authdb');
const { getDatabase } = require('../config/database');
const { ApiError } = require('../middleware/errorHandler');

const router = express.Router();

// Consolidacao de Natal e Ano Novo
router.get('/', async (req, res, next) => {
  try {
    const db = getDatabase();

    // Reservas em check-in e quantidade de hospedes
    const checkinSql = `
      SELECT RV.IDRESERVASFRONT,
             RV.NUMRESERVA,
             RV.CODUH,
             RV.DATACHEGPREVISTA AS DATACHECKIN,
             RV.DATAPARTPREVISTA AS DATACHECKOUT,
             H.NOME || ' ' || H.SOBRENOME AS NOMECOMPLETO,
             (SELECT COUNT(MH2.IDHOSPEDE) FROM CM.MOVIMENTOHOSPEDES MH2 WHERE MH2.IDRESERVASFRONT = RV.IDRESERVASFRONT) TOTALHOSPEDES
        FROM CM.RESERVASFRONT RV,
             CM.MOVIMENTOHOSPEDES MH,
             CM.HOSPEDE H
       WHERE RV.IDRESERVASFRONT = MH.IDRESERVASFRONT
         AND MH.IDHOSPEDE = H.IDHOSPEDE
         AND MH.PRINCIPAL = 'S'
         AND RV.STATUSRESERVA = 2
       ORDER BY RV.DATACHEGPREVISTA DESC
    `;

    // Mesas (Natal)
    const mesasNatalSql = `
      SELECT 
        EM.IDMARCACAOMESA,
        EM.NUMMESA,
        COUNT(*) AS DISPTOTAL,
        SUM(
          CASE 
            WHEN EI.STATUS = 1 
             AND EI.IDRESERVASFRONT IS NOT NULL 
            THEN 1 
            ELSE 0 
          END
        ) AS OCUPADAS
      FROM CM.ENOMARCACAOITEM EI
      JOIN CM.ENOMARCACAOMESA EM 
        ON EM.IDMARCACAOMESA = EI.IDMARCACAOMESA
      GROUP BY 
        EM.IDMARCACAOMESA,
        EM.NUMMESA
    `;

    // Mesas (Ano Novo)
    const mesasAnoNovoSql = `
      SELECT 
        EM.IDMARCACAOMESA,
        EM.NUMMESA,
        COUNT(*) AS DISPTOTAL,
        SUM(
          CASE 
            WHEN EI.STATUS = 1 
             AND EI.IDRESERVASFRONT IS NOT NULL 
            THEN 1 
            ELSE 0 
          END
        ) AS OCUPADAS
      FROM CM.ENOMARCACAOITEMANO EI
      JOIN CM.ENOMARCACAOMESAANO EM 
        ON EM.IDMARCACAOMESA = EI.IDMARCACAOMESA
      GROUP BY 
        EM.IDMARCACAOMESA,
        EM.NUMMESA
    `;

    const assentosNatalSql = `
      SELECT IDRESERVASFRONT, COUNT(*) AS QUANTIDADE
        FROM CM.ENOMARCACAOITEM
       WHERE STATUS = 1
         AND IDRESERVASFRONT IS NOT NULL
       GROUP BY IDRESERVASFRONT
    `;

    const assentosAnoNovoSql = `
      SELECT IDRESERVASFRONT, COUNT(*) AS QUANTIDADE
        FROM CM.ENOMARCACAOITEMANO
       WHERE STATUS = 1
         AND IDRESERVASFRONT IS NOT NULL
       GROUP BY IDRESERVASFRONT
    `;

    const [checkinRes, mesasNatalRes, mesasAnoNovoRes, assentosNatalRes, assentosAnoNovoRes] = await Promise.all([
      db.query(checkinSql, []),
      db.query(mesasNatalSql, []),
      db.query(mesasAnoNovoSql, []),
      db.query(assentosNatalSql, []),
      db.query(assentosAnoNovoSql, [])
    ]);

    const checkinRows = checkinRes.rows || [];
    const totalApartamentos = checkinRows.length;
    const totalHospedes = checkinRows.reduce((acc, r) => acc + (Number(r.TOTALHOSPEDES ?? r.totalhospedes ?? 0) || 0), 0);

    const toAssentoMap = (rows) => {
      const map = new Map();
      (rows || []).forEach((r) => {
        const id = r.IDRESERVASFRONT ?? r.idreservasfront;
        if (!id) return;
        const qtd = Number(r.QUANTIDADE ?? r.quantidade ?? 0) || 0;
        map.set(String(id), qtd);
      });
      return map;
    };

    const hospedesSemReserva = (assentosMap) => {
      return checkinRows.reduce((acc, r) => {
        const id = r.IDRESERVASFRONT ?? r.idreservasfront ?? r.ID ?? r.id;
        const total = Number(r.TOTALHOSPEDES ?? r.totalhospedes ?? 0) || 0;
        const alocados = assentosMap.get(String(id)) || 0;
        return acc + Math.max(total - alocados, 0);
      }, 0);
    };

    const calcMesaStats = (rows) => {
      const list = rows || [];
      const total = list.reduce((acc, r) => acc + (Number(r.DISPTOTAL ?? r.disptotal ?? 0) || 0), 0);
      const ocupadas = list.reduce((acc, r) => acc + (Number(r.OCUPADAS ?? r.ocupadas ?? 0) || 0), 0);
      const vagas = Math.max(total - ocupadas, 0);
      return { total, ocupadas, vagas };
    };

    const natalMesas = calcMesaStats(mesasNatalRes.rows);
    const anoNovoMesas = calcMesaStats(mesasAnoNovoRes.rows);
    const natalAssentosMap = toAssentoMap(assentosNatalRes.rows);
    const anoNovoAssentosMap = toAssentoMap(assentosAnoNovoRes.rows);

    const data = {
      natal: {
        apartamentosCheckin: totalApartamentos,
        hospedesNaCasa: totalHospedes,
        hospedesSemReserva: hospedesSemReserva(natalAssentosMap),
        mesas: natalMesas
      },
      anoNovo: {
        apartamentosCheckin: totalApartamentos,
        hospedesNaCasa: totalHospedes,
        hospedesSemReserva: hospedesSemReserva(anoNovoAssentosMap),
        mesas: anoNovoMesas
      }
    };

    res.json({
      message: 'Dados do dashboard obtidos com sucesso',
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao obter dados do dashboard:', error);
    next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', error.message));
  }
});

/**
 * GET /dashboard/stats
 * Obter estatisticas detalhadas
 */
router.get('/stats', (req, res, next) => {
  try {
    const db = getAuthDb();

    db.get('SELECT COUNT(*) as totalUsers FROM users WHERE is_active = 1', (err, userCount) => {
      if (err) {
        console.error('Erro ao buscar estatisticas:', err.message);
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
        message: 'Estatisticas obtidas com sucesso',
        stats: stats,
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    console.error('Erro ao obter estatisticas:', error);
    next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', error.message));
  }
});

/**
 * GET /dashboard/profile
 * Obter perfil detalhado do usuario
 */
router.get('/profile', (req, res, next) => {
  try {
    const db = getAuthDb();

    db.get(
      'SELECT id, username, email, full_name, created_at, updated_at FROM users WHERE id = ?',
      [req.user.id],
      (err, user) => {
        if (err) {
          console.error('Erro ao buscar perfil:', err.message);
          return next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', err.message));
        }

        if (!user) {
          return next(new ApiError(404, 'Usuario nao encontrado', 'USER_NOT_FOUND'));
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
    console.error('Erro ao obter perfil:', error);
    next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', error.message));
  }
});

/**
 * PUT /dashboard/profile
 * Atualizar perfil do usuario
 */
router.put('/profile', (req, res, next) => {
  try {
    const { fullName, email } = req.body;

    if (!fullName && !email) {
      return next(new ApiError(400, 'Pelo menos um campo deve ser fornecido para atualizacao', 'NO_FIELDS_TO_UPDATE'));
    }

    const db = getAuthDb();
    let updateFields = [];
    let updateValues = [];

    if (fullName) {
      updateFields.push('full_name = ?');
      updateValues.push(fullName);
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new ApiError(400, 'Formato de email invalido', 'INVALID_EMAIL'));
      }
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(req.user.id);

    const updateQuery = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

    db.run(updateQuery, updateValues, function(err) {
      if (err) {
        console.error('Erro ao atualizar perfil:', err.message);

        if (err.message.includes('UNIQUE constraint failed')) {
          return next(new ApiError(409, 'Email ja esta em uso', 'EMAIL_EXISTS'));
        }

        return next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', err.message));
      }

      console.log(`Perfil atualizado: ${req.user.username} (ID: ${req.user.id})`);

      res.json({
        message: 'Perfil atualizado com sucesso',
        timestamp: new Date().toISOString()
      });
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    next(new ApiError(500, 'Erro interno do servidor', 'INTERNAL_ERROR', error.message));
  }
});

module.exports = router;
