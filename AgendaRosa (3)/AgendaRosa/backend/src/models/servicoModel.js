const { getDatabase } = require("../database/database");

// Executa comandos INSERT, UPDATE e DELETE no SQLite.
function executar(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function callback(error) {
      if (error) {
        reject(error);
        return;
      }

      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

// Consulta uma lista de registros no SQLite.
function consultarTodos(db, sql, params = []) {
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

// Consulta apenas um registro no SQLite.
function consultarUm(db, sql, params = []) {
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

// Fecha a conexao com o banco ao fim da operacao.
function fechar(db) {
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

// Formata os campos do banco para nomes mais amigaveis no JavaScript.
function selecionarCamposServico() {
  return `SELECT
    id,
    empresa_id AS empresaId,
    nome,
    categoria,
    preco_centavos AS precoCentavos,
    duracao_minutos AS duracaoMinutos,
    descricao,
    status,
    criado_em AS criadoEm,
    atualizado_em AS atualizadoEm
  FROM servicos`;
}

// Lista todos os servicos cadastrados por uma empresa.
async function listarPorEmpresa(empresaId) {
  const db = getDatabase();

  try {
    return await consultarTodos(
      db,
      `${selecionarCamposServico()}
      WHERE empresa_id = ?
      ORDER BY nome`,
      [empresaId]
    );
  } finally {
    await fechar(db);
  }
}

// Busca um servico especifico por ID e empresa.
async function buscarPorId(id, empresaId) {
  const db = getDatabase();

  try {
    return await consultarUm(
      db,
      `${selecionarCamposServico()}
      WHERE id = ? AND empresa_id = ?`,
      [id, empresaId]
    );
  } finally {
    await fechar(db);
  }
}

// Cadastra um novo servico para a empresa.
async function criar(dados) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
      `INSERT INTO servicos (
        empresa_id,
        nome,
        categoria,
        preco_centavos,
        duracao_minutos,
        descricao,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        dados.empresaId,
        String(dados.nome).trim(),
        String(dados.categoria).trim(),
        dados.precoCentavos,
        dados.duracaoMinutos,
        dados.descricao ? String(dados.descricao).trim() : null,
        dados.status,
      ]
    );

    return await buscarPorId(resultado.id, dados.empresaId);
  } finally {
    await fechar(db);
  }
}

// Atualiza um servico existente, respeitando o vinculo com a empresa.
async function atualizar(id, dados) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
      `UPDATE servicos
      SET
        nome = ?,
        categoria = ?,
        preco_centavos = ?,
        duracao_minutos = ?,
        descricao = ?,
        status = ?,
        atualizado_em = CURRENT_TIMESTAMP
      WHERE id = ? AND empresa_id = ?`,
      [
        String(dados.nome).trim(),
        String(dados.categoria).trim(),
        dados.precoCentavos,
        dados.duracaoMinutos,
        dados.descricao ? String(dados.descricao).trim() : null,
        dados.status,
        id,
        dados.empresaId,
      ]
    );

    if (resultado.changes === 0) {
      return null;
    }

    return await buscarPorId(id, dados.empresaId);
  } finally {
    await fechar(db);
  }
}

// Exclui um servico da empresa.
async function excluir(id, empresaId) {
  const db = getDatabase();

  try {
    const resultado = await executar(
      db,
      "DELETE FROM servicos WHERE id = ? AND empresa_id = ?",
      [id, empresaId]
    );

    return resultado.changes > 0;
  } finally {
    await fechar(db);
  }
}

// Exporta as operacoes de banco usadas pelo controller de servicos.
module.exports = {
  listarPorEmpresa,
  criar,
  atualizar,
  excluir,
};
