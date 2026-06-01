const { Pool } = require("pg");

// ============================================================
// CONEXÃO COM POSTGRESQL (Neon.tech)
// ============================================================
// Configure a variável DATABASE_URL no painel do Render com a
// connection string fornecida pelo Neon.tech. Exemplo:
// postgresql://usuario:senha@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
// ============================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on("error", (err) => {
  console.error("Erro inesperado na conexão com o banco de dados:", err.message);
});

// ============================================================
// TRADUTOR DE SINTAXE SQLite → PostgreSQL
// ============================================================
// Os arquivos DAO do projeto usam a sintaxe do SQLite (?).
// O PostgreSQL exige a sintaxe posicional ($1, $2, ...).
// Este tradutor converte automaticamente para que não seja
// necessário alterar nenhum outro arquivo do projeto.
// ============================================================

function traduzirParaPostgres(sql) {
  let contador = 0;

  // Converte ? para $1, $2, $3...
  let sqlConvertido = sql.replace(/\?/g, () => {
    contador++;
    return `$${contador}`;
  });

  // Converte INTEGER PRIMARY KEY AUTOINCREMENT → SERIAL PRIMARY KEY
  sqlConvertido = sqlConvertido.replace(
    /INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT/gi,
    "SERIAL PRIMARY KEY"
  );

  // Converte PRAGMA (comandos internos do SQLite, ignorados no Postgres)
  if (/^\s*PRAGMA/i.test(sqlConvertido)) {
    return { sql: null, ignorar: true };
  }

  return { sql: sqlConvertido, ignorar: false };
}

// ============================================================
// FUNÇÕES UTILITÁRIAS DE BANCO DE DADOS
// ============================================================

// Executa SQL sem retorno de linhas (INSERT, UPDATE, DELETE, CREATE).
async function run(sql, params = []) {
  const { sql: sqlPg, ignorar } = traduzirParaPostgres(sql);

  if (ignorar) {
    return { lastID: null, changes: 0 };
  }

  // Para INSERT INTO, adiciona RETURNING id para capturar o ID gerado
  let sqlFinal = sqlPg;
  const ehInsert = /^\s*INSERT\s+INTO/i.test(sqlFinal);
  if (ehInsert && !/RETURNING/i.test(sqlFinal)) {
    // Remove ponto e vírgula final se houver, e adiciona RETURNING id
    sqlFinal = sqlFinal.replace(/;?\s*$/, "") + " RETURNING id";
  }

  const result = await pool.query(sqlFinal, params);

  const lastID = ehInsert && result.rows && result.rows[0]
    ? Number(result.rows[0].id)
    : null;

  return {
    lastID,
    changes: result.rowCount || 0
  };
}

// Busca uma única linha.
async function get(sql, params = []) {
  const { sql: sqlPg, ignorar } = traduzirParaPostgres(sql);

  if (ignorar) {
    return null;
  }

  const result = await pool.query(sqlPg, params);
  return result.rows[0] || null;
}

// Busca várias linhas.
async function all(sql, params = []) {
  const { sql: sqlPg, ignorar } = traduzirParaPostgres(sql);

  if (ignorar) {
    return [];
  }

  const result = await pool.query(sqlPg, params);
  return result.rows;
}

