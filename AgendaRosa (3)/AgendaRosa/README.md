# Agenda Rosa

Sistema web de beleza e estÃ©tica com foco em descoberta de serviÃ§os, agendamento online e gestÃ£o de agenda para empresas, salÃµes, clÃ­nicas e profissionais autÃ´nomos.

O projeto estÃ¡ sendo desenvolvido como Projeto Integrador da faculdade e, nesta etapa, foram implementadas as telas e funcionalidades relacionadas ao cadastro de empresa e ao ambiente da empresa.

## Objetivo do sistema

O Agenda Rosa funciona como um marketplace local de serviÃ§os de beleza e estÃ©tica.

Para clientes, o sistema deverÃ¡ permitir:

- encontrar empresas e profissionais prÃ³ximos;
- visualizar serviÃ§os disponÃ­veis;
- escolher profissional, data e horÃ¡rio;
- realizar agendamentos online.

Para empresas, o sistema jÃ¡ possui base para:

- cadastro da empresa;
- cadastro de serviÃ§os;
- cadastro de profissionais;
- configuraÃ§Ã£o de horÃ¡rio de funcionamento;
- bloqueio manual de horÃ¡rios;
- visualizaÃ§Ã£o e gestÃ£o da agenda;
- controle de status dos agendamentos.

## Tecnologias utilizadas

### Front-end

- HTML5: estrutura das telas.
- CSS3: estilizaÃ§Ã£o visual das pÃ¡ginas.
- JavaScript: interatividade das telas e comunicaÃ§Ã£o com a API.

### Back-end

- Node.js: ambiente de execuÃ§Ã£o JavaScript no servidor.
- Express: criaÃ§Ã£o das rotas da API.
- CORS: liberaÃ§Ã£o de acesso entre as pÃ¡ginas HTML e a API.
- SQLite: banco de dados local.
- sqlite3: biblioteca usada pelo Node.js para conectar ao SQLite.
- Crypto nativo do Node.js: usado para gerar hash de senha.

### Banco de dados

O banco utilizado Ã© SQLite. O arquivo local Ã© criado automaticamente em:

```text
backend/data/agenda-rosa.sqlite
```

Essa pasta estÃ¡ no `.gitignore`, entÃ£o o banco local nÃ£o serÃ¡ enviado para o GitHub.

## Como rodar o projeto

### 1. Instalar dependÃªncias

Na raiz do projeto, execute:

```bash
npm install
```

### 2. Iniciar o servidor

Para rodar em modo normal:

```bash
npm start
```

Para rodar em modo desenvolvimento, recarregando automaticamente quando arquivos do back-end mudarem:

```bash
npm run dev
```

O servidor sobe em:

```text
http://localhost:3000
```

### 3. Testar se a API estÃ¡ online

Acesse:

```text
http://localhost:3000/health
```

Resposta esperada:

```json
{
  "status": "ok"
}
```

## Arquitetura MVC por camadas

O projeto usa a arquitetura MVC no back-end.

### Routes

Arquivos de rota ficam em:

```text
backend/src/routes/
```

As rotas recebem a requisiÃ§Ã£o HTTP e encaminham para o controller correto.

Exemplo:

```text
backend/src/routes/servicoRoutes.js
```

Esse arquivo define endpoints como:

```text
GET /api/servicos
POST /api/servicos
PUT /api/servicos/:id
DELETE /api/servicos/:id
```

### Controllers

Arquivos de controller ficam em:

```text
backend/src/controllers/
```

Os controllers sÃ£o responsÃ¡veis por:

- receber os dados da requisiÃ§Ã£o;
- validar campos obrigatÃ³rios;
- aplicar regras de negÃ³cio;
- chamar o model;
- devolver a resposta para o front-end.

Exemplo:

```text
backend/src/controllers/agendamentoController.js
```

Esse controller valida regras como:

- horÃ¡rio dentro do funcionamento;
- serviÃ§o ativo;
- conflito de agendamento;
- conflito com bloqueio manual;
- prazo de cancelamento.

