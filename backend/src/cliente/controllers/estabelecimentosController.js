const estabelecimentosRepository = require("../repositories/estabelecimentosRepository");
const agendamentosDAO = require("../dao/agendamentosDAO");

// GET /api/estabelecimentos
// Retorna a lista de estabelecimentos aplicando filtros opcionais e paginação.
async function listar(req, res) {
  try {
    // 1. Extração dos parâmetros da requisição (Query String):
    // - cidade, bairro, tipo: critérios de filtragem do usuário.
    // - q: busca textual pelo nome do estabelecimento (mapeado como 'busca').
    // - page, limit: parâmetros numéricos para controle de paginação.
    const resultado = await estabelecimentosRepository.listarEstabelecimentosComFiltro({
      cidade: req.query.cidade,
      bairro: req.query.bairro,
      tipo: req.query.tipo,
      busca: req.query.q,
      page: req.query.page,
      limit: req.query.limit
    });

    // 2. Resposta de Sucesso:
    // Retorna HTTP Status 200 (OK) enviando os dados estruturados no formato JSON para o frontend.
    res.status(200).json(resultado);
  } catch (error) {
    // 3. Tratamento de Exceções:
    // Caso ocorra alguma falha na busca, retorna HTTP Status 500 (Erro Interno do Servidor) com detalhes técnicos.
    res.status(500).json({ erro: "Erro ao buscar estabelecimentos.", detalhes: error.message });
  }
}

// GET /api/estabelecimentos/:id
// Busca e retorna as informações detalhadas de um único estabelecimento pelo seu ID.
async function buscarPorId(req, res) {
  try {
    // 1. Extração do parâmetro de rota (ID):
    // req.params.id captura a variável informada diretamente na URL (ex: /api/estabelecimentos/5).
    const estabelecimento = await estabelecimentosRepository.buscarEstabelecimentoPorId(req.params.id);

    // 2. Validação de Existência:
    // Se o repositório retornar nulo ou indefinido, significa que o ID procurado não existe no banco de dados.
    if (!estabelecimento) {
      // Retorna HTTP Status 404 (Não Encontrado) informando o erro ao cliente.
      res.status(404).json({ erro: "Estabelecimento nao encontrado." });
      return; // Interrompe a execução para não prosseguir para a resposta de sucesso.
    }

    // 3. Resposta de Sucesso:
    // Retorna HTTP Status 200 (OK) enviando o objeto completo do estabelecimento encontrado.
    res.status(200).json(estabelecimento);
  } catch (error) {
    // 4. Tratamento de Exceções:
    // Retorna HTTP Status 500 em caso de erro de conexão com o banco ou falha interna do sistema.
    res.status(500).json({ erro: "Erro ao buscar estabelecimento.", detalhes: error.message });
  }
}

// GET /api/estabelecimentos/:id/horarios-ocupados?data=YYYY-MM-DD
// Lista todos os blocos de horários que já possuem agendamentos confirmados em uma determinada data.
async function horariosOcupados(req, res) {
  try {
    // 1. Extração do parâmetro 'data' enviado via query:
    const data = req.query.data;
    
    // 2. Validação de Parâmetro Obrigatório:
    // Se o frontend não enviar o parâmetro '?data=...', a busca não pode prosseguir.
    if (!data) {
      // Retorna HTTP Status 400 (Requisição Ruim/Inválida) exigindo o campo de data.
      res.status(400).json({ erro: "A data e obrigatoria." });
      return;
    }
    
    // 3. Consulta de Agendamentos:
    // Acessa diretamente a camada de banco de dados (DAO) buscando os compromissos agendados para a loja e data informadas.
    const ocupados = await agendamentosDAO.listarHorariosOcupados(req.params.id, data);
    
    // 4. Resposta de Sucesso:
    // Retorna HTTP Status 200 com a lista de horários ocupados (para que o front-end desabilite esses slots no calendário).
    res.status(200).json({ ocupados });
  } catch (error) {
    // 5. Tratamento de Exceções:
    res.status(500).json({ erro: "Erro ao buscar horarios ocupados.", detalhes: error.message });
  }
}

