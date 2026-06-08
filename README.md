# 🌸 Agenda Rosa

O **Agenda Rosa** é uma plataforma web moderna de agendamentos online desenvolvida especificamente para conectar clientes a estabelecimentos de beleza e estética. O sistema permite que os clientes encontrem estabelecimentos, escolham serviços e profissionais, e realizem agendamentos de forma intuitiva, enquanto oferece às empresas ferramentas robustas para gerenciar sua agenda, equipe, serviços e perfil.

---

## 🚀 Tecnologias Utilizadas

O ecossistema do Agenda Rosa foi construído com foco em simplicidade, velocidade e segurança, utilizando as seguintes tecnologias:

### **Frontend (Apresentação)**
* **HTML5**: Estruturação semântica e acessível das páginas.
* **Vanilla CSS**: Estilização flexível e customizada, com design responsivo (adaptável a celulares e computadores) e transições suaves.
* **JavaScript (Vanilla)**: Lógica do lado do cliente para interações em tempo real, manipulação do DOM e consumo das APIs do backend.
* **Google Maps Iframe**: Integração visual de mapas para demonstrar a localização física de cada estabelecimento.

### **Backend (Servidor & APIs)**
* **JavaScript / Node.js**: Ambiente de execução assíncrono de alto desempenho.
* **Express.js**: Framework minimalista para criação de servidores HTTP e rotas RESTful organizadas.

### **Banco de Dados & Nuvem**
* **PostgreSQL (Hospedado no Neon.tech)**: Banco de dados relacional de produção com alta confiabilidade.
* **Adaptador Unificado (`database.js`)**: Mecanismo inteligente centralizado que traduz consultas escritas em sintaxe SQLite (ex: parâmetros com `?`, `AUTOINCREMENT`) para a sintaxe do PostgreSQL (`$1`, `SERIAL`, etc.) em tempo de execução. Isso permite compatibilidade local e em produção de forma transparente.
* **Render.com**: Plataforma de nuvem responsável pela hospedagem automática (deploy contínuo) do sistema.

### **Integrações & Serviços Externos**
* **Brevo (antigo Sendinblue)**: Serviço SMTP utilizado para envio seguro de e-mails de recuperação de senha.
* **Mercado Pago (Opcional)**: Integração opcional para simulação e processamento de pagamentos.
* **Open Route Service (Opcional)**: API utilizada para o cálculo de distâncias.

---

## 📂 Estrutura de Pastas do Projeto

O repositório está dividido de forma clara em duas áreas principais:

```text
agendarosa/
├── backend/                       # Servidor API Node.js/Express
│   ├── src/
│   │   ├── administrador/         # Controladores, Repositórios e Rotas do Admin
│   │   ├── auth/                  # Lógica de Login, Cadastro e Recuperação de Senha
│   │   │   ├── controllers/
│   │   │   ├── dao/               # Queries SQL específicas de autenticação
│   │   │   └── repositories/      # Regras de autenticação e criptografia
│   │   ├── cliente/               # Endpoints e regras de negócio do Cliente
│   │   ├── empresa/               # Endpoints e regras de negócio da Empresa/Profissional
│   │   ├── config/                # Arquivos de conexão com Banco de Dados
│   │   └── utils/                 # Utilitários (criptografia, formatação, envio de e-mail)
│   ├── server.js                  # Arquivo principal de inicialização do servidor
│   ├── .env.example               # Exemplo de configuração de variáveis de ambiente
│   └── package.json               # Dependências do backend
│
├── frontend/                      # Arquivos estáticos do site (HTML, CSS, JS, Imagens)
│   ├── administrador/             # Painel, relatórios e telas do Admin
│   ├── cliente/                   # Home, busca, agendamento e perfil do Cliente
│   ├── empresa/                   # Agenda, serviços, profissionais e perfil da Empresa
│   ├── login/                     # Cadastro, Login, Esqueci Senha e Redefinição
│   └── assets/                    # Recursos compartilhados (ícones, logos, imagens)
│
└── README.md                      # Documentação geral do projeto (este arquivo)
```

---

## 🧠 Arquitetura do Backend (Camadas)

O backend segue o padrão arquitetural em camadas para garantir a separação de conceitos, facilitar a manutenção e blindar a lógica contra falhas:

1. **Camada de Roteamento (`routes`)**: Recebe a requisição HTTP (ex: `POST /api/auth/login`) e a despacha para a função controladora certa.
2. **Camada de Controle (`controllers`)**: Extrai os dados do corpo (`req.body`), da URL (`req.params`) ou da busca (`req.query`), valida os formatos básicos e chama os repositórios correspondentes. Também decide os códigos de status HTTP da resposta (ex: `200`, `400`, `401`, `503`).
3. **Camada de Serviço/Domínio (`repositories`)**: Contém toda a lógica e as regras de negócio da aplicação (ex: validação de conflitos de horários na agenda, regras de cálculo, validações de integridade).
4. **Camada de Acesso a Dados (`DAO`)**: Isola os comandos SQL de inserção, seleção, deleção e atualização. Conversa fisicamente com as tabelas do banco usando queries parametrizadas para evitar ataques de *SQL Injection*.

