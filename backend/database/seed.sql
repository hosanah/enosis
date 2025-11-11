-- Seed data for PostgreSQL database
INSERT INTO users (username, email, password, full_name)
VALUES ('admin', 'admin@example.com', '$2a$12$.NifCEunTbm0Q7mpJmCS3OsKigZvlwWYNSIRn6lGfasceRI965Y6u', 'Administrador')
ON CONFLICT (username) DO NOTHING;

INSERT INTO restaurantes (id, nome, capacidade, descricao) VALUES
  (1, 'Restaurante Central', 100, 'Restaurante principal do hotel'),
  (2, 'Bistrô da Praça', 50, 'Charmoso bistrô na praça')
ON CONFLICT (id) DO NOTHING;

INSERT INTO eventos (id, nome_evento, data_evento, horario_evento, id_restaurante) VALUES
  (1, 'Noite Italiana', '2024-12-15', '19:00', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO reservas (id, idreservacm, numeroreservacm, coduh, nome_hospede, data_checkin, data_checkout, qtd_hospedes) VALUES
  (1, 101, 'NR-001', 'UH01', 'João Silva', '2024-12-20', '2024-12-25', 2),
  (2, 102, 'NR-002', 'UH02', 'Maria Souza', '2024-12-22', '2024-12-24', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO eventos_reservas (evento_id, reserva_id, voucher) VALUES
  (1, 1, 'VX00001'),
  (1, 2, 'VX00002')
ON CONFLICT DO NOTHING;

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