### Models

Arquivos de model ficam em:

```text
backend/src/models/
```

Os models sÃ£o responsÃ¡veis pela comunicaÃ§Ã£o direta com o SQLite.

Eles executam:

- `SELECT`;
- `INSERT`;
- `UPDATE`;
- `DELETE`.

Exemplo:

```text
backend/src/models/profissionalModel.js
```

### Database

Arquivos de banco ficam em:

```text
backend/src/database/
```

Principais arquivos:

```text
database.js
schema.sql
```

`database.js`:

- cria a pasta `backend/data`;
- abre conexÃ£o com SQLite;
- executa o schema;
- aplica pequenas migraÃ§Ãµes quando o banco jÃ¡ existe.

`schema.sql`:

- define as tabelas do sistema;
- define chaves estrangeiras;
- define Ã­ndices;
- define restriÃ§Ãµes bÃ¡sicas.

## Estrutura principal do projeto

```text
AgendaRosa/
  backend/
    server.js
    data/
      agenda-rosa.sqlite
    src/
      controllers/
      database/
      models/
      routes/
      utils/
  frontend/css/
  frontend/js/
  frontend/pages/
  package.json
  README.md
```

## Telas implementadas

### Cadastro de empresa

Arquivo:

```text
frontend/pages/cadastro-empresa.html
frontend/js/cadastro-empresa.js
```

FunÃ§Ã£o:

- coleta dados da empresa;
- valida campos obrigatÃ³rios;
- valida confirmaÃ§Ã£o de senha;
- envia os dados para a API;
- salva o ID da empresa no `localStorage` temporariamente.

ObservaÃ§Ã£o:

O `localStorage` estÃ¡ sendo usado como soluÃ§Ã£o provisÃ³ria enquanto a tela de login ainda nÃ£o estÃ¡ integrada.

### Home da empresa

Arquivo:

```text
frontend/pages/home-empresa.html
frontend/css/home-empresa.css
```

FunÃ§Ã£o:

- painel principal da empresa;
- acesso para agenda;
- acesso para serviÃ§os;
- acesso para profissionais;
- acesso para horÃ¡rio de funcionamento;
- acesso para bloqueio de horÃ¡rios;
- acesso para perfil do estabelecimento.

### ServiÃ§os da empresa

Arquivos:

```text
frontend/pages/servicos-empresa.html
frontend/css/servicos-empresa.css
frontend/js/servicos-empresa.js
```

FunÃ§Ãµes:

- cadastrar serviÃ§o;
- listar serviÃ§os;
- editar serviÃ§o;
- excluir serviÃ§o;
- salvar duraÃ§Ã£o fixa em minutos;
- salvar preÃ§o em centavos no banco.

Essa duraÃ§Ã£o fixa Ã© importante para a regra de agenda, porque o sistema calcula automaticamente o horÃ¡rio final do atendimento.

### Profissionais da empresa

Arquivos:

```text
frontend/pages/profissionais-empresa.html
frontend/css/profissionais-empresa.css
frontend/js/profissionais-empresa.js
```

FunÃ§Ãµes:

- cadastrar profissional;
- listar profissionais;
- editar profissional;
- excluir profissional;
- ativar ou inativar profissional.

Campos disponÃ­veis:

- nome;
- telefone;
- e-mail;
- especialidade/funÃ§Ã£o;
- status.

Essa tela Ã© importante porque cada profissional pode ter bloqueios e agendamentos prÃ³prios.

### HorÃ¡rio de funcionamento

Arquivos:

```text
frontend/pages/horario-de-funcionamento.html
frontend/css/horario-de-funcionamento.css
frontend/js/horario-funcionamento.js
```

FunÃ§Ãµes:

- configurar os 7 dias da semana;
- indicar se a empresa abre ou nÃ£o em cada dia;
- informar horÃ¡rio de abertura;
- informar horÃ¡rio de fechamento;
- informar intervalo de inÃ­cio e fim.

Regras:

