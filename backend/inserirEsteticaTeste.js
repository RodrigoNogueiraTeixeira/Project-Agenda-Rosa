require("dotenv").config();
const { run, get, transaction } = require("./src/config/database");

async function inserirEsteticaTeste() {
  console.log("Iniciando a inserção da Clínica de Estética Feminina para testes...");

  await transaction(async (tx) => {
    // 1. Inserir a empresa para podermos associar profissionais e serviços
    const emailEmpresa = "esteticateste@agendarosa.com";
    
    // Verifica se já existe a empresa
    let empresa = await tx.get("SELECT id FROM empresas WHERE email = ?", [emailEmpresa]);
    let empresaId;
    
    if (empresa) {
      empresaId = empresa.id;
      console.log(`⚠️ Empresa de testes já existente com ID: ${empresaId}`);
    } else {
      const resultadoEmpresa = await tx.run(`
        INSERT INTO empresas (
          nome_responsavel, telefone, email, nome_estabelecimento, senha_hash, 
          categoria_principal, status_aprovacao, cidade, bairro, endereco
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        "Responsável Estética",
        "(11) 98888-8888",
        emailEmpresa,
        "Clínica Estética Feminina (Testes)",
        "senha_hash_fake_123", 
        "Estética",
        "aprovada",
        "São Paulo",
        "Centro",
        "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP"
      ]);
      empresaId = resultadoEmpresa.lastID;
      console.log(`✅ Empresa de testes criada com ID: ${empresaId}`);
    }

    // 2. Inserir o estabelecimento
    // Verifica se já existe
    let est = await tx.get("SELECT id FROM estabelecimentos WHERE nome = ? LIMIT 1", ["Clínica Estética Feminina (Testes)"]);
    let estabelecimentoId;
    
    if (est) {
      estabelecimentoId = est.id;
      console.log(`⚠️ Estabelecimento de testes já existente com ID: ${estabelecimentoId}`);
      await tx.run("UPDATE estabelecimentos SET empresa_id = ? WHERE id = ?", [empresaId, estabelecimentoId]);
    } else {
      const resultadoEst = await tx.run(`
        INSERT INTO estabelecimentos (empresa_id, nome, cidade, bairro, endereco, cep, logo_url, latitude, longitude)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        empresaId,
        "Clínica Estética Feminina (Testes)",
        "São Paulo",
        "Bela Vista",
        "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP",
        "01310-100",
        "https://picsum.photos/seed/esteticateste/320/180",
        -23.561506,
        -46.656139
      ]);
      estabelecimentoId = resultadoEst.lastID;
      console.log(`✅ Estabelecimento criado com ID: ${estabelecimentoId}`);
      
      // Inserir tipo de estabelecimento
      await tx.run(`INSERT INTO estabelecimento_tipos (estabelecimento_id, tipo) VALUES (?, ?)`, [estabelecimentoId, "estética"]);
      console.log(`✅ Tipos vinculados ao estabelecimento!`);
    }

    // 3. Inserir profissionais de teste
    // Limpa profissionais antigos da empresa para reinserir limpo
    await tx.run("DELETE FROM profissionais WHERE empresa_id = ?", [empresaId]);
    
    const profs = [
      { nome: "Juliana Esteticista", especialidade: "Estética Facial" },
      { nome: "Patrícia Fisioterapeuta", especialidade: "Estética Corporal" }
    ];
    
    const profIds = {};
    for (const p of profs) {
      const resProf = await tx.run(`
        INSERT INTO profissionais (empresa_id, nome, especialidade, ativo)
        VALUES (?, ?, ?, 1)
      `, [empresaId, p.nome, p.especialidade]);
      profIds[p.nome] = resProf.lastID;
    }
    console.log(`✅ Profissionais de testes criados!`);

    // 4. Inserir serviços de 1 Real com a categoria "Estética Feminino"
    // Limpa serviços antigos do estabelecimento para reinserir limpo
    await tx.run("DELETE FROM servicos WHERE estabelecimento_id = ?", [estabelecimentoId]);

    const servicos = [
      { nome: "Limpeza de Pele Express (Estética)", preco: 1.00, duracao: 30, categoria: "Estética facial" },
      { nome: "Design de Sobrancelhas (Estética)", preco: 1.00, duracao: 40, categoria: "Estética facial" },
      { nome: "Massagem Facial Relaxante (Estética)", preco: 1.00, duracao: 30, categoria: "Estética facial" },
      { nome: "Drenagem Linfática Localizada (Estética)", preco: 1.00, duracao: 50, categoria: "Estética corporal" }
    ];

    for (const s of servicos) {
      const resServ = await tx.run(`
        INSERT INTO servicos (estabelecimento_id, empresa_id, nome, preco, preco_centavos, categoria, duracao_minutos, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        estabelecimentoId,
        empresaId,
        s.nome,
        s.preco,
        100, // 100 centavos = 1 real
        s.categoria,
        s.duracao,
        "ativo"
      ]);
      const servicoId = resServ.lastID;

      // Vincula o profissional apropriado no profissional_servicos
      if (s.categoria === "Estética facial" && profIds["Juliana Esteticista"]) {
        await tx.run(`
          INSERT INTO profissional_servicos (profissional_id, servico_id)
          VALUES (?, ?)
        `, [profIds["Juliana Esteticista"], servicoId]);
      } else if (s.categoria === "Estética corporal" && profIds["Patrícia Fisioterapeuta"]) {
        await tx.run(`
          INSERT INTO profissional_servicos (profissional_id, servico_id)
          VALUES (?, ?)
        `, [profIds["Patrícia Fisioterapeuta"], servicoId]);
      }
    }
    console.log(`✅ ${servicos.length} serviços de R$ 1,00 cadastrados e vinculados aos profissionais!`);
  });

  console.log("🎉 Clínica de Estética Feminina para testes cadastrada com sucesso!");
  process.exit(0);
}

inserirEsteticaTeste().catch((erro) => {
  console.error("❌ Erro ao inserir clínica de testes:", erro);
  process.exit(1);
});
