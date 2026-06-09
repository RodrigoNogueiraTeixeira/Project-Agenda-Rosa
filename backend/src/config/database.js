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
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
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
      empresa_id INTEGER,
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
      estabelecimento_id INTEGER,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      categoria TEXT DEFAULT 'Geral',
      preco_centavos INTEGER,
      duracao_minutos INTEGER DEFAULT 30,
      descricao TEXT,
      status TEXT DEFAULT 'ativo',
      empresa_id INTEGER,
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  // Agendamentos
  await run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id SERIAL PRIMARY KEY,
      cliente_id INTEGER,
      estabelecimento_id INTEGER,
      estabelecimento_nome TEXT,
      data TEXT,
      horario TEXT,
      profissional TEXT,
      observacoes TEXT,
      total REAL,
      status TEXT NOT NULL DEFAULT 'pendente',
      criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
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

  // Servicos atendidos por cada profissional
  await run(`
    CREATE TABLE IF NOT EXISTS profissional_servicos (
      id SERIAL PRIMARY KEY,
      profissional_id INTEGER NOT NULL,
      servico_id INTEGER NOT NULL,
      FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE CASCADE,
      FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE CASCADE,
      UNIQUE (profissional_id, servico_id)
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
    await run("INSERT INTO categorias (nome, descricao, status) VALUES (?, ?, ?)", ["Estética Feminino", "Servicos de estetica corporal e facial feminina.", "Ativa"]);
  }
}

// Mantem bancos existentes compativeis com o CRUD de servicos da empresa.
async function migrarTabelaServicos() {
  await run("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS empresa_id INTEGER");
  await run("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS categoria TEXT DEFAULT 'Geral'");
  await run("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS preco_centavos INTEGER");
  await run("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS duracao_minutos INTEGER DEFAULT 30");
  await run("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS descricao TEXT");
  await run("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ativo'");
  await run("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS criado_em TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)");
  await run("ALTER TABLE servicos ADD COLUMN IF NOT EXISTS atualizado_em TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)");

  // O vinculo definitivo com estabelecimentos sera tratado em uma etapa propria.
  await run("ALTER TABLE servicos ALTER COLUMN estabelecimento_id DROP NOT NULL");

  await run(`
    UPDATE servicos
    SET preco_centavos = ROUND(preco * 100)::INTEGER
    WHERE preco_centavos IS NULL AND preco IS NOT NULL
  `);
  await run(`
    UPDATE servicos
    SET
      categoria = COALESCE(categoria, 'Geral'),
      duracao_minutos = COALESCE(duracao_minutos, 30),
      status = COALESCE(status, 'ativo'),
      criado_em = COALESCE(criado_em, CURRENT_TIMESTAMP::TEXT),
      atualizado_em = COALESCE(atualizado_em, CURRENT_TIMESTAMP::TEXT)
  `);
}

// Relaciona empresas aprovadas aos estabelecimentos exibidos no marketplace.
async function migrarRelacionamentoEmpresaEstabelecimento() {
  await run("ALTER TABLE estabelecimentos ADD COLUMN IF NOT EXISTS empresa_id INTEGER");
  await run(`
    CREATE UNIQUE INDEX IF NOT EXISTS estabelecimentos_empresa_id_unique
    ON estabelecimentos (empresa_id)
  `);
  await run(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'estabelecimentos_empresa_id_fkey'
      ) THEN
        ALTER TABLE estabelecimentos
        ADD CONSTRAINT estabelecimentos_empresa_id_fkey
        FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE;
      END IF;
    END
    $$
  `);

  await run(`
    INSERT INTO estabelecimentos (
      empresa_id,
      nome,
      cidade,
      bairro,
      endereco,
      cep
    )
    SELECT
      e.id,
      e.nome_estabelecimento,
      e.cidade,
      e.bairro,
      NULLIF(
        CONCAT_WS(
          ', ',
          NULLIF(TRIM(e.endereco), ''),
          NULLIF(TRIM(e.numero), ''),
          NULLIF(TRIM(e.complemento), '')
        ),
        ''
      ),
      e.cep
    FROM empresas e
    WHERE e.status_aprovacao = 'aprovada'
      AND NOT EXISTS (
        SELECT 1
        FROM estabelecimentos est
        WHERE est.empresa_id = e.id
      )
  `);

  await run(`
    UPDATE servicos s
    SET estabelecimento_id = est.id
    FROM estabelecimentos est
    WHERE est.empresa_id = s.empresa_id
      AND s.empresa_id IS NOT NULL
      AND s.estabelecimento_id IS DISTINCT FROM est.id
  `);

  await run(`
    INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo)
    SELECT est.id, e.categoria_principal
    FROM empresas e
    INNER JOIN estabelecimentos est ON est.empresa_id = e.id
    WHERE e.status_aprovacao = 'aprovada'
      AND NULLIF(TRIM(e.categoria_principal), '') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM estabelecimento_tipos et
        WHERE et.estabelecimento_id = est.id
          AND LOWER(et.tipo) = LOWER(e.categoria_principal)
      )
  `);
}