- dia aberto precisa ter abertura e fechamento;
- abertura deve ser menor que fechamento;
- inÃ­cio do intervalo deve ser menor que fim do intervalo.

### Bloqueio de horÃ¡rios

Arquivos:

```text
frontend/pages/bloqueio-de-horarios.html
frontend/css/bloqueio-de-horarios.css
frontend/js/bloqueio-horarios.js
```

FunÃ§Ãµes:

- cadastrar bloqueio manual;
- listar bloqueios;
- excluir bloqueio;
- carregar profissionais ativos do banco;
- vincular bloqueio a um profissional real.

Essa tela agora nÃ£o usa mais profissionais fixos no HTML. O combo busca dados em:

```text
GET /api/profissionais?empresaId=1&somenteAtivos=true
```

### Agenda da empresa

Arquivos:

```text
frontend/pages/agenda-empresa.html
frontend/css/agenda-empresa.css
frontend/js/agenda-empresa.js
```

FunÃ§Ãµes:

- listar agendamentos;
- filtrar por data inicial;
- filtrar por data final;
- filtrar por profissional;
- filtrar por cliente;
- visualizar detalhes do agendamento;
- confirmar agendamento;
- cancelar agendamento;
- marcar como realizado.

## Rotas da API

### Empresas

Base:

```text
/api/empresas
```

Rotas:

```text
POST /api/empresas
```

FunÃ§Ã£o:

- cadastrar empresa;
- validar dados obrigatÃ³rios;
- impedir e-mail duplicado;
- salvar senha com hash;
- criar empresa com status de aprovaÃ§Ã£o `pendente`.

### ServiÃ§os

Base:

```text
/api/servicos
```

Rotas:

```text
GET    /api/servicos?empresaId=1
POST   /api/servicos
PUT    /api/servicos/:id
DELETE /api/servicos/:id?empresaId=1
```

FunÃ§Ã£o:

- gerenciar serviÃ§os da empresa.

### Profissionais

Base:

```text
/api/profissionais
```

Rotas:

```text
GET    /api/profissionais?empresaId=1
GET    /api/profissionais?empresaId=1&somenteAtivos=true
POST   /api/profissionais
PUT    /api/profissionais/:id
DELETE /api/profissionais/:id?empresaId=1
```

FunÃ§Ã£o:

- gerenciar profissionais da empresa;
- fornecer profissionais ativos para combos da agenda e bloqueio.

### HorÃ¡rios de funcionamento

Base:

```text
/api/horarios-funcionamento
```

Rotas:

```text
GET /api/horarios-funcionamento?empresaId=1
PUT /api/horarios-funcionamento
```

FunÃ§Ã£o:

- listar horÃ¡rios configurados;
- salvar ou atualizar os 7 dias da semana.

### Bloqueios de horÃ¡rios

Base:

```text
/api/bloqueios-horarios
```

Rotas:

```text
GET    /api/bloqueios-horarios?empresaId=1
POST   /api/bloqueios-horarios
DELETE /api/bloqueios-horarios/:id?empresaId=1
```

FunÃ§Ã£o:

- gerenciar indisponibilidades manuais;
- bloquear horÃ¡rios especÃ­ficos de um profissional.

### Agendamentos

Base:

```text
/api/agendamentos
```

Rotas:

```text
GET   /api/agendamentos?empresaId=1
GET   /api/agendamentos/profissionais?empresaId=1
POST  /api/agendamentos
PATCH /api/agendamentos/:id/status
```

FunÃ§Ã£o:

- listar agenda da empresa;
- criar agendamento;
- alterar status do agendamento;
- aplicar regras de disponibilidade.

## Banco de dados

### Tabela `empresas`

Armazena os dados principais da empresa.

Campos importantes:

- `id`;
- `nome_responsavel`;
- `telefone`;
- `email`;
- `nome_estabelecimento`;
- `senha_hash`;
- `status_aprovacao`.

Regra:

Empresas comeÃ§am como `pendente`, pois sÃ³ devem ficar visÃ­veis apÃ³s aprovaÃ§Ã£o do administrador.

