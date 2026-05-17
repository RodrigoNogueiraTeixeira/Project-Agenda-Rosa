# Backend do Agenda Rosa (Node + Express + SQLite)

Este backend foi refatorado para usar arquitetura em camadas e banco SQLite.

## Estrutura de Pastas

```text
backend/
  server.js             # Ponto de entrada do servidor (Porta 3001)
  data/
    agendarosa.db       # Banco SQLite único e compartilhado
  src/
    config/
      database.js       # Configuração central do banco (Master)
    routes/
      index.js          # Roteador Mestre (Unifica Cliente e Empresa)
    cliente/            # Módulo do App Cliente
      controllers/
      dao/
      routes/
    empresa/            # Módulo do Painel Empresa
      controllers/
      dao/
      routes/
    utils/              # Utilitários globais (Senhas, etc.)
```

## Como executar localmente

```bash
cd backend
npm install
npm start
```

Servidor padrao: `http://localhost:3001`

## Fluxo das camadas

1. `server.js` conecta tudo e registra `app.use("/api", ...)`.
2. `routes` define endpoints e aponta para controllers.
3. `controllers` trata HTTP (req/res) e validacao basica.
4. `repositories` aplica regra de negocio.
5. `dao` executa SQL no SQLite.

## Rotas principais

- `GET /api/health`
- `GET /api/estabelecimentos?cidade=&bairro=&tipo=&q=&page=&limit=`
- `GET /api/estabelecimentos/:id`
- `POST /api/agendamentos`
- `GET /api/clientes/:id/agendamentos`
- `PATCH /api/agendamentos/:id/cancelar`
- `GET /api/clientes/:id/perfil`
- `PUT /api/clientes/:id/perfil`
- `POST /api/pagamentos/mercadopago/preference`
- `POST /api/pagamentos/mercadopago/webhook`
- `GET /api/pagamentos/:id`

## Mercado Pago (Checkout Pro)

1. Copie `backend/.env.example` para `backend/.env`.
2. Preencha `MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`, `APP_BASE_URL` e `MP_WEBHOOK_URL`.
3. Reinicie o backend.
4. Gere preferencia por `POST /api/pagamentos/mercadopago/preference`.
5. Redirecione o front para `initPoint` retornado pela API.
6. Configure webhook para `/api/pagamentos/mercadopago/webhook`.

## OpenRouteService (distancia e raio)

1. Crie conta em `openrouteservice.org` e gere a API key no dashboard.
2. Preencha `ORS_API_KEY` no `backend/.env`.
3. Endpoints:
   - `POST /api/distancia/calcular`
   - `POST /api/distancia/filtrar-estabelecimentos`
4. O sistema guarda cache de geocoding em `geocoding_cache` para reduzir chamadas.

## Sobre deploy com SQLite

SQLite funciona bem para projeto pequeno e MVP.

No deploy, voce precisa garantir:

1. A plataforma permite gravar arquivo em disco (para atualizar `agendarosa.db`).
2. O arquivo `backend/data/agendarosa.db` fica em volume persistente.
3. Se o host nao tiver disco persistente (alguns serverless), troque para Postgres/MySQL.

## Frontend

A tela `frontend/js/homeCliente.js` foi refatorada para focar em interatividade.
As regras de filtro e validacao de negocio ficam no backend.