---

## 🔒 Segurança e Criptografia

O projeto utiliza práticas avançadas de proteção de dados:

* **Criptografia PBKDF2**: Senhas de clientes e empresas são transformadas em hashes criptográficos seguros com adição de `salt` único por registro, utilizando a biblioteca interna `crypto` do Node.js.
* **Migração Dinâmica de Senhas ("On-the-fly")**:
  * Para suportar cadastros antigos do banco de dados (que salvavam senhas em texto puro), o sistema faz uma migração automática no momento do login.
  * Ao fazer login com sucesso usando a senha antiga, o backend gera imediatamente o hash seguro da senha e o grava no banco. Os logins subsequentes passam a usar a criptografia avançada automaticamente, sem interromper a experiência do usuário.
* **Segurança do Administrador**: As credenciais de administrador são lidas diretamente das variáveis de ambiente (`ADMIN_EMAIL` e `ADMIN_PASSWORD_HASH`) do servidor, mantendo as chaves de acesso fora do código-fonte público.

---

## 💻 Como Executar Localmente

### 1. Requisitos Prévios
* Ter o [Node.js](https://nodejs.org/) instalado na versão LTS recente.
* Um cliente Git instalado no seu computador.

### 2. Configurando o Backend
1. Abra o seu terminal na pasta do projeto e navegue para a pasta `backend`:
   ```bash
   cd backend
   ```
2. Instale as dependências necessárias:
   ```bash
   npm install
   ```
3. Crie um arquivo chamado `.env` na raiz da pasta `backend` copiando as definições do `.env.example`:
   ```bash
   copy .env.example .env
   ```
4. Abra o arquivo `.env` e configure as chaves necessárias (veja a seção de [Variáveis de Ambiente](#-variáveis-de-ambiente-env) abaixo).

5. Inicie o servidor backend:
   ```bash
   npm start
   ```
   O servidor backend estará rodando na porta `3001` (`http://localhost:3001`).

### 3. Acessando o Frontend
* Como as páginas do frontend são formadas por arquivos estáticos (`.html`, `.css`, `.js`), você pode abrir os arquivos `.html` diretamente com o seu navegador favorito, ou utilizar uma extensão como o **Live Server** (do VS Code) a partir da pasta raiz do projeto.
* Se estiver rodando o backend localmente, o frontend se comunicará automaticamente com a API em `http://localhost:3001/api`.

---

## ⚙️ Variáveis de Ambiente (`.env`)

Configure as variáveis abaixo no seu arquivo `backend/.env` para o funcionamento de todas as partes do sistema:

| Nome da Variável | Descrição | Exemplo |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexão com o banco de dados PostgreSQL (ex: Neon.tech). | `postgresql://user:pass@host/dbname?sslmode=require` |
| `PORT` | Porta onde o servidor Node.js será executado (padrão `3001`). | `3001` |
| `ADMIN_EMAIL` | E-mail oficial usado para login do Administrador. | `admin@agendarosa.com` |
| `ADMIN_PASSWORD_HASH` | Hash seguro (PBKDF2) correspondente à senha do administrador. | *Ver instruções abaixo* |
| `APP_BASE_URL` | URL base pública da aplicação (usada para links de e-mail). | `http://localhost:3001` |
| `BREVO_API_KEY` | Chave de API do Brevo para envio de e-mails de recuperação de senha. | `xkeysib-...` |
| `BREVO_SENDER_EMAIL`| E-mail remetente autenticado no Brevo. | `suporte@agendarosa.com` |

### **Gerando o Hash de Senha para o Administrador**
Para gerar o código de hash da sua senha personalizada do administrador, execute o seguinte comando no terminal (dentro da pasta `backend`):

```bash
node -e "console.log(require('./src/utils/password').hashPassword('sua-senha-aqui'))"
```

Copie o hash retornado (que terá o formato `salt:hash`) e defina como o valor de `ADMIN_PASSWORD_HASH` no seu arquivo `.env` ou no painel do Render.

---

## 🌐 Configuração e Deploy na Nuvem (Render)

Quando o projeto é implantado no **Render.com**, os seguintes passos garantem o funcionamento correto:

1. **Deploy Contínuo**: O Render se conecta à branch `main` do seu repositório GitHub e realiza um novo deploy toda vez que uma alteração é empurrada (`git push`).
2. **Configuração de Variáveis de Ambiente**:
   * No painel do Render, vá em **Environment** do seu serviço Web.
   * Cadastre as variáveis de ambiente necessárias (principalmente `DATABASE_URL`, `ADMIN_EMAIL` e `ADMIN_PASSWORD_HASH`).
3. **Inicialização**: O Render executa automaticamente `npm install` e inicia o servidor via `npm start`.