### Tabela `servicos`

Armazena os serviÃ§os oferecidos pela empresa.

Campos importantes:

- `empresa_id`;
- `nome`;
- `categoria`;
- `preco_centavos`;
- `duracao_minutos`;
- `status`.

Regra:

O agendamento usa `duracao_minutos` para calcular o horÃ¡rio final.

### Tabela `profissionais`

Armazena a equipe da empresa.

Campos importantes:

- `empresa_id`;
- `nome`;
- `telefone`;
- `email`;
- `especialidade`;
- `ativo`.

Regra:

Somente profissionais ativos devem aparecer nos combos de agenda e bloqueio.

### Tabela `horarios_funcionamento`

Armazena a disponibilidade semanal da empresa.

Campos importantes:

- `empresa_id`;
- `dia_semana`;
- `abre`;
- `horario_abertura`;
- `horario_fechamento`;
- `intervalo_inicio`;
- `intervalo_fim`.

### Tabela `bloqueios_horarios`

Armazena indisponibilidades manuais.

Campos importantes:

- `empresa_id`;
- `profissional_id`;
- `data_bloqueio`;
- `horario_inicio`;
- `horario_fim`;
- `motivo`.

Regra:

Um bloqueio impede agendamento naquele intervalo.

### Tabela `agendamentos`

Armazena os atendimentos marcados.

Campos importantes:

- `empresa_id`;
- `servico_id`;
- `profissional_id`;
- `nome_cliente`;
- `data_agendamento`;
- `horario_inicio`;
- `horario_fim`;
- `status`.

Status possÃ­veis:

```text
pendente
confirmado
cancelado
realizado
```

## Regras de negÃ³cio implementadas

### Um horÃ¡rio nÃ£o pode ser agendado por mais de um cliente

Na criaÃ§Ã£o de agendamento, o sistema verifica se jÃ¡ existe agendamento ativo no mesmo intervalo.

Status considerados ativos:

```text
pendente
confirmado
```

### O agendamento deve respeitar o horÃ¡rio de funcionamento

O sistema consulta `horarios_funcionamento` antes de criar o agendamento.

Ele impede:

- agendamento em dia fechado;
- agendamento antes da abertura;
- agendamento depois do fechamento;
- agendamento durante intervalo.

### Cada serviÃ§o possui duraÃ§Ã£o fixa

A duraÃ§Ã£o Ã© cadastrada na tela de serviÃ§os e salva em `duracao_minutos`.

Ao criar agendamento:

```text
horario_fim = horario_inicio + duracao_minutos
```

### O cliente sÃ³ pode agendar serviÃ§os disponÃ­veis no estabelecimento

O sistema verifica se o serviÃ§o:

- pertence Ã  empresa;
- estÃ¡ ativo.

### Cancelamentos possuem prazo mÃ­nimo

Atualmente foi definido um prazo padrÃ£o de 2 horas antes do atendimento.

Essa regra estÃ¡ em:

```text
backend/src/controllers/agendamentoController.js
```

No futuro, esse prazo pode virar uma configuraÃ§Ã£o da empresa.

### Empresas sÃ³ ficam visÃ­veis apÃ³s aprovaÃ§Ã£o do administrador

No cadastro, a empresa Ã© criada com:

```text
status_aprovacao = pendente
```

A aprovaÃ§Ã£o final ficarÃ¡ com o mÃ³dulo do administrador.

## Uso temporÃ¡rio do localStorage

Enquanto a tela de login ainda nÃ£o estÃ¡ integrada, o projeto usa:

```text
localStorage.agendaRosaEmpresaId
```

Esse valor identifica a empresa logada para testar as telas.

Depois que o login for integrado, o ideal Ã© trocar isso por:

- sessÃ£o;
- token;
- ou outro mecanismo de autenticaÃ§Ã£o definido pelo grupo.

## Arquivos JavaScript do front-end

### `cadastro-empresa.js`

ResponsÃ¡vel por:

