# Plano: módulo WhatsApp para reservas

1. Criar serviço WhatsApp no backend: schema SQLite para templates e preferência, defaults, renderização de placeholders, normalização de telefone e cliente HTTP Evolution; testes `node:test` cobrindo defaults, substituições, DDI e respostas de falha.
2. Expor rotas autenticadas `/whatsapp/config`, `/whatsapp/preview`, `/whatsapp/send` e criar/status/apagar a instância única Evolution; registrar no servidor e inicializar seeds.
3. Adicionar telefone às consultas PMS e respostas após gravação de marcação em `natal.routes.js` e `anonovo.routes.js`, usando tentativas de colunas e resposta uniforme.
4. Criar página standalone WhatsApp com templates Natal/Ano-Novo, preferência de ação e preview da mensagem/voucher; ligar rota e sidebar.
5. Atualizar fluxos das duas telas de reservas para mostrar modal pós-marcação, recuperar dados, corrigir DDI, confirmar envio e imprimir de acordo com configuração; preservar reimpressão existente.
6. Rodada 1: suíte unitária do serviço backend. Rodada 2: build de produção Angular e checagem estática Node. Rodada 3: testes de integração de rotas usando servidor Express e Evolution simulada, sem rede externa nem credenciais reais.

## Foco de revisão
- Células Oracle com coluna de telefone inexistente: cair para a próxima alternativa sem interromper reserva.
- Número sem DDI, com máscara, vazio ou inválido.
- Evolution ausente, timeout e status HTTP de erro não desfazem a marcação.
- Preferência imprimir somente não dispara mensagem; enviar exige telefone e confirmação.
- Templates mantêm texto literal seguro e placeholders desconhecidos não quebram a prévia.
