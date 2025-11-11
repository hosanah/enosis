-- Seed data for PostgreSQL database (trimmed after feature removals)
INSERT INTO users (username, email, password, full_name)
VALUES ('admin', 'admin@example.com', '$2a$12$.NifCEunTbm0Q7mpJmCS3OsKigZvlwWYNSIRn6lGfasceRI965Y6u', 'Administrador')
ON CONFLICT (username) DO NOTHING;

-- Removed seed data for: restaurantes, eventos, reservas (CM) e eventos_reservas

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