// Executa um bloco de operações sob a mesma transação e conexão.
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const tx = {
      run: async (sql, params = []) => {
        const { sql: sqlPg, ignorar } = traduzirParaPostgres(sql);
        if (ignorar) {
          return { lastID: null, changes: 0 };
        }

        let sqlFinal = sqlPg;
        const ehInsert = /^\s*INSERT\s+INTO/i.test(sqlFinal);
        if (ehInsert && !/RETURNING/i.test(sqlFinal)) {
          sqlFinal = sqlFinal.replace(/;?\s*$/, "") + " RETURNING id";
        }

        const result = await client.query(sqlFinal, params);

        const lastID = ehInsert && result.rows && result.rows[0]
          ? Number(result.rows[0].id)
          : null;

        return {
          lastID,
          changes: result.rowCount || 0
        };
      },
      get: async (sql, params = []) => {
        const { sql: sqlPg, ignorar } = traduzirParaPostgres(sql);
        if (ignorar) return null;
        const result = await client.query(sqlPg, params);
        return result.rows[0] || null;
      },
      all: async (sql, params = []) => {
        const { sql: sqlPg, ignorar } = traduzirParaPostgres(sql);
        if (ignorar) return [];
        const result = await client.query(sqlPg, params);
        return result.rows;
      }
    };

    const result = await callback(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// CRIAÇÃO DAS TABELAS (SCHEMA)
// ============================================================

async function criarTabelas() {
  // Clientes
  await run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      senha TEXT NOT NULL DEFAULT '',
      telefone TEXT,
      cidade TEXT,
      bairro TEXT
    )
  `);

  // Estabelecimentos
  await run(`
    CREATE TABLE IF NOT EXISTS estabelecimentos (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      cidade TEXT,
      bairro TEXT,
      endereco TEXT,
      cep TEXT,
      logo_url TEXT,
      latitude REAL,
      longitude REAL
    )
  `);

  // Tipos de estabelecimento
  await run(`
    CREATE TABLE IF NOT EXISTS estabelecimento_tipos (
      id SERIAL PRIMARY KEY,
      estabelecimento_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  // Serviços
  await run(`
    CREATE TABLE IF NOT EXISTS servicos (
      id SERIAL PRIMARY KEY,
      estabelecimento_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      categoria TEXT DEFAULT 'Geral',
      preco_centavos INTEGER,
      duracao_minutos INTEGER DEFAULT 30,
      descricao TEXT,
      status TEXT DEFAULT 'ativo',
      empresa_id INTEGER,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  // Agendamentos
  await run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER NOT NULL,
      estabelecimento_id INTEGER NOT NULL,
      estabelecimento_nome TEXT NOT NULL,
      data TEXT NOT NULL,
      horario TEXT NOT NULL,
      profissional TEXT,
      observacoes TEXT,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      criado_em TEXT NOT NULL,
      cancelado_em TEXT,
      empresa_id INTEGER,
      servico_id INTEGER,
      profissional_id INTEGER,
      nome_cliente TEXT,
      telefone_cliente TEXT,
      email_cliente TEXT,
      data_agendamento TEXT,
      horario_inicio TEXT,
      horario_fim TEXT,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  // Itens do agendamento
  await run(`
    CREATE TABLE IF NOT EXISTS agendamento_servicos (
      id SERIAL PRIMARY KEY,
      agendamento_id INTEGER NOT NULL,
      servico_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    )
  `);

  // Pagamentos
  await run(`
    CREATE TABLE IF NOT EXISTS pagamentos (
      id SERIAL PRIMARY KEY,
      agendamento_id INTEGER NOT NULL,
      cliente_id INTEGER NOT NULL,
      valor_total REAL NOT NULL,
      descricao TEXT NOT NULL,
      status TEXT NOT NULL,
      preference_id TEXT,
      mp_payment_id TEXT,
      status_detalhe TEXT,
      init_point TEXT,
      sandbox_init_point TEXT,
      external_reference TEXT UNIQUE,
      bruto_webhook TEXT,
      criado_em TEXT NOT NULL,
      atualizado_em TEXT NOT NULL,
      FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id),
      FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )
  `);

  // Webhooks de pagamento
  await run(`
    CREATE TABLE IF NOT EXISTS pagamentos_webhooks (
      id SERIAL PRIMARY KEY,
      topic TEXT,
      action TEXT,
      data_id TEXT,
      payload TEXT,
      criado_em TEXT NOT NULL
    )
  `);

  // Empresas
  await run(`
    CREATE TABLE IF NOT EXISTS empresas (
      id SERIAL PRIMARY KEY,
      nome_responsavel TEXT NOT NULL,
      telefone TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      nome_estabelecimento TEXT NOT NULL,
      senha_hash TEXT NOT NULL,
      categoria_principal TEXT,
      descricao TEXT,
      cep TEXT,
      endereco TEXT,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      cidade TEXT,
      status_aprovacao TEXT NOT NULL DEFAULT 'pendente',
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT status_aprovacao_valido CHECK (status_aprovacao IN ('pendente', 'aprovada', 'reprovada'))
    )
  `);

  // Profissionais
  await run(`
    CREATE TABLE IF NOT EXISTS profissionais (
      id SERIAL PRIMARY KEY,
      empresa_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      telefone TEXT,
      email TEXT,
      especialidade TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
    )
  `);

  // Horários de funcionamento
  await run(`
    CREATE TABLE IF NOT EXISTS horarios_funcionamento (
      id SERIAL PRIMARY KEY,
      empresa_id INTEGER NOT NULL,
      dia_semana INTEGER NOT NULL,
      abre INTEGER NOT NULL DEFAULT 1,
      horario_abertura TEXT,
      horario_fechamento TEXT,
      intervalo_inicio TEXT,
      intervalo_fim TEXT,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      UNIQUE (empresa_id, dia_semana),
      CONSTRAINT dia_semana_valido CHECK (dia_semana BETWEEN 0 AND 6),
      CONSTRAINT abre_valido CHECK (abre IN (0, 1))
    )
  `);

  // Bloqueios de horários
  await run(`
    CREATE TABLE IF NOT EXISTS bloqueios_horarios (
      id SERIAL PRIMARY KEY,
      empresa_id INTEGER NOT NULL,
      profissional_id INTEGER,
      profissional_nome TEXT,
      data_bloqueio TEXT NOT NULL,
      horario_inicio TEXT NOT NULL,
      horario_fim TEXT NOT NULL,
      motivo TEXT,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL
    )
  `);

  // Geocoding Cache
  await run(`
    CREATE TABLE IF NOT EXISTS geocoding_cache (
      endereco_normalizado TEXT PRIMARY KEY,
      endereco_original TEXT,
      latitude REAL,
      longitude REAL,
      atualizado_em TEXT
    )
  `);

  // Categorias
  await run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      descricao TEXT,
      status TEXT NOT NULL DEFAULT 'Ativa'
    )
  `);

  // Tokens de Recuperação
  await run(`
    CREATE TABLE IF NOT EXISTS tokens_recuperacao (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL,
      perfil TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expiracao TEXT NOT NULL,
      utilizado INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed inicial de categorias
  const hasCategorias = await get("SELECT COUNT(*) AS count FROM categorias");
  if (hasCategorias && Number(hasCategorias.count) === 0) {
    await run("INSERT INTO categorias (nome, descricao, status) VALUES (?, ?, ?)", ["Cabelo", "Servicos relacionados a corte e finalizacao.", "Ativa"]);
    await run("INSERT INTO categorias (nome, descricao, status) VALUES (?, ?, ?)", ["Unhas", "Servicos de manicure e pedicure.", "Ativa"]);
  }
}

// ============================================================
// SEED INICIAL DE DADOS
// ============================================================

async function popularComSeedSeNecessario() {
  const path = require("path");
  const fs = require("fs");

  const DATABASE_DIR = path.join(__dirname, "..", "..", "data");
  const SEED_FILE = path.join(DATABASE_DIR, "db.json");

  const contador = await get("SELECT COUNT(*) AS total FROM clientes");
  if (contador && Number(contador.total) > 0) {
    return;
  }

  if (!fs.existsSync(SEED_FILE)) {
    console.log("ℹ️  Arquivo db.json não encontrado. Banco iniciado vazio.");
    return;
  }

  const conteudo = fs.readFileSync(SEED_FILE, "utf-8");
  const dados = JSON.parse(conteudo);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const cliente of dados.clientes || []) {
      await client.query(
        `INSERT INTO clientes (id, nome, email, senha, telefone, cidade, bairro) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
        [cliente.id, cliente.nome, cliente.email, cliente.senha || "", cliente.telefone, cliente.cidade, cliente.bairro]
      );
    }

    for (const est of dados.estabelecimentos || []) {
      await client.query(
        `INSERT INTO estabelecimentos (id, nome, cidade, bairro, endereco, logo_url) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [est.id, est.nome, est.cidade, est.bairro, est.endereco, est.logoUrl || ""]
      );
      for (const tipo of est.tipos || []) {
        await client.query(
          `INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES ($1, $2)`,
          [est.id, tipo]
        );
      }
      for (const servico of est.servicos || []) {
        await client.query(
          `INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES ($1, $2, $3)`,
          [est.id, servico.nome, servico.preco]
        );
      }
    }

    await client.query("COMMIT");
    console.log("✅ Banco de dados populado com os dados iniciais (db.json).");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Erro ao popular banco com seed:", error.message);
  } finally {
    client.release();
  }
}

// ============================================================
// INICIALIZAÇÃO DO BANCO
// ============================================================

async function resetarSequences() {
  // Após inserir dados com IDs fixos (seed), o contador automático
  // do Postgres precisa ser atualizado para não conflitar com novos registros.
  const tabelas = [
    "clientes",
    "estabelecimentos",
    "estabelecimento_tipos",
    "servicos",
    "agendamentos",
    "agendamento_servicos",
    "pagamentos",
    "pagamentos_webhooks",
    "empresas",
    "profissionais",
    "horarios_funcionamento",
    "bloqueios_horarios",
    "categorias"
  ];

  for (const tabela of tabelas) {
    try {
      await pool.query(
        `SELECT setval(pg_get_serial_sequence('${tabela}', 'id'), COALESCE((SELECT MAX(id) FROM ${tabela}), 0) + 1, false)`
      );
    } catch (_err) {
      // Ignora se a tabela não tiver sequence (ex: tabelas sem SERIAL)
    }
  }
  console.log("🔄 Sequences do PostgreSQL atualizadas.");
}

async function inicializarBanco() {
  console.log("🐘 Conectando ao PostgreSQL via Neon.tech...");
  await criarTabelas();
  await popularComSeedSeNecessario();
  await resetarSequences();
  console.log("✅ Banco de dados pronto!");
}

module.exports = { run, get, all, transaction, inicializarBanco };
