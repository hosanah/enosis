# Projeto Fullstack Angular + Node.js

Um projeto completo fullstack com frontend Angular (PrimeNG + CSS customizado) e backend Node.js (Express + JWT) na mesma pasta raiz, incluindo autenticação, dashboard protegido e integração completa entre frontend e backend.

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados
- **JWT (jsonwebtoken)** - Autenticação
- **bcryptjs** - Hash de senhas
- **CORS** - Cross-Origin Resource Sharing
- **Helmet** - Segurança HTTP
- **Rate Limiting** - Proteção contra ataques

### Frontend
- **Angular** - Framework frontend
- **PrimeNG** - Biblioteca de componentes UI
- **CSS customizado** - Estilização responsiva
- **RxJS** - Programação reativa
- **TypeScript** - Linguagem tipada

## 📁 Estrutura do Projeto

```
fullstack-project/
├── backend/                 # API Node.js
│   ├── config/             # Configurações (banco de dados)
│   ├── middleware/         # Middlewares (autenticação)
│   ├── routes/            # Rotas da API
│   ├── scripts/           # Scripts utilitários
│   ├── database/          # Banco de dados PostgreSQL
│   ├── uploads/           # Arquivos enviados
│   ├── .env               # Variáveis de ambiente
│   ├── server.js          # Servidor principal
│   └── package.json       # Dependências do backend
├── frontend/              # Aplicação Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/    # Componentes (login, dashboard)
│   │   │   ├── services/      # Serviços (auth, api)
│   │   │   ├── guards/        # Guards de rota
│   │   │   ├── interceptors/  # Interceptors HTTP
│   │   │   └── ...
│   │   ├── styles.scss        # Estilos globais
│   │   └── ...
│   └── package.json           # Dependências do frontend
├── package.json               # Scripts do projeto raiz
└── README.md                  # Esta documentação
```

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js (versão 18 ou superior)
- npm ou yarn

### 1. Clonar o repositório
```bash
git clone <url-do-repositorio>
cd fullstack-project
```

### 2. Instalar dependências
```bash
# Instalar dependências do projeto raiz
npm install

# Instalar dependências do backend
npm run install:backend

# Instalar dependências do frontend
npm run install:frontend

# Ou instalar todas de uma vez
npm run install:all
```

### 3. Configurar variáveis de ambiente
O arquivo `.env` no backend já está configurado com valores padrão para desenvolvimento:

```env
# Configurações do servidor
PORT=3000
NODE_ENV=development

# JWT Secret (em produção, use uma chave mais segura)
JWT_SECRET=sua_chave_secreta_jwt_muito_segura_aqui_2024

# Configurações do banco de dados
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tematico
DB_USER=postgres
DB_PASSWORD=postgres

# CORS
CORS_ORIGIN=http://localhost:4200
```

Para o frontend em produção, defina a variável de ambiente `NG_APP_API_URL` com a URL da API antes de executar o build.
Em desenvolvimento, o arquivo `src/environments/environment.ts` já utiliza `http://localhost:3000` por padrão.

## 🚀 Executando o Projeto

### Opção 1: Executar frontend e backend juntos (Recomendado)
```bash
npm start
# ou
npm run dev
```

### Opção 2: Executar separadamente

#### Backend (porta 3000)
```bash
npm run start:backend
```

#### Frontend (porta 4200)
```bash
npm run start:frontend
```

## 🔐 Credenciais de Teste

O sistema cria automaticamente um usuário administrador para testes:

- **Usuário:** `admin`
- **Email:** `admin@example.com`
- **Senha:** `admin123`

## 📱 Funcionalidades

### Backend (API REST)

#### Rotas de Autenticação
- `POST /auth/login` - Fazer login
- `POST /auth/logout` - Fazer logout
- `GET /auth/me` - Obter dados do usuário autenticado
- `POST /auth/validate` - Validar token JWT
- `POST /auth/register` - Registrar novo usuário

#### Rotas Protegidas (Dashboard)
- `GET /dashboard` - Obter dados do dashboard
- `GET /dashboard/stats` - Obter estatísticas detalhadas
- `GET /dashboard/profile` - Obter perfil do usuário
- `PUT /dashboard/profile` - Atualizar perfil do usuário

#### Outras Rotas
- `GET /health` - Health check da API