// GET /api/estabelecimentos/:id/horarios-disponiveis?data=YYYY-MM-DD&duracao=30&profissionalId=123
// Calcula e lista dinamicamente os horários livres para agendamento, combinando a agenda da loja e profissionais.
async function horariosDisponiveis(req, res) {
  try {
    // 1. Extração e Normalização dos parâmetros de consulta:
    const data = req.query.data;
    // Converte a duração desejada para número inteiro; se não for fornecida, assume o padrão de 30 minutos.
    const duracaoMinutos = Number(req.query.duracao) || 30;
    // Identificador opcional do profissional desejado (se o cliente quiser agendar com alguém específico).
    const profissionalId = req.query.profissionalId || null;

    // 2. Validação da Data:
    if (!data) {
      res.status(400).json({ erro: "A data e obrigatoria." });
      return;
    }

    // 3. Validação de Formato e Regras de Negócio (Segurança de Entrada):
    // POR QUE FAZEMOS ISSO? 
    // - O banco de dados (SQLite) e as bibliotecas de datas exigem estritamente o formato ISO "AAAA-MM-DD".
    //   Se o front-end enviar algo corrompido (ex: "hoje", "12/06/2026", "2026/06/12" ou tentativas de injeção de código),
    //   as funções matemáticas do repositório vão falhar ou retornar erros internos (500).
    //
    // O QUE SIGNIFICA A EXPRESÃO REGULAR (REGEX) `/^\d{4}-\d{2}-\d{2}$/`?
    // - `/` ... `/`: Delimitadores que abrem e fecham a expressão regular no JavaScript.
    // - `^`: Exige que a validação comece exatamente a partir do início da string (evita texto extra no início).
    // - `\d{4}`: Exige exatamente 4 caracteres numéricos (dígitos) para o Ano (ex: 2026).
    // - `-`: Exige um hífen literal após o ano.
    // - `\d{2}`: Exige exatamente 2 caracteres numéricos para o Mês (ex: 06).
    // - `-`: Exige outro hífen literal.
    // - `\d{2}`: Exige exatamente 2 caracteres numéricos para o Dia (ex: 12).
    // - `$`: Exige que a string termine imediatamente após os dígitos do dia (impede texto extra no final).
    // - `.test(data)`: Função do JavaScript que avalia se a variável 'data' se encaixa nesse padrão (retorna true ou false).
    //
    // TAMBÉM VALIDAMOS A DURAÇÃO DO SERVIÇO:
    // - 'duracaoMinutos <= 0': Garante que o agendamento não tenha tempo nulo ou negativo.
    // - 'duracaoMinutos > 720': Define um teto de segurança de 12 horas (720 minutos) por agendamento.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || duracaoMinutos <= 0 || duracaoMinutos > 720) {
      // Retorna 400 (Bad Request) se a data não estiver no padrão ou se a duração for irreal.
      res.status(400).json({ erro: "Data ou duracao invalida." });
      return;
    }

    // 4. Cálculo de Slots Disponíveis:
    // O repositório analisa o horário de funcionamento da loja, bloqueios da agenda e disponibilidade do profissional
    // para cruzar as informações e gerar a lista final de janelas de tempo disponíveis.
    const disponiveis = await estabelecimentosRepository.calcularHorariosDisponiveis(
      req.params.id,
      data,
      duracaoMinutos,
      profissionalId
    );
    
    // 5. Resposta de Sucesso:
    res.status(200).json({ horarios: disponiveis });
  } catch (error) {
    // 6. Tratamento de Exceções:
    res.status(500).json({ erro: "Erro ao buscar horarios disponiveis.", detalhes: error.message });
  }
}

// GET /api/estabelecimentos/:id/profissionais?servicosIds=1,2
// Lista os profissionais da loja que prestam todos ou algum dos serviços selecionados pelo cliente.
async function listarProfissionais(req, res) {
  try {
    // 1. Extração e Sanitização de Array de IDs de Serviços:
    // - Pega a string com IDs separados por vírgula (ex: "1,2").
    // - Divide em um array com .split(',').
    // - Converte cada elemento para Number.
    // - Filtra removendo valores nulos, strings vazias ou IDs inválidos (devem ser inteiros maiores que zero).
    const servicosIds = String(req.query.servicosIds || "")
      .split(",")
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
      
    // 2. Otimização de busca:
    // Utiliza a estrutura 'Set' do ES6 para remover automaticamente IDs duplicados (ex: [1, 2, 2] vira [1, 2]).
    const idsSemRepeticao = [...new Set(servicosIds)];

    // 3. Consulta de Profissionais no Repositório:
    const profissionais = await estabelecimentosRepository.listarProfissionais(
      req.params.id,
      idsSemRepeticao
    );
    
    // 4. Resposta de Sucesso:
    res.status(200).json({ profissionais });
  } catch (error) {
    // 5. Tratamento de Exceções:
    res.status(500).json({ erro: "Erro ao buscar profissionais.", detalhes: error.message });
  }
}

module.exports = {
  listar,
  buscarPorId,
  horariosOcupados,
  horariosDisponiveis,
  listarProfissionais
};
