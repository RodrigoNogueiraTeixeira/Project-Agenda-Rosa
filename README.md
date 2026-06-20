# 🌸 Agenda Rosa
O **Agenda Rosa** é uma plataforma web moderna de agendamentos online desenvolvida especificamente para conectar clientes a estabelecimentos de beleza e estética. O sistema permite que os clientes encontrem estabelecimentos, escolham serviços e profissionais, e realizem agendamentos de forma intuitiva, enquanto oferece às empresas ferramentas robustas para gerenciar sua agenda, equipe, serviços e perfil.

---

## 🌐 Demonstração Online (Web)

Caso prefira visualizar o sistema funcionando em produção diretamente na nuvem (sem precisar rodar na sua máquina local), o projeto está implantado no Render e pode ser acessado pelo link abaixo:

👉 **[Acesse o Agenda Rosa na Web](https://project-agenda-rosa.onrender.com/cliente/html/homeDoCliente.html)**

> [!WARNING]
> **Aviso sobre lentidão inicial:** O servidor está hospedado no plano gratuito do Render. Por conta disso, a máquina virtual é desligada automaticamente após **15 minutos de inatividade**. Se você for o primeiro a acessar após esse período, a aplicação **poderá levar até 50 segundos para carregar** a primeira vez enquanto a máquina é reativada. Depois disso, a velocidade voltará ao normal.

> [!NOTE]
> **Facilidade para Testes:** De forma proposital, o sistema não exige verificação ou confirmação de e-mail real no momento do cadastro. Caso queira explorar os fluxos completos do sistema sem vincular sua conta pessoal (Gmail, Outlook, etc.), sinta-se à vontade para criar uma conta utilizando um domínio fictício (ex: `nomeficticio@example.com`).

---

##  Tecnologias Utilizadas

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
* **Mercado Pago**: Integração ativa via Webhook e SDK para geração de PIX e Checkout de Cartão de Crédito. Ele gerencia o fluxo completo de "Preference" (pedido de pagamento) e notifica nosso banco de dados em tempo real quando o pagamento é aprovado, alterando o status do agendamento de forma automática.
* **Open Route Service**: API ativamente conectada ao sistema para geolocalização e geração de coordenadas, permitindo renderizar mapas visuais e rotas precisas para que o cliente saiba exatamente onde o estabelecimento está localizado.

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

##  Arquitetura do Backend (Camadas)

O backend segue o padrão arquitetural em camadas para garantir a separação de conceitos, facilitar a manutenção e blindar a lógica contra falhas:

1. **Camada de Roteamento (`routes`)**: Recebe a requisição HTTP (ex: `POST /api/auth/login`) e a despacha para a função controladora certa.
2. **Camada de Controle (`controllers`)**: Extrai os dados do corpo (`req.body`), da URL (`req.params`) ou da busca (`req.query`), valida os formatos básicos e chama os repositórios correspondentes. Também decide os códigos de status HTTP da resposta (ex: `200`, `400`, `401`, `503`).
3. **Camada de Serviço/Domínio (`repositories`)**: Contém toda a lógica e as regras de negócio da aplicação (ex: validação de conflitos de horários na agenda, regras de cálculo, validações de integridade).
4. **Camada de Acesso a Dados (`DAO`)**: Isola os comandos SQL de inserção, seleção, deleção e atualização. Conversa fisicamente com as tabelas do banco usando queries parametrizadas para evitar ataques de *SQL Injection*.

---

## 🔒 Segurança e Criptografia

O projeto utiliza práticas modernas e robustas para garantir a segurança da API e a integridade dos dados:

* **Autenticação via JWT (JSON Web Tokens)**: A API é protegida por tokens criptograficamente assinados, garantindo que o cliente se mantenha autenticado de forma stateless sem necessidade de cookies vulneráveis.
* **Controle de Autorização (Middlewares)**: Nenhuma rota sensível é pública. O sistema inspeciona rigorosamente se a requisição possui um JWT válido e se o perfil (Cliente, Empresa, Admin) corresponde à rota que está sendo acessada.
* **Prevenção a IDOR (Insecure Direct Object Reference)**: O backend não confia em IDs fornecidos na URL ou no corpo da requisição para acesso a dados do usuário logado. A identificação (ID) é extraída de forma inviolável diretamente do *payload* interno do JWT, impossibilitando que um usuário forje ações em nome de outro.
* **Prevenção a SQL Injection**: Toda a camada DAO (`Data Access Object`) interage com o banco de dados via consultas estritamente parametrizadas, impossibilitando a injeção de código malicioso.
* **Criptografia de Senhas (PBKDF2)**: Senhas de clientes e empresas são transformadas em hashes seguros (SHA-512) com 100.000 iterações e a adição de um `salt` randômico único por registro. A comparação das senhas no login usa `timingSafeEqual` para prevenir ataques baseados em tempo.
* **Migração Dinâmica de Senhas ("On-the-fly")**: Senhas em texto puro legadas do antigo SQLite são auto-migradas para Hash PBKDF2 no exato momento em que o usuário faz login pela primeira vez com sucesso na nova plataforma.

---

##  Como Executar Localmente

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
4. Abra o arquivo `.env` e configure as chaves locais básicas de banco de dados e porta (veja a seção de [Variáveis de Ambiente](#-variáveis-de-ambiente-env) abaixo).

5. Inicie o servidor backend:
   ```bash
   npm start
   ```
   O servidor backend estará rodando na porta `3001` (`http://localhost:3001`).

### 3. Acessando o Frontend
* Como as páginas do frontend são formadas por arquivos estáticos (`.html`, `.css`, `.js`), você pode abrir os arquivos `.html` diretamente com o seu navegador favorito, ou utilizar uma extensão como o **Live Server** (do VS Code) a partir da pasta raiz do projeto.
* Se estiver rodando o backend localmente, o frontend se comunicará automaticamente com a API em `http://localhost:3001/api`.

---

##  Variáveis de Ambiente (`.env`)

Configure as variáveis básicas abaixo no seu arquivo `backend/.env` para executar o projeto localmente:

| Nome da Variável | Descrição | Exemplo / Placeholder |
| :--- | :--- | :--- |
| `DATABASE_URL` | String de conexão com o banco de dados PostgreSQL (ex: Neon.tech). | `postgresql://usuario:senha@host/dbname?sslmode=require` |
| `PORT` | Porta onde o servidor Node.js será executado (padrão `3001`). | `3001` |
| `APP_BASE_URL` | URL base pública da aplicação (usada para links de e-mail). | `http://localhost:3001` |
| `BREVO_API_KEY` | Chave de API do Brevo para envio de e-mails de recuperação de senha. | `xkeysib-suachave` |
| `BREVO_SENDER_EMAIL`| E-mail remetente autenticado no Brevo. | `suporte@seudominio.com` |

---

##  Equipe e Divisão de Responsabilidades

O desenvolvimento do Agenda Rosa foi realizado de forma colaborativa e dividida entre os membros do grupo, garantindo especialização e integração entre as entregas:

* **Rodrigo Nogueira**: Responsável pela implementação (tanto do front-end visual quanto da API lógica no back-end) da funcionalidade estrita de **Login**. Além disso, gerenciou toda a jornada do perfil de **Cliente** (pesquisa de estabelecimentos, visualização de profissionais e agendamentos) e foi o engenheiro responsável por integrar e implementar as APIs do **Mercado Pago** (para o processamento financeiro dos pagamentos) e do **Open Route Service** (para renderizar os mapas visuais e rotas das localizações das lojas).
* **Daniel Oliveira**: Responsável pelo desenvolvimento de toda a jornada da **Empresa** (agenda empresarial, cadastro de serviços, cadastro de profissionais, horários de funcionamento, bloqueios) e pelos fluxos de **Cadastro** inicial de novos usuários e empresas.
* **Maycon Marques**: Responsável pelo desenvolvimento completo da área do **Administrador** (painel de controle, aprovação e reprovação de cadastros de estabelecimentos parceiros, relatórios estatísticos básicos e gerenciamento das categorias de serviços) e também pela implementação do fluxo de recuperação de credenciais (**Esqueci minha Senha / Redefinição**), integrando e utilizando a API do **Brevo** para o disparo seguro dos e-mails de recuperação.

### **Metodologia de Trabalho e Gestão do Projeto**
Para coordenar as entregas e garantir a qualidade do sistema integrado:
* **Sprints Semanais:** A equipe realizava reuniões de alinhamento técnico e de progresso todo final de semana para integrar os códigos e resolver incompatibilidades.
* **Gestão de Tarefas (ClickUp):** Utilizamos a plataforma **ClickUp** para listar as atividades pendentes, estimar prazos de entrega e cronometrar o tempo dedicado a cada tarefa. Isso permitiu o controle visual das etapas de desenvolvimento e evitou atrasos.

---

##  Uso de Inteligência Artificial como Ferramenta

A equipe utilizou ferramentas de Inteligência Artificial de forma estratégica ao longo do ciclo de desenvolvimento, adotando-as como **aceleradores de produtividade e assistentes técnicos**, sem delegar as decisões fundamentais do projeto:
* **Code Review & Refatoração:** A IA auxiliou na revisão de trechos de código para sugerir melhorias de desempenho, boas práticas e legibilidade.
* **Documentação & Comentários:** Utilizada para acelerar a escrita de documentações internas detalhadas e comentários didáticos no código (como os contidos no backend e frontend).
* **Facilitação do Aprendizado:** Utilizada para tirar dúvidas rápidas de sintaxe e conceitos do PostgreSQL e Express.
* **Diretriz de Desenvolvimento:** Todas as escolhas arquiteturais, modelagem de banco de dados e lógica final foram planejadas, programadas e validadas pela equipe de engenharia do projeto.
