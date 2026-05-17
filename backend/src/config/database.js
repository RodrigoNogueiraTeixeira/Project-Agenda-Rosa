const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

// Caminho do arquivo final do banco SQLite.
const DATABASE_DIR = path.join(__dirname, "..", "..", "data");
const DATABASE_FILE = path.join(DATABASE_DIR, "agendarosa.db");

// Garante que a pasta 'data' exista para evitar erro SQLITE_CANTOPEN em servidores de nuvem
if (!fs.existsSync(DATABASE_DIR)) {
  fs.mkdirSync(DATABASE_DIR, { recursive: true });
}

// Caminho do JSON que estamos usando como seed inicial.
const SEED_FILE = path.join(DATABASE_DIR, "db.json");

// Abre a conexao com o banco SQLite.
const db = new sqlite3.Database(DATABASE_FILE);

// Funcao utilitaria para executar SQL sem retorno de linhas (INSERT/UPDATE/DELETE).
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({
        lastID: this.lastID,
        changes: this.changes
      });
    });
  });
}

// Funcao utilitaria para buscar uma linha.
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(row);
    });
  });
}

// Funcao utilitaria para buscar varias linhas.
function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows);
    });
  });
}

// Cria as tabelas principais do sistema.
async function criarTabelas() {
  await run(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      senha TEXT NOT NULL DEFAULT '',
      telefone TEXT,
      cidade TEXT,
      bairro TEXT
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS estabelecimentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  await run(`
    CREATE TABLE IF NOT EXISTS estabelecimento_tipos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estabelecimento_id INTEGER NOT NULL,
      tipo TEXT NOT NULL,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      estabelecimento_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS agendamento_servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agendamento_id INTEGER NOT NULL,
      servico_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      preco REAL NOT NULL,
      FOREIGN KEY (agendamento_id) REFERENCES agendamentos(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  await run(`
    CREATE TABLE IF NOT EXISTS pagamentos_webhooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT,
      action TEXT,
      data_id TEXT,
      payload TEXT,
      criado_em TEXT NOT NULL
    )
  `);

  // --- NOVAS TABELAS DO MODULO EMPRESA ---

  await run(`
    CREATE TABLE IF NOT EXISTS empresas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
      CHECK (status_aprovacao IN ('pendente', 'aprovada', 'reprovada'))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS profissionais (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  await run(`
    CREATE TABLE IF NOT EXISTS horarios_funcionamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      empresa_id INTEGER NOT NULL,
      dia_semana INTEGER NOT NULL,
      abre INTEGER NOT NULL DEFAULT 1,
      horario_abertura TEXT,
      horario_fechamento TEXT,
      intervalo_inicio TEXT,
      intervalo_fim TEXT,
      FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
      UNIQUE (empresa_id, dia_semana),
      CHECK (dia_semana BETWEEN 0 AND 6),
      CHECK (abre IN (0, 1))
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS bloqueios_horarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

  await run(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      status TEXT NOT NULL DEFAULT 'Ativa'
    )
  `);

  const hasCategorias = await get("SELECT COUNT(*) AS count FROM categorias");
  if (hasCategorias && hasCategorias.count === 0) {
    await run("INSERT INTO categorias (nome, descricao, status) VALUES (?, ?, ?)", ["Cabelo", "Servicos relacionados a corte e finalizacao.", "Ativa"]);
    await run("INSERT INTO categorias (nome, descricao, status) VALUES (?, ?, ?)", ["Unhas", "Servicos de manicure e pedicure.", "Ativa"]);
  }
}

// Garante pequenas evolucoes de estrutura sem quebrar banco ja criado.
async function aplicarMigracoes() {
  const colunasClientes = await all("PRAGMA table_info(clientes)");
  const temSenha = colunasClientes.some((coluna) => coluna.name === "senha");
  const colunasEstabelecimentos = await all("PRAGMA table_info(estabelecimentos)");
  const temLogoUrl = colunasEstabelecimentos.some((coluna) => coluna.name === "logo_url");
  const temLatitude = colunasEstabelecimentos.some((coluna) => coluna.name === "latitude");
  const temCep = colunasEstabelecimentos.some((coluna) => coluna.name === "cep");

  if (!temSenha) {
    await run("ALTER TABLE clientes ADD COLUMN senha TEXT NOT NULL DEFAULT ''");
  }

  if (!temLogoUrl) {
    await run("ALTER TABLE estabelecimentos ADD COLUMN logo_url TEXT");
  }

  if (!temLatitude) {
    await run("ALTER TABLE estabelecimentos ADD COLUMN latitude REAL");
    await run("ALTER TABLE estabelecimentos ADD COLUMN longitude REAL");
  }

  if (!temCep) {
    await run("ALTER TABLE estabelecimentos ADD COLUMN cep TEXT");
  }

  // Migrações para unificar Tabelas de Empresa e Serviços
  const colunasServicos = await all("PRAGMA table_info(servicos)");
  const temCategoria = colunasServicos.some(c => c.name === "categoria");
  if (!temCategoria) {
    await run("ALTER TABLE servicos ADD COLUMN categoria TEXT DEFAULT 'Geral'");
    await run("ALTER TABLE servicos ADD COLUMN preco_centavos INTEGER");
    await run("ALTER TABLE servicos ADD COLUMN duracao_minutos INTEGER DEFAULT 30");
    await run("ALTER TABLE servicos ADD COLUMN descricao TEXT");
    await run("ALTER TABLE servicos ADD COLUMN status TEXT DEFAULT 'ativo'");
    await run("ALTER TABLE servicos ADD COLUMN empresa_id INTEGER");
    await run("UPDATE servicos SET preco_centavos = CAST(preco * 100 AS INTEGER)");
    await run("UPDATE servicos SET empresa_id = estabelecimento_id");
  }

  const colunasAgendamentos = await all("PRAGMA table_info(agendamentos)");
  const temEmpresaId = colunasAgendamentos.some(c => c.name === "empresa_id");
  if (!temEmpresaId) {
    await run("ALTER TABLE agendamentos ADD COLUMN empresa_id INTEGER");
    await run("ALTER TABLE agendamentos ADD COLUMN servico_id INTEGER");
    await run("ALTER TABLE agendamentos ADD COLUMN profissional_id INTEGER");
    await run("ALTER TABLE agendamentos ADD COLUMN nome_cliente TEXT");
    await run("ALTER TABLE agendamentos ADD COLUMN telefone_cliente TEXT");
    await run("ALTER TABLE agendamentos ADD COLUMN email_cliente TEXT");
    await run("ALTER TABLE agendamentos ADD COLUMN data_agendamento TEXT");
    await run("ALTER TABLE agendamentos ADD COLUMN horario_inicio TEXT");
    await run("ALTER TABLE agendamentos ADD COLUMN horario_fim TEXT");
    await run("UPDATE agendamentos SET empresa_id = estabelecimento_id");
    await run("UPDATE agendamentos SET horario_inicio = horario");
    await run("UPDATE agendamentos SET data_agendamento = data");
    await run("UPDATE agendamentos SET nome_cliente = (SELECT nome FROM clientes WHERE clientes.id = agendamentos.cliente_id)");
  }

  await run(
    `
      UPDATE clientes
      SET senha = ?
      WHERE LOWER(email) = LOWER(?)
        AND (senha IS NULL OR TRIM(senha) = '')
    `,
    ["123456", "cliente@exemplo.com"]
  );

  await run(
    `
      UPDATE estabelecimentos
      SET logo_url = ?
      WHERE LOWER(nome) = LOWER(?)
        AND (logo_url IS NULL OR TRIM(logo_url) = '')
    `,
    ["https://picsum.photos/seed/rosa-bela/320/180", "Studio Rosa Bela"]
  );

  const semLogo = await all(
    `
      SELECT id
      FROM estabelecimentos
      WHERE logo_url IS NULL OR TRIM(logo_url) = ''
    `
  );

  for (const item of semLogo) {
    const id = Number(item.id || 0);
    if (id > 0) {
      await run(
        `UPDATE estabelecimentos SET logo_url = ? WHERE id = ?`,
        [`https://picsum.photos/seed/loja-${id}/320/180`, id]
      );
    }
  }

  const lojaTeste = await get(
    `SELECT id FROM estabelecimentos WHERE LOWER(nome) = LOWER(?) LIMIT 1`,
    ["Espaco Glamour Premium"]
  );

  if (!lojaTeste) {
    await run(
      `
        INSERT INTO estabelecimentos (nome, cidade, bairro, endereco, logo_url)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        "Espaco Glamour Premium",
        "Sao Paulo",
        "Pinheiros",
        "Rua Bela Rosa, 501 - Pinheiros, Sao Paulo",
        "https://picsum.photos/seed/glamour-premium/320/180"
      ]
    );

    const novo = await get(
      `SELECT id FROM estabelecimentos WHERE LOWER(nome) = LOWER(?) ORDER BY id DESC LIMIT 1`,
      ["Espaco Glamour Premium"]
    );

    const idNovo = novo ? Number(novo.id) : 0;

    if (idNovo > 0) {
      await run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [idNovo, "estetica"]);
      await run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [idNovo, "manicure"]);
      await run(`INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES (?, ?, ?)`, [idNovo, "Design de sobrancelha", 65]);
      await run(`INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES (?, ?, ?)`, [idNovo, "Alongamento de cilios", 180]);
      await run(`INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES (?, ?, ?)`, [idNovo, "Limpeza de pele", 140]);
    }
  }
}

// Preenche o banco somente se ele estiver vazio.
async function popularComSeedSeNecessario() {
  const contador = await get("SELECT COUNT(*) AS total FROM clientes");

  if (contador && contador.total > 0) {
    return;
  }

  if (!fs.existsSync(SEED_FILE)) {
    return;
  }

  const conteudo = fs.readFileSync(SEED_FILE, "utf-8");
  const dados = JSON.parse(conteudo);

  await run("BEGIN TRANSACTION");

  try {
    for (const cliente of dados.clientes || []) {
      await run(
        `INSERT INTO clientes (id, nome, email, senha, telefone, cidade, bairro) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          cliente.id,
          cliente.nome,
          cliente.email,
          cliente.senha || "",
          cliente.telefone,
          cliente.cidade,
          cliente.bairro
        ]
      );
    }

    for (const estabelecimento of dados.estabelecimentos || []) {
      await run(
        `INSERT INTO estabelecimentos (id, nome, cidade, bairro, endereco, logo_url) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          estabelecimento.id,
          estabelecimento.nome,
          estabelecimento.cidade,
          estabelecimento.bairro,
          estabelecimento.endereco,
          estabelecimento.logoUrl || ""
        ]
      );

      for (const tipo of estabelecimento.tipos || []) {
        await run(
          `INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`,
          [estabelecimento.id, tipo]
        );
      }

      for (const servico of estabelecimento.servicos || []) {
        await run(
          `INSERT INTO servicos (estabelecimento_id, nome, preco) VALUES (?, ?, ?)`,
          [estabelecimento.id, servico.nome, servico.preco]
        );
      }
    }

    for (const agendamento of dados.agendamentos || []) {
      const resultado = await run(
        `
          INSERT INTO agendamentos (
            id,
            cliente_id,
            estabelecimento_id,
            estabelecimento_nome,
            data,
            horario,
            profissional,
            observacoes,
            total,
            status,
            criado_em,
            cancelado_em
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          agendamento.id,
          agendamento.clienteId,
          agendamento.estabelecimentoId,
          agendamento.estabelecimentoNome || "",
          agendamento.data,
          agendamento.horario,
          agendamento.profissional || "Sem preferencia",
          agendamento.observacoes || "",
          agendamento.total || 0,
          agendamento.status || "agendado",
          agendamento.criadoEm || new Date().toISOString(),
          agendamento.canceladoEm || null
        ]
      );

      const idAgendamento = resultado.lastID || agendamento.id;
      for (const servico of agendamento.servicos || []) {
        await run(
          `INSERT INTO agendamento_servicos (agendamento_id, servico_id, nome, preco) VALUES (?, ?, ?, ?)`,
          [idAgendamento, servico.id || 0, servico.nome, servico.preco || 0]
        );
      }
    }

    await run("COMMIT");
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

// Funcao principal para inicializar banco no startup do servidor.
async function inicializarBanco() {
  await criarTabelas();
  await aplicarMigracoes();
  await popularComSeedSeNecessario();
}

module.exports = {
  db,
  run,
  get,
  all,
  inicializarBanco
};
