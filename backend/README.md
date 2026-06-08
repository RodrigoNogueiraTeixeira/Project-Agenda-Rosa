# Agenda Rosa - Backend

Backend do sistema Agenda Rosa, desenvolvido com JavaScript, Node.js,
Express e PostgreSQL hospedado no Neon.tech.

O sistema conecta clientes a empresas de beleza e estetica. Os clientes
podem encontrar estabelecimentos e realizar agendamentos. As empresas podem
gerenciar perfil, servicos, profissionais, horarios e agenda.

## Tecnologias

- JavaScript
- Node.js
- Express
- PostgreSQL
- Neon.tech
- HTML, CSS e JavaScript no frontend

## Como executar localmente

1. Entre na pasta do backend:

```bash
cd backend
```

2. Instale as dependencias:

```bash
npm install
```

3. Crie o arquivo `.env` usando `.env.example` como modelo.

4. Para iniciar o sistema, preencha:

```env
DATABASE_URL=connection_string_do_neon
PORT=3001
```

5. Inicie o servidor:

```bash
npm start
```

O sistema estara disponivel em `http://localhost:3001`.

## Recuperacao de senha

O envio do link de recuperacao utiliza o Brevo. Para ativar essa funcao,
preencha:

```env
APP_BASE_URL=http://localhost:3001
BREVO_API_KEY=sua_chave
BREVO_SENDER_EMAIL=email_validado_no_brevo
```

Sem essas configuracoes, login e cadastro continuam funcionando, mas o
e-mail de recuperacao nao sera enviado.

## Banco de dados

O banco utilizado e PostgreSQL no Neon.tech. A conexao e configurada pela
variavel `DATABASE_URL`.

Na inicializacao, o backend cria as tabelas necessarias caso elas ainda nao
existam. Os arquivos DAO possuem os comandos SQL usados para consultar e
salvar os dados.

## Organizacao do backend

```text
backend/
  server.js
  src/
    administrador/
    auth/
    cliente/
    empresa/
    config/
    routes/
    utils/
```

Cada modulo pode possuir:

- `routes`: define as URLs da API.
- `controllers`: recebe a requisicao e envia a resposta.
- `repositories`: aplica validacoes e regras do sistema.
- `dao`: executa os comandos no banco de dados.

## Funcionalidades principais

### Cliente

- Cadastro e login.
- Edicao do perfil.
- Busca de estabelecimentos.
- Consulta de servicos e profissionais.
- Criacao e cancelamento de agendamentos.

### Empresa

- Cadastro e login.
- Edicao do perfil do estabelecimento.
- Cadastro de servicos e profissionais.
- Configuracao dos horarios de funcionamento.
- Bloqueio de horarios.
- Controle da agenda e status dos atendimentos.

### Administrador

- Login configurado pelo servidor.
- Consulta de dados do painel.
- Aprovacao ou reprovacao de empresas.
- Cadastro de categorias.
- Consulta de relatorios.

## Rotas da API

Todas as rotas comecam com `/api`.

Exemplos:

- `POST /api/auth/login`
- `POST /api/clientes/cadastro`
- `GET /api/estabelecimentos`
- `POST /api/agendamentos`
- `POST /api/empresa/cadastro`
- `GET /api/empresa/servicos`
- `GET /api/empresa/profissionais`
- `GET /api/empresa/agendamentos`
- `GET /api/empresas/pendentes`

## Servicos opcionais

O Mercado Pago e usado nos pagamentos e o OpenRouteService pode ser usado
para calcular distancia. As chaves desses servicos ficam no arquivo `.env`.
Se eles nao forem utilizados durante a demonstracao, as demais partes do
sistema continuam disponiveis.