- validar cadastro;
- enviar empresa para a API;
- salvar temporariamente o `empresaId`.

### `servicos-empresa.js`

ResponsÃ¡vel por:

- cadastrar serviÃ§o;
- editar;
- excluir;
- listar na tabela.

### `profissionais-empresa.js`

ResponsÃ¡vel por:

- cadastrar profissional;
- editar;
- excluir;
- listar profissionais.

### `horario-funcionamento.js`

ResponsÃ¡vel por:

- salvar os horÃ¡rios semanais;
- carregar horÃ¡rios cadastrados;
- habilitar/desabilitar campos quando o dia abre ou nÃ£o.

### `bloqueio-horarios.js`

ResponsÃ¡vel por:

- carregar profissionais ativos no combo;
- cadastrar bloqueios;
- listar bloqueios;
- excluir bloqueios.

### `agenda-empresa.js`

ResponsÃ¡vel por:

- listar agendamentos;
- aplicar filtros;
- abrir detalhes;
- alterar status.

## PrÃ³ximas integraÃ§Ãµes recomendadas

### Login

Quando a tela de login for integrada, substituir o uso de `localStorage` manual pelo ID da empresa autenticada.

### Administrador

O mÃ³dulo administrador deve aprovar ou reprovar empresas.

Campo envolvido:

```text
empresas.status_aprovacao
```

### Cliente

O mÃ³dulo cliente deve consumir:

```text
POST /api/agendamentos
```

Para criar agendamentos respeitando as regras jÃ¡ implementadas.

## Pontos que precisam ser alterados apÃ³s integrar com a parte do Rodrigo

O Rodrigo ficou responsÃ¡vel pela tela de login e pelo ambiente do cliente. Quando essa parte for conectada ao ambiente da empresa, alguns pontos desta implementaÃ§Ã£o precisam ser ajustados para deixar o sistema integrado corretamente.

### 1. Substituir o uso temporÃ¡rio do localStorage

Hoje, para conseguir testar as telas da empresa antes da integraÃ§Ã£o com login, o sistema usa:

```text
localStorage.agendaRosaEmpresaId
```

Esse valor Ã© salvo temporariamente apÃ³s o cadastro da empresa e usado nas telas de:

- serviÃ§os;
- profissionais;
- horÃ¡rio de funcionamento;
- bloqueio de horÃ¡rios;
- agenda.

Arquivos que usam esse valor atualmente:

```text
frontend/js/cadastro-empresa.js
frontend/js/servicos-empresa.js
frontend/js/profissionais-empresa.js
frontend/js/horario-funcionamento.js
frontend/js/bloqueio-horarios.js
frontend/js/agenda-empresa.js
```

Depois que o login do Rodrigo estiver pronto, o correto serÃ¡ trocar esse uso provisÃ³rio pelo ID da empresa autenticada.

Exemplo da ideia atual:

```javascript
localStorage.getItem("agendaRosaEmpresaId");
```

Depois da integraÃ§Ã£o, isso pode virar algo como:

```javascript
usuarioLogado.empresaId;
```

Ou outro formato definido pelo grupo, dependendo de como o login for implementado.

### 2. Integrar autenticaÃ§Ã£o real

Atualmente, a API ainda nÃ£o valida usuÃ¡rio logado. Isso significa que, se alguÃ©m souber o `empresaId`, conseguiria chamar as rotas da empresa.

ApÃ³s integrar o login, serÃ¡ necessÃ¡rio proteger rotas como:

```text
/api/servicos
/api/profissionais
/api/horarios-funcionamento
/api/bloqueios-horarios
/api/agendamentos
```

O ideal Ã© que a API identifique automaticamente a empresa pelo usuÃ¡rio autenticado, sem depender do front-end enviar manualmente o `empresaId`.

### 3. Ajustar o cadastro de empresa para redirecionar ao login ou painel

Hoje, apÃ³s cadastrar uma empresa, o sistema apenas mostra uma mensagem e salva o ID no navegador.

Arquivo:

```text
frontend/js/cadastro-empresa.js
```

Depois da integraÃ§Ã£o, o grupo precisa decidir se, apÃ³s o cadastro:

- a empresa serÃ¡ enviada para a tela de login;
- a empresa jÃ¡ entrarÃ¡ automaticamente no painel;
- a empresa ficarÃ¡ aguardando aprovaÃ§Ã£o do administrador antes de acessar.

Como existe a regra de que empresas sÃ³ ficam visÃ­veis apÃ³s aprovaÃ§Ã£o do administrador, a opÃ§Ã£o mais segura Ã©:

```text
Cadastro realizado -> aguardar aprovaÃ§Ã£o -> fazer login apÃ³s aprovaÃ§Ã£o
```

### 4. Integrar cliente com a rota de agendamento

A parte do cliente deverÃ¡ chamar a rota:

```text
POST /api/agendamentos
```

Essa rota jÃ¡ possui regras importantes:

- verifica se o serviÃ§o pertence Ã  empresa;
- verifica se o serviÃ§o estÃ¡ ativo;
- calcula o horÃ¡rio final pela duraÃ§Ã£o do serviÃ§o;
- valida horÃ¡rio de funcionamento;
- valida intervalo;
- valida bloqueios manuais;
- valida conflitos com outros agendamentos;
- impede dois clientes no mesmo horÃ¡rio.

O ambiente do cliente precisarÃ¡ enviar dados como:

```json
{
  "empresaId": 1,
  "servicoId": 2,
  "profissionalId": 1,
  "clienteId": 5,
  "nomeCliente": "Ana Paula",
  "telefoneCliente": "(62) 99999-9999",
  "emailCliente": "ana@email.com",
  "dataAgendamento": "2026-05-20",
  "horarioInicio": "09:00",
  "observacoes": "Primeiro atendimento"
}
```

### 5. Trocar dados do cliente digitados por dados do cliente logado

Hoje a rota de agendamento aceita:

```text
nomeCliente
telefoneCliente
emailCliente
```

Isso ajuda nos testes, mas depois da integraÃ§Ã£o com o ambiente do cliente, esses dados devem vir do usuÃ¡rio logado.

Ou seja, no futuro:

- `clienteId` deve vir da sessÃ£o/login;
- nome, telefone e e-mail podem vir do cadastro do cliente;
- o cliente nÃ£o deve precisar redigitar todos os dados toda vez.

### 6. Ajustar a tela de agenda para carregar profissionais cadastrados

A tela de agenda jÃ¡ possui busca de profissionais pelo back-end:

```text
GET /api/agendamentos/profissionais?empresaId=1
```

Mas, depois da integraÃ§Ã£o com login, esse `empresaId=1` tambÃ©m deve deixar de ser manual e vir da empresa autenticada.

Arquivo:

```text
frontend/js/agenda-empresa.js
```

### 7. Revisar regra de cancelamento

Atualmente, o prazo de cancelamento estÃ¡ fixo em 2 horas.

Arquivo:

```text
backend/src/controllers/agendamentoController.js
```

Trecho conceitual:

```text
PRAZO_CANCELAMENTO_HORAS = 2
```

Depois da integraÃ§Ã£o, o grupo pode decidir se esse prazo serÃ¡:

- fixo para todo o sistema;
- configurÃ¡vel por empresa;
- definido pelo administrador.

Se for configurÃ¡vel por empresa, serÃ¡ necessÃ¡rio criar um campo novo na tabela `empresas`, como:

```text
prazo_cancelamento_horas
```

### 8. Revisar aprovaÃ§Ã£o de empresas com o mÃ³dulo do administrador

Hoje a empresa Ã© cadastrada com:

```text
status_aprovacao = pendente
```

Quando a parte do Maycon, responsÃ¡vel pelo administrador, for integrada, serÃ¡ necessÃ¡rio criar ou conectar rotas para:

- listar empresas pendentes;
- aprovar empresa;
- reprovar empresa;
- impedir login ou visibilidade de empresas nÃ£o aprovadas.

