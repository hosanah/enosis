-- Schema for PostgreSQL database
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Removed modules: restaurantes, eventos, reservas, eventos_reservas, diretrizes

CREATE TABLE IF NOT EXISTS regras_validacao (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(80) UNIQUE NOT NULL,
  descricao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

INSERT INTO regras_validacao (chave, descricao, ativo) VALUES
  ('PERMITIR_QUANTIDADE_MAIOR_HOSPEDES', 'Permite cadastro de reserva com número informado maior que número de hóspedes no apartamento', TRUE),
  ('PERMITIR_APTO_MULTI_RESERVAS', 'Permitir o mesmo apartamento marcar duas ou mais reservas', TRUE)
ON CONFLICT (chave) DO NOTHING;

CREATE TABLE IF NOT EXISTS configuracoes (
  id SERIAL PRIMARY KEY,
  nome_sistema VARCHAR(255) NOT NULL,
  webhook_whatsapp VARCHAR(255),
  contato VARCHAR(255),
  cnpj VARCHAR(20),
  tempo_atualizacao_pms INTEGER,
  nome_agenda_virtual VARCHAR(255)
);

INSERT INTO configuracoes (
  id,
  nome_sistema,
  webhook_whatsapp,
  contato,
  cnpj,
  tempo_atualizacao_pms,
  nome_agenda_virtual
) VALUES (
  1,
  '',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL
) ON CONFLICT (id) DO NOTHING;
