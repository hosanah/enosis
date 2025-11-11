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

CREATE TABLE IF NOT EXISTS restaurantes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  capacidade INTEGER,
  descricao TEXT
);

CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
  nome_evento VARCHAR(255) NOT NULL,
  data_evento DATE NOT NULL,
  horario_evento TIME NOT NULL,
  id_restaurante INTEGER NOT NULL REFERENCES restaurantes(id) ON DELETE CASCADE,
  UNIQUE (data_evento, horario_evento, id_restaurante)
);

CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  idreservacm INTEGER NOT NULL,
  numeroreservacm VARCHAR(255) NOT NULL,
  coduh VARCHAR(255) NOT NULL,
  nome_hospede VARCHAR(255) NOT NULL,
  contato VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  data_checkin DATE NOT NULL,
  data_checkout DATE NOT NULL,
  qtd_hospedes INTEGER NOT NULL
);

ALTER TABLE IF EXISTS eventos_reservas
  DROP CONSTRAINT IF EXISTS eventos_reservas_pkey;

CREATE TABLE IF NOT EXISTS eventos_reservas (
  evento_id INTEGER NOT NULL REFERENCES eventos(id) ON DELETE CASCADE,
  reserva_id INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  informacoes TEXT,
  quantidade INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'Ativa',
  voucher VARCHAR(10) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS diretrizes (
  id SERIAL PRIMARY KEY,
  descricao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS regras_validacao (
  id SERIAL PRIMARY KEY,
  chave VARCHAR(50) UNIQUE NOT NULL,
  descricao TEXT NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

INSERT INTO regras_validacao (chave, descricao, ativo) VALUES
  ('QUANTIDADE_RESERVA', 'Quantidade não pode exceder número de hóspedes da reserva', TRUE),
  ('CAPACIDADE_EVENTO', 'Total de participantes não pode ultrapassar capacidade do restaurante', TRUE),
  ('MARCACAO_DUPLICADA_EVENTO_RESERVA', 'Não permitir mais de uma marcação ativa para o mesmo evento e reserva', TRUE),
  ('HOSPEDE_DUPLICADO_EVENTO', 'Um hóspede não pode ter mais de uma marcação ativa para o mesmo evento', TRUE),
  ('RESERVA_DUPLICADA_DIA', 'A reserva não pode ser vinculada a outro evento na mesma data', TRUE),
  ('LIMITE_MARCACOES_ESTADIA', 'Limite de marcações conforme duração da estadia', TRUE)
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
