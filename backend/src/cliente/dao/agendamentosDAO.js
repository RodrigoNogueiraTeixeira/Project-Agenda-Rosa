const { all, get, run, transaction } = require("../../config/database");

/**
 * FUNÇÃO: criarAgendamento
 * OBJETIVO: Salva o "cabeçalho" do agendamento (dados do cliente, data, hora) na tabela principal, 
 * e depois varre o "carrinho de compras" salvando os serviços na tabela filha.
 * Usa 'transaction' para garantir que ou salva tudo, ou não salva nada (evita dados pela metade se der erro).
 */
async function criarAgendamento({
  clienteId, estabelecimentoId, estabelecimentoNome, data, horario, profissional, observacoes, total, horarioFim, servicos,
  // Campos de compatibilidade com o painel da empresa:
  empresaId = null, servicoId = null, profissionalId = null, nomeCliente = null, telefoneCliente = null, emailCliente = null, dataAgendamento = null, horarioInicio = null
}) {
  // 'transaction': Abre uma transação. Se a luz cair na metade, o banco apaga tudo que foi feito aqui dentro.
  return transaction(async (tx) => {
    
    // =====================================================================
    // INSERT 1: A "CAPA" DO AGENDAMENTO (TABELA PAI)
    // =====================================================================
    // Por que tem dois inserts? Porque bancos de dados relacionais dividem as informações.
    // Este primeiro INSERT cria a "Ficha de Atendimento" (A Capa). 
    // Ele salva QUEM é o cliente, QUANDO ele vai, ONDE ele vai e QUANTO vai pagar.
    // Mas repare: ele NÃO salva o que a cliente vai fazer (Corte, Unha, etc).
    // =====================================================================
    const resultadoInsert = await tx.run(
      `
        INSERT INTO agendamentos (
          cliente_id, estabelecimento_id, estabelecimento_nome, data, horario, profissional, observacoes, total, horario_fim, status, criado_em, empresa_id, servico_id, profissional_id, nome_cliente, telefone_cliente, email_cliente, data_agendamento, horario_inicio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        clienteId, estabelecimentoId, estabelecimentoNome, data, horario, profissional, observacoes, total, horarioFim,
        "pendente", // Todo agendamento nasce como pendente (aguardando a data chegar ou pagamento aprovar).
        new Date().toISOString(), // Grava a hora exata em que o botão foi clicado.
        empresaId, servicoId, profissionalId, nomeCliente, telefoneCliente, emailCliente, dataAgendamento, horarioInicio
      ]
    );

    // Pega o número da ficha que acabou de ser criada no INSERT 1 (Ex: Agendamento nº 50).
    const agendamentoId = resultadoInsert.lastID;

    // =====================================================================
    // INSERT 2: OS "ITENS DO CARRINHO" (TABELA FILHA)
    // =====================================================================
    // Lembra que a "Capa" não dizia quais eram os serviços? É para isso que serve este segundo INSERT.
    // O sistema faz um Loop (for) varrendo todos os serviços que a cliente escolheu (Corte, Barba, Unha).
    // E para CADA serviço, ele faz um INSERT novo na tabela 'agendamento_servicos', 
    // colando neles o ID da "Capa" (agendamento_id = 50) para mostrar que esses itens pertencem àquela ficha.
    // =====================================================================
    for (const servico of servicos) {
      await tx.run(
        `
          INSERT INTO agendamento_servicos (agendamento_id, servico_id, nome, preco)
          VALUES (?, ?, ?, ?)
        `,
        [agendamentoId, servico.id, servico.nome, servico.preco]
      );
    }

    // Retorna o número da ficha para quem chamou a função.
    return agendamentoId;
  });
}

/**
 * FUNÇÃO: listarPorCliente
 * OBJETIVO: Traz todo o histórico de agendamentos de uma pessoa. 
 * Também faz uma busca lateral (LEFT JOIN e SubQuery) para trazer as coordenadas do salão e o link de pagamento.
 */
async function listarPorCliente(clienteId) {
  // 'all': Pede para o banco retornar VÁRIAS linhas de resultado.
  return all(
    `
      SELECT
        a.id, a.cliente_id, a.estabelecimento_id, a.estabelecimento_nome, a.data, a.horario, a.profissional, a.observacoes, a.total, a.status, a.criado_em, a.cancelado_em,
        -- Puxa as coordenadas e endereço lá da tabela de Salões.
        e.latitude as estabelecimento_lat, e.longitude as estabelecimento_lng, e.endereco as estabelecimento_endereco,
        -- SUB-QUERY: Procura lá na tabela de Pagamentos se existe um Link de pagamento gerado pro cliente. Traz apenas 1 (o mais recente).
        (SELECT init_point FROM pagamentos p WHERE p.agendamento_id = a.id ORDER BY p.id DESC LIMIT 1) as pagamento_url
      FROM agendamentos a
      -- Junta a tabela de Salões onde o ID do salão bate com o ID do agendamento.
      LEFT JOIN estabelecimentos e ON a.estabelecimento_id = e.id
      -- Filtra só os agendamentos desse cliente específico.
      WHERE a.cliente_id = ?
      -- Ordena do mais recente para o mais antigo.
      ORDER BY a.id DESC
    `,
    [clienteId] // Troca o '?' por esse ID.
  );
}

/**
 * FUNÇÃO: listarServicosPorAgendamentos
 * OBJETIVO: Dada uma lista de "Fichas" de agendamento (IDs), busca todos os serviços prestados em cada um deles.
 */
async function listarServicosPorAgendamentos(agendamentoIds) {
  // Se não mandaram nenhum ID, já retorna uma lista vazia pra não quebrar o banco de dados.
  if (!agendamentoIds || agendamentoIds.length === 0) {
    return [];
  }

  // Se tem 3 IDs na lista, isso cria a string "?, ?, ?" para injetar no código SQL com segurança.
  const marcadores = agendamentoIds.map(() => "?").join(", ");

  // 'all': Busca todas as linhas que baterem.
  return all(
    `
      SELECT id, agendamento_id, servico_id, nome, preco
      FROM agendamento_servicos
      -- 'IN': Comando SQL que busca todos os serviços que pertencem a qualquer ID dentro dos parênteses.
      WHERE agendamento_id IN (${marcadores})
      ORDER BY id ASC
    `,
    agendamentoIds // Injeta os valores reais no lugar dos '?'
  );
}

/**
 * FUNÇÃO: buscarPorId
 * OBJETIVO: Função simples. Pega o número de uma ficha e devolve as informações básicas dela.
 */
async function buscarPorId(id) {
  // 'get': Diferente do 'all', ele pede para o banco retornar APENAS UMA linha (o primeiro que achar).
  return get(
    `
      SELECT id, cliente_id, estabelecimento_id, estabelecimento_nome, total, status
      FROM agendamentos
      WHERE id = ?
    `,
    [id]
  );
}

// Verifica se ja existe agendamento ativo no mesmo horario do estabelecimento (e profissional).
/**
 * FUNÇÃO: existeConflitoDeHorario
 * OBJETIVO: É a proteção máxima contra "Overbooking". Olha a agenda e diz Verdadeiro ou Falso se houver choque de horário.
 */
async function existeConflitoDeHorario({ estabelecimentoId, data, horario, horarioFim, profissionalId = null }) {
  // SITUAÇÃO 1: A cliente EXIGIU uma profissional específica.
  if (profissionalId && profissionalId !== "qualquer" && profissionalId !== "") {
    // Vai na agenda e tenta encontrar pelo menos 1 cliente na mesma hora com essa mesma profissional.
    const conflito = await get(
      `
        SELECT id
        FROM agendamentos
        WHERE estabelecimento_id = ?
          
          -- =========================================================
          -- A FUNÇÃO 'COALESCE': O PLANO 'B' AUTOMÁTICO DO BANCO
          -- O COALESCE tenta ler a primeira coluna (data). 
          -- Se ela estiver vazia, ele pula pra segunda (data_agendamento).
          -- Isso serve para misturar agendamentos antigos do sistema com os novos sem dar erro!
          -- =========================================================
          AND COALESCE(data, data_agendamento) = ?
          
          -- Considera ocupado se estiver agendado/concluído OU se estiver pendente há menos de 15 minutos (Esperando pagar).
          AND (
            status IN ('agendado', 'confirmado', 'concluido', 'realizado')
            OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
          )
          -- Garante que está olhando a agenda EXATA daquela profissional.
          AND (
            profissional_id = ? 
            OR profissional = (SELECT nome FROM profissionais WHERE id = ?)
          )
          
          -- A LÓGICA DO CHOQUE DE HORÁRIOS: Se meu início esbarra no seu fim.
          -- Aqui usamos COALESCE de novo: Tenta o "horario" antigo, se não tiver, usa o "horario_inicio" novo.
          AND (
            (? < horario_fim AND ? > COALESCE(horario, horario_inicio))
            OR (horario_fim IS NULL AND COALESCE(horario, horario_inicio) = ?)
          )
        LIMIT 1
      `,
      [
        estabelecimentoId, data, Number(profissionalId), Number(profissionalId), horario, horarioFim, horario
      ]
    );
    // Transforma o resultado num Booleano (Verdadeiro = Tem conflito).
    return Boolean(conflito);
  }

  // SITUAÇÃO 2: A cliente disse "Qualquer uma". O sistema precisa achar pelo menos UMA funcionária livre.
  const estabelecimentosDAO = require("./estabelecimentosDAO");
  // Puxa a lista de toda a equipe do salão.
  const profissionais = await estabelecimentosDAO.listarProfissionaisPorEstabelecimento(estabelecimentoId);

  // Se o salão não tiver ninguém cadastrado, tenta fazer o teste para o salão "em geral".
  if (profissionais.length === 0) {
    // ====================================================================================
    // OBJETIVO DA CONSULTA:
    // Esta consulta serve para verificar se já existe algum agendamento no mesmo horário
    // para estabelecimentos que NÃO possuem profissionais cadastrados. Como não há uma equipe
    // individualizada cadastrada, o salão é tratado como uma agenda única (uma única vaga/cadeira por horário).
    // A consulta busca por qualquer compromisso ativo ou pendente (em pagamento via Pix por até 
    // 15 minutos) que choque com o horário desejado. Se encontrar algo, significa que o horário
    // está ocupado, evitando que o salão sofra "Overbooking" (venda duplicada do mesmo horário).
    // ====================================================================================
    const conflito = await get(
      `
        -- Linha 1: É a ordem de busca. "Vá na gaveta de agendamentos e me traga apenas o ID (número da ficha)"
        SELECT id FROM agendamentos
        
        -- Linha 2: "Regra 1: Tem que ser da agenda DESSE salão específico."
        WHERE estabelecimento_id = ? 
        
        -- Linha 3: "Regra 2: O agendamento precisa ser exatamente para essa DATA que a cliente escolheu."
          AND COALESCE(data, data_agendamento) = ?
          
          -- Linha 4 e 5: "Regra 3: Essa vaga na agenda só é considerada 'ocupada' se o status for Agendado, Confirmado ou Concluiu".
          AND (
            status IN ('agendado', 'confirmado', 'concluido', 'realizado')
            
            -- Linha 6 e 7: "Regra 4 (A regra de Ouro do E-commerce): E se tiver alguém tentando pagar o Pix AGORA?" 
            -- (Segura a vaga por 15 minutos).
            OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
          )
          
          -- Linha 8 e 9: "Regra 5 (Choque de Horários):"
          -- Meu início (15h) é MENOR que o Fim de quem já está lá? E o meu Fim (16h) é MAIOR que o início de quem já está lá?
          -- Dois corpos não ocupam o mesmo espaço = CONFLITO!
          AND (
            (? < horario_fim AND ? > COALESCE(horario, horario_inicio))
            
            -- Linha 10 e 11: "Regra 5.1 (Plano de emergência):" Se o cliente que já está lá NÃO tiver horário de fim cadastrado (NULL).
            OR (horario_fim IS NULL AND COALESCE(horario, horario_inicio) = ?)
          )
          
        -- Linha 12: Regra de performance pura. Achou 1 conflito, pare de procurar.
        LIMIT 1
      `,
      // Linha 13 e 14: Aqui é o Javascript "injetando" as variáveis reais nos pontos de interrogação acima.
      [estabelecimentoId, data, horario, horarioFim, horario]
    );
    // Linha 15: Converte a resposta pra Verdadeiro (tem conflito) ou Falso (vaga livre).
    return Boolean(conflito);
  }

  // Para cada membro da equipe...
  for (const prof of profissionais) {
    // ====================================================================================
    // OBJETIVO DA CONSULTA:
    // Como a cliente selecionou "Qualquer Profissional", o sistema realiza esta consulta
    // em um laço ('for') testando cada integrante da equipe por vez.
    // O objetivo é verificar se a profissional específica ('prof') possui algum conflito de
    // horário na agenda dela para a data e faixa de horário desejadas.
    // Se a consulta retornar vazio (nenhum conflito para esta profissional), o sistema para
    // a busca e reserva o horário com ela, pois encontrou pelo menos uma pessoa livre.
    // ====================================================================================
    const conflitoProf = await get(
      `
        -- Linha 1: "Vá na gaveta de agendamentos e traga o ID caso exista conflito."
        SELECT id FROM agendamentos
        
        -- Linha 2: "Regra 1: Tem que ser um agendamento nesse salão..."
        WHERE estabelecimento_id = ? 
        
        -- Linha 3: "... e na data escolhida (usando COALESCE para compatibilidade com dados antigos)."
          AND COALESCE(data, data_agendamento) = ?
          
          -- Linha 4 e 5: "Regra 2: O agendamento anterior precisa estar ativo (agendado, confirmado, concluído)..."
          AND (
            status IN ('agendado', 'confirmado', 'concluido', 'realizado')
            
            -- Linha 6 e 7: "... ou pendente de pagamento por Pix há menos de 15 minutos."
            OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
          )
          
          -- Linha 8: "Regra 3 (O Filtro da Profissional): Verifica se o agendamento pertence a esta profissional específica da vez (por ID ou Nome)."
          AND (profissional_id = ? OR profissional = ?)
          
          -- Linha 9 e 10: "Regra 4 (Choque de Horários):"
          -- Meu início é antes do fim do agendamento que já está lá, E meu fim é depois do início do agendamento que já está lá.
          AND (
            (? < horario_fim AND ? > COALESCE(horario, horario_inicio))
            
            -- Linha 11: "Regra 4.1 (Caso o agendamento existente não tenha horário de fim registrado)."
            OR (horario_fim IS NULL AND COALESCE(horario, horario_inicio) = ?)
          )
          
        -- Linha 12: Regra de performance. Achou 1 conflito na agenda dela, pare de procurar.
        LIMIT 1
      `,
      // Linha 13 e 14: Aqui passamos os parâmetros da consulta, incluindo o ID e o Nome da profissional da vez.
      [estabelecimentoId, data, prof.id, prof.nome, horario, horarioFim, horario]
    );

    // Se bater nessa linha e NÃO tiver conflito, significa que ESSA funcionária está livre!
    if (!conflitoProf) {
      // Como a cliente pediu "qualquer uma", não importa quem é. Se tem vaga, retorna FALSO (Não há conflito).
      return false; 
    }
  }

  // Se testou a equipe inteira e ninguém tá livre, retorna VERDADEIRO (Overbooking).
  return true; 
}

/**
 * FUNÇÃO: listarHorariosOcupados
 * OBJETIVO: Retorna a lista de horas (Ex: 14:00 às 15:00, 16:00 às 17:00) que já estão tomadas no dia.
 * Isso alimenta o calendário do app, desabilitando horários que já estão reservados para que o cliente não os escolha.
 */
async function listarHorariosOcupados(estabelecimentoId, data, profissionalId = null) {
  // ====================================================================================
  // OBJETIVO DA CONSULTA:
  // Esta consulta busca todos os registros de agendamento ativos (ou pendentes de pagamento recente)
  // para um estabelecimento na data escolhida, de forma a retornar quais horários e profissionais
  // estão ocupados. Caso um profissional específico seja solicitado, a consulta é estendida
  // dinamicamente para filtrar apenas a agenda dele.
  // ====================================================================================
  let query = `
    SELECT 
      -- Linha 1: Seleciona o horário de início (tenta 'horario', se for nulo usa 'horario_inicio').
      COALESCE(horario, horario_inicio) AS horario, 
      -- Linha 2: Puxa o horário de término, o ID da profissional e o Nome da profissional.
      horario_fim, profissional_id, profissional
    -- Linha 3: Busca na tabela central de agendamentos.
    FROM agendamentos
    -- Linha 4: Filtra os agendamentos pertencentes a este salão específico.
    WHERE estabelecimento_id = ?
      -- Linha 5: Filtra agendamentos da data pretendida (compatibilizando data e data_agendamento).
      AND COALESCE(data, data_agendamento) = ?
      -- Linha 6 e 7: Filtra agendamentos ativos ou em processo de pagamento recente (15 minutos de tolerância).
      AND (
        status IN ('agendado', 'confirmado', 'concluido', 'realizado')
        OR (status = 'pendente' AND criado_em::timestamptz >= NOW() - INTERVAL '15 minutes')
      )
  `;
  
  // Cria a lista inicial de parâmetros que vão substituir os pontos de interrogação (?) no banco de dados.
  const params = [estabelecimentoId, data];

  // Se a busca for de uma profissional específica, "cola" mais uma condição no final do código SQL.
  if (profissionalId && profissionalId !== "qualquer") {
    // Adiciona o filtro dinâmico de profissional_id ou pelo nome correspondente na tabela de profissionais.
    query += " AND (profissional_id = ? OR profissional = (SELECT nome FROM profissionais WHERE id = ?))";
    // E empurra o ID dela para a lista de substituições do '?'.
    params.push(Number(profissionalId), Number(profissionalId));
  }

  // Roda a consulta gigante no banco de dados trazendo todas as linhas (rows).
  const rows = await all(query, params);
  
  // Limpa o resultado devolvendo um array bonitinho apenas com os horários que importam.
  return rows.map((row) => ({
    horario: row.horario,
    horario_fim: row.horario_fim,
    profissionalId: row.profissional_id,
    profissional: row.profissional
  }));
}

/**
 * FUNÇÃO: cancelarPorId
 * OBJETIVO: Atualiza a ficha do cliente trocando a etiqueta para "Cancelado".
 */
async function cancelarPorId(id) {
  // 'run': Executa uma ação de escrita (Modificação) no banco.
  const resultado = await run(
    `
      UPDATE agendamentos
      SET status = ?, cancelado_em = ?, atualizado_em = ?
      WHERE id = ?
    `,
    // Injeta a palavra "cancelado" e as datas exatas do relógio de agora.
    ["cancelado", new Date().toISOString(), new Date().toISOString(), id]
  );

  // Retorna quantas linhas foram alteradas (se retornar 1, deu certo).
  return resultado.changes;
}

/**
 * FUNÇÃO: atualizarStatus
 * OBJETIVO: Função genérica para mudar a etiqueta do agendamento (Ex: de 'pendente' para 'confirmado' quando o Pix cai).
 */
async function atualizarStatus(id, status) {
  const resultado = await run(
    `
      UPDATE agendamentos
      SET status = ?, atualizado_em = ?
      WHERE id = ?
    `,
    [status, new Date().toISOString(), id]
  );
  return resultado.changes;
}

// Exporta todas essas funções para o Repositório poder usá-las.
module.exports = {
  criarAgendamento, listarPorCliente, listarServicosPorAgendamentos, buscarPorId, cancelarPorId, existeConflitoDeHorario, listarHorariosOcupados, atualizarStatus
};
