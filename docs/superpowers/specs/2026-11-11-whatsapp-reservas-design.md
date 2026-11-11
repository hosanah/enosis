# Módulo WhatsApp para reservas — design

## Intenção e objetivos
Disponibilizar a todos os usuários autenticados uma tela para editar templates de WhatsApp de Natal e Ano-Novo, visualizar mensagem e voucher, e configurar o que acontece ao concluir uma marcação. Após salvar, mostrar dados do hóspede oriundos do CMNet, permitir corrigir o número internacional e pré-visualizar antes de imprimir/enviar.

## Limites e escolhas
- Aproveitar Angular, Express, SQLite e Oracle existentes; sem novas dependências.
- Login continua obrigatório. Não há permissão administrativa nova: qualquer usuário autenticado acessa módulo e configurações.
- Templates e preferência global ficam no SQLite de autenticação. O backend envia apenas após confirmação explícita na tela.
- A preferência global de ação é `print`, `send` ou `both`. A tela de prévia exige confirmação explícita antes de imprimir ou enviar.
- Envio contém texto e dados do voucher renderizados como texto. Envio de PDF/imagem não foi solicitado como requisito obrigatório e não existe artefato de voucher gerado no servidor.
- Evolution configurada por `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`. A aplicação cria e gerencia um único registro de instância, chamado `enosis-whatsapp`, no SQLite.
- Operadores autenticados podem criar a instância, consultar conexão/QR code e apagar a instância. O SQLite singleton evita segunda criação concorrente e só libera recriação após exclusão.
- Telefone obtido por tentativas nas colunas já reconhecidas pelas consultas de relatório (`H.TELEFONE`, `H.TELEFONE1`, `H.CELULAR`), compatível com variações de schema.

## Abordagens consideradas
1. Chamar Evolution direto do navegador: descartada, exporia a chave da API.
2. Novo serviço backend e configurações locais SQLite (escolhida): mantém segredo no servidor, usa infraestrutura existente e centraliza templates/normalização.
3. Armazenar templates/configuração no Oracle: desnecessário para conteúdo operacional do app e falha quando Oracle fica indisponível.

## Fluxo
Página `/whatsapp` com editor de templates, preview ao vivo de mensagem e voucher de exemplo, e opções de ação. Ao salvar marcação Natal/Ano-Novo, retornar dados da reserva/marcação, abrir modal com hóspede, telefone editável com DDI 55, template e voucher; a pessoa confirma a ação configurada.

## Critérios de aceite
- Item WhatsApp no sidebar e rota protegida acessível a qualquer usuário logado.
- Templates padrão editáveis para as duas festas e previews de mensagem/voucher.
- Preferência impressão/envio/ambos persistida e lida ao concluir marcação.
- Resultado de marcação contém telefone PMS, mesa, reserva, quarto, hóspede, quantidade e observação.
- Número normalizado para dígitos com DDI, permitindo correção manual.
- API de envio autenticada, valida configuração, usa Evolution e trata falhas sem perder a marcação.
- `.env` recebe somente nomes e placeholders vazios de credenciais Evolution, preservando conteúdo preexistente.