### Frontend (Angular)

#### Telas
- **Login** - Autenticação com formulário responsivo
- **Dashboard** - Painel principal com:
  - Estatísticas do sistema
  - Gráficos de performance
  - Notificações
  - Atividade recente
  - Perfil do usuário

#### Funcionalidades
- **Autenticação JWT** - Login/logout automático
- **Guards de Rota** - Proteção de rotas privadas
- **Interceptor HTTP** - Adição automática do token JWT
- **Design Responsivo** - Compatível com mobile, tablet e desktop
- **Notificações** - Feedback visual para ações do usuário

## 🔒 Segurança

### Backend
- **JWT Authentication** - Tokens seguros com expiração
- **Password Hashing** - Senhas criptografadas com bcrypt
- **Rate Limiting** - Proteção contra ataques de força bruta
- **CORS** - Configuração adequada para frontend
- **Helmet** - Headers de segurança HTTP
- **Input Validation** - Validação de dados de entrada

### Frontend
- **Route Guards** - Proteção de rotas privadas
- **HTTP Interceptor** - Gerenciamento automático de tokens
- **Logout Automático** - Em caso de token inválido/expirado
- **Sanitização** - Prevenção de XSS

## 🎨 Interface do Usuário

### Design System
- **Cores Primárias** - Azul (#2563eb)
- **Tipografia** - Inter (Google Fonts)
- **Componentes** - PrimeNG + CSS customizado
- **Layout** - Flexbox e Grid CSS
- **Responsividade** - Mobile-first approach

### Componentes PrimeNG Utilizados
- Button, Card, InputText, Password
- Table, ProgressBar, Tag, Avatar
- Toast, Message, Menu

## 📊 Banco de Dados

### Estrutura (PostgreSQL)

#### Tabela `users`
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active INTEGER DEFAULT 1
);
```

#### Tabela `sessions`
```sql
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Scripts Disponíveis

### Projeto Raiz
- `npm start` - Iniciar frontend e backend juntos
- `npm run dev` - Alias para start
- `npm run install:all` - Instalar todas as dependências
- `npm run install:backend` - Instalar dependências do backend
- `npm run install:frontend` - Instalar dependências do frontend
- `npm run start:backend` - Iniciar apenas o backend
- `npm run start:frontend` - Iniciar apenas o frontend
- `npm run build:frontend` - Build do frontend
- `npm run build` - Build completo

### Backend
- `npm start` - Iniciar servidor
- `npm run dev` - Iniciar com nodemon (desenvolvimento)
- `npm run init-db` - Inicializar banco de dados

### Frontend
- `npm start` - Iniciar servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run serve` - Servir build de produção

## 🌐 URLs de Acesso

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro de CORS
Verifique se a variável `CORS_ORIGIN` no `.env` está configurada corretamente.

#### 2. Erro de conexão com banco
Certifique-se de que o banco PostgreSQL esteja configurado e acessível; utilize os arquivos SQL em `backend/database` para criar as tabelas.

#### 3. Token inválido
Limpe o localStorage do navegador ou faça logout e login novamente.

#### 4. Porta em uso
Altere as portas nos arquivos de configuração se necessário:
- Backend: `.env` (PORT=3000)
- Frontend: `angular.json` (serve.options.port)

### Logs
- **Backend:** Console do terminal onde o servidor está rodando
- **Frontend:** Console do navegador (F12)

## 📈 Próximos Passos

### Melhorias Sugeridas
1. **Testes** - Implementar testes unitários e e2e
2. **Docker** - Containerização da aplicação
3. **CI/CD** - Pipeline de deploy automatizado
4. **Monitoramento** - Logs estruturados e métricas
5. **Cache** - Redis para sessões e cache
6. **Upload de Arquivos** - Funcionalidade de upload
7. **Notificações Push** - WebSockets ou Server-Sent Events
8. **Internacionalização** - Suporte a múltiplos idiomas

### Produção
1. **Variáveis de Ambiente** - Configurar para produção
2. **HTTPS** - Certificados SSL/TLS
3. **Banco de Dados** - Implementar migrations e otimizações
4. **Load Balancer** - Para alta disponibilidade
5. **CDN** - Para assets estáticos

## 👥 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Entre em contato via email

---

**Desenvolvido com ❤️ usando Angular + Node.js**