// Unifica os campos legados do cliente com os campos usados pelo painel da empresa.
async function migrarTabelaAgendamentos() {
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS empresa_id INTEGER");
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS servico_id INTEGER");
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS profissional_id INTEGER");
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS nome_cliente TEXT");
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS telefone_cliente TEXT");
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS email_cliente TEXT");
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS data_agendamento TEXT");
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS horario_inicio TEXT");
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS horario_fim TEXT");
  await run("ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS atualizado_em TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)");

  await run("ALTER TABLE agendamentos ALTER COLUMN cliente_id DROP NOT NULL");
  await run("ALTER TABLE agendamentos ALTER COLUMN estabelecimento_id DROP NOT NULL");
  await run("ALTER TABLE agendamentos ALTER COLUMN estabelecimento_nome DROP NOT NULL");
  await run("ALTER TABLE agendamentos ALTER COLUMN data DROP NOT NULL");
  await run("ALTER TABLE agendamentos ALTER COLUMN horario DROP NOT NULL");
  await run("ALTER TABLE agendamentos ALTER COLUMN total DROP NOT NULL");
  await run("ALTER TABLE agendamentos ALTER COLUMN status SET DEFAULT 'pendente'");
  await run("ALTER TABLE agendamentos ALTER COLUMN criado_em SET DEFAULT (CURRENT_TIMESTAMP::TEXT)");

  await run(`
    UPDATE agendamentos ag
    SET
      empresa_id = COALESCE(ag.empresa_id, est.empresa_id),
      data_agendamento = COALESCE(ag.data_agendamento, ag.data),
      horario_inicio = COALESCE(ag.horario_inicio, ag.horario),
      atualizado_em = COALESCE(ag.atualizado_em, ag.criado_em, CURRENT_TIMESTAMP::TEXT)
    FROM estabelecimentos est
    WHERE est.id = ag.estabelecimento_id
  `);

  await run(`
    UPDATE agendamentos ag
    SET
      nome_cliente = COALESCE(ag.nome_cliente, cli.nome),
      telefone_cliente = COALESCE(ag.telefone_cliente, cli.telefone),
      email_cliente = COALESCE(ag.email_cliente, cli.email)
    FROM clientes cli
    WHERE cli.id = ag.cliente_id
  `);

  await run(`
    UPDATE agendamentos ag
    SET servico_id = item.servico_id
    FROM (
      SELECT DISTINCT ON (agendamento_id)
        agendamento_id,
        servico_id
      FROM agendamento_servicos
      ORDER BY agendamento_id, id
    ) item
    WHERE item.agendamento_id = ag.id
      AND ag.servico_id IS NULL
  `);

  await run(`
    UPDATE agendamentos
    SET
      data = COALESCE(data, data_agendamento),
      horario = COALESCE(horario, horario_inicio),
      status = CASE
        WHEN status = 'confirmado' THEN 'agendado'
        WHEN status = 'realizado' THEN 'concluido'
        ELSE COALESCE(status, 'pendente')
      END
  `);
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
    "profissional_servicos",
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
  await migrarTabelaServicos();
  await migrarRelacionamentoEmpresaEstabelecimento();
  await migrarTabelaAgendamentos();
  await popularComSeedSeNecessario();
  await resetarSequences();
  console.log("✅ Banco de dados pronto!");
}

module.exports = { run, get, all, transaction, inicializarBanco };
