# Backend do Agenda Rosa (Node + Express + PostgreSQL)

Este backend foi refatorado para usar arquitetura em camadas e banco PostgreSQL (Neon.tech).

## Estrutura de Pastas

```text
backend/
  server.js             # Ponto de entrada do servidor (Porta 3001)
  src/
    config/
      database.js       # Configuração central do banco (Master) e tradutor de sintaxe
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
5. `dao` executa SQL no PostgreSQL.

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
4. O sistema guarda cache de geocoding em `geocoding_cache` no PostgreSQL para reduzir chamadas.

## Banco de Dados PostgreSQL (Neon.tech)

O projeto foi migrado de SQLite para PostgreSQL para garantir persistência, robustez e escalabilidade em ambientes serverless como o Render.

1. A variável `DATABASE_URL` deve conter a connection string do Neon.tech.
2. O arquivo `backend/src/config/database.js` possui um tradutor automático que reescreve queries SQLite (`?`) para o padrão posicional do Postgres (`$1, $2, ...`), além de lidar com diferenças de schemas (como `SERIAL PRIMARY KEY` e tabelas de cache), permitindo que o restante da aplicação funcione perfeitamente sem alterações estruturais complexas.
3. Há um mecanismo de reset automático de sequências (`resetarSequences()`) para evitar colisões de chaves primárias após inserção de seeds estáticos.

## Frontend

A tela `frontend/js/homeCliente.js` foi refatorada para focar em interatividade.
As regras de filtro e validacao de negocio ficam no backend.
