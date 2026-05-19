const { run, get, all } = require("./src/config/database");

async function cadastrarUsuario() {
  const nome = "Rodrigo";
  const email = "rodrigo@agendarosa.com";
  const senha = "123";
  const telefone = "(11) 99999-9999";
  const cidade = "São Paulo";
  const bairro = "Centro";

  console.log("--- INICIANDO INTEGRAÇÃO DO BANCO ---");

  // 1. Verifica se o usuário já existe
  const usuarioExistente = await get("SELECT * FROM clientes WHERE email = ?", [email]);

  if (usuarioExistente) {
    console.log(`⚠️ Usuário já cadastrado! Atualizando dados de: ${email}`);
    await run(
      "UPDATE clientes SET nome = ?, senha = ?, telefone = ?, cidade = ?, bairro = ? WHERE email = ?",
      [nome, senha, telefone, cidade, bairro, email]
    );
  } else {
    console.log(`✨ Cadastrando novo usuário: ${email}`);
    await run(
      "INSERT INTO clientes (nome, email, senha, telefone, cidade, bairro) VALUES (?, ?, ?, ?, ?, ?)",
      [nome, email, senha, telefone, cidade, bairro]
    );
  }

  // 2. Imprime todos os usuários cadastrados
  const usuarios = await all("SELECT id, nome, email, senha, telefone, cidade, bairro FROM clientes");
  console.log("\n--- CLIENTES ATUALMENTE CADASTRADOS NO BANCO ---");
  console.table(usuarios);
}

cadastrarUsuario().catch(console.error);