### 9. Remover dados de teste do SQLite local

Durante os testes foram criados dados locais, como:

- empresa de teste;
- serviÃ§o de teste;
- profissional de teste;
- bloqueio de teste;
- agendamento de teste.

Esses dados estÃ£o apenas no banco local:

```text
backend/data/agenda-rosa.sqlite
```

Antes de apresentar ou juntar com os colegas, pode ser interessante limpar o banco local ou recriÃ¡-lo.

Como a pasta `backend/data/` estÃ¡ no `.gitignore`, esses dados nÃ£o serÃ£o enviados para o GitHub.

### 10. Conferir nomes de campos combinados entre as partes

Antes de juntar tudo, alinhem os nomes usados nas telas e APIs.

Exemplos importantes:

```text
empresaId
clienteId
profissionalId
servicoId
dataAgendamento
horarioInicio
```

Manter nomes consistentes evita erros na integraÃ§Ã£o entre ambiente da empresa, ambiente do cliente, login e administrador.

### Profissionais e agenda

Depois, pode ser criada uma configuraÃ§Ã£o de horÃ¡rio individual por profissional, caso cada profissional tenha expediente prÃ³prio.

Hoje o sistema considera:

- horÃ¡rio de funcionamento da empresa;
- bloqueios manuais por profissional;
- agendamentos jÃ¡ existentes por profissional.

## ObservaÃ§Ãµes para o GitHub

O `.gitignore` jÃ¡ impede envio de:

```text
node_modules/
backend/data/
.env
npm-debug.log*
```

Isso evita subir dependÃªncias e banco local para o repositÃ³rio.

## Resumo do fluxo da agenda

1. Empresa cadastra serviÃ§os.
2. Empresa cadastra profissionais.
3. Empresa define horÃ¡rio de funcionamento.
4. Empresa bloqueia horÃ¡rios especÃ­ficos, se necessÃ¡rio.
5. Cliente solicita agendamento.
6. API verifica:
   - serviÃ§o pertence Ã  empresa;
   - serviÃ§o estÃ¡ ativo;
   - empresa abre naquele dia;
   - horÃ¡rio estÃ¡ dentro do funcionamento;
   - horÃ¡rio nÃ£o cai no intervalo;
   - profissional nÃ£o possui bloqueio manual;
   - profissional nÃ£o possui outro agendamento no mesmo perÃ­odo.
7. Se tudo estiver correto, o agendamento Ã© salvo.
8. Empresa acompanha e altera status pela tela de agenda.

## Status atual

Implementado:

- back-end Node.js com Express;
- banco SQLite;
- arquitetura MVC;
- cadastro de empresa;
- cadastro de serviÃ§os;
- cadastro de profissionais;
- horÃ¡rio de funcionamento;
- bloqueio de horÃ¡rios com vÃ­nculo ao profissional;
- agenda da empresa;
- regras principais de disponibilidade.

Pendente para integraÃ§Ã£o com o restante do grupo:

- login;
- cliente;
- administrador;
- aprovaÃ§Ã£o de empresas;
- autenticaÃ§Ã£o real;
- integraÃ§Ã£o final via GitHub.

## Atualização: indicadores da home da empresa

A home da empresa agora possui indicadores conectados ao banco de dados.

Arquivo do front-end:

```text
frontend/js/home-empresa.js
```

Arquivos do back-end:

```text
backend/src/routes/homeEmpresaRoutes.js
backend/src/controllers/homeEmpresaController.js
backend/src/models/homeEmpresaModel.js
```

Rota criada:

```text
GET /api/home-empresa/resumo?empresaId=1
```

Essa rota retorna:

- total de agendamentos ativos de hoje;
- próximo atendimento do dia;
- total de horários bloqueados hoje.

O card "Próximo atendimento" deve buscar o próximo agendamento de hoje a partir da hora atual, considerando os status:

```text
pendente
confirmado
```

Se não existir próximo atendimento para o dia, a tela exibe:

```text
--:--
```

