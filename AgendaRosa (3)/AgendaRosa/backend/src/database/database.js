const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const databaseDirectory = path.resolve(__dirname, "../../data");
const databasePath = path.join(databaseDirectory, "agenda-rosa.sqlite");
const schemaPath = path.resolve(__dirname, "schema.sql");

// Abre a conexao com o SQLite e cria a pasta do banco caso ela ainda nao exista.
function openDatabase() {
  if (!fs.existsSync(databaseDirectory)) {
    fs.mkdirSync(databaseDirectory, { recursive: true });
  }

  return new sqlite3.Database(databasePath);
}

// Executa um bloco de SQL no banco, como o schema inicial.
function runSql(db, sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

// Fecha a conexao com o banco apos a operacao.
function closeDatabase(db) {
  return new Promise((resolve, reject) => {
    db.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

// Consulta a estrutura de uma tabela para verificar se uma coluna existe.
function getTableColumns(db, tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (error, rows) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(rows.map((row) => row.name));
    });
  });
}

// Adiciona uma coluna quando o banco local ja existe e o schema evoluiu.
async function addColumnIfMissing(db, tableName, columnName, columnDefinition) {
  const columns = await getTableColumns(db, tableName);

  if (!columns.includes(columnName)) {
    await runSql(db, `ALTER TABLE ${tableName} ADD COLUMN ${columnDefinition}`);
  }
}

// Mantem bancos ja criados atualizados com pequenas mudancas de schema.
async function runMigrations(db) {
  await addColumnIfMissing(
    db,
    "bloqueios_horarios",
    "profissional_nome",
    "profissional_nome TEXT"
  );

  await addColumnIfMissing(db, "profissionais", "telefone", "telefone TEXT");
  await addColumnIfMissing(db, "profissionais", "email", "email TEXT");
  await addColumnIfMissing(db, "profissionais", "especialidade", "especialidade TEXT");
  await addColumnIfMissing(
    db,
    "profissionais",
    "atualizado_em",
    "atualizado_em TEXT DEFAULT CURRENT_TIMESTAMP"
  );
}

// Inicializa o banco lendo o schema e aplicando migracoes simples.
async function initializeDatabase() {
  const db = openDatabase();
  const schema = fs.readFileSync(schemaPath, "utf8");

  try {
    await runSql(db, schema);
    await runMigrations(db);
  } finally {
    await closeDatabase(db);
  }
}

// Entrega uma nova conexao para os Models executarem consultas.
function getDatabase() {
  return openDatabase();
}

module.exports = {
  getDatabase,
  initializeDatabase,
};
