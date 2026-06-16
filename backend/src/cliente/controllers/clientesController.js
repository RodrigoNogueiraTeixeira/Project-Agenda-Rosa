// Importa a camada de Repositório (Repository), que contém as regras de negócio de clientes.
const clientesRepository = require("../repositories/clientesRepository");

/**
 * FUNÇÃO: buscarPerfil
 * OBJETIVO: Buscar as informações cadastrais de um cliente específico no banco pelo ID dele.
 */
async function buscarPerfil(req, res) {
  // 'try': Abre uma rede de segurança contra erros inesperados (como banco de dados fora do ar).
  try {
    // Chama a função do Repositório para buscar o cliente usando o ID enviado na URL (ex: /clientes/15/perfil -> ID = 15).
    const cliente = await clientesRepository.buscarPerfil(req.params.id);

    // Se o repositório retornar nulo (não encontrou o cliente no banco).
    if (!cliente) {
      // Devolve o status HTTP 404 (Not Found / Não Encontrado) em formato JSON.
      return res.status(404).json({
        erro: "Cliente nao encontrado.",
      });
    }

    // Se tudo deu certo, devolve o status HTTP 200 (OK / Sucesso) com os dados do cliente.
    return res.status(200).json({
      cliente: cliente,
    });
  // 'catch': Captura erros graves ou falhas físicas na execução.
  } catch (error) {
    // Retorna o status HTTP 500 (Erro Interno do Servidor) detalhando o motivo da falha.
    return res.status(500).json({
      erro: "Erro ao buscar perfil.",
      detalhes: error.message,
    });
  }
}

/**
 * FUNÇÃO: atualizarPerfil
 * OBJETIVO: Atualizar as informações de cadastro de um cliente (como nome, telefone, email, etc.).
 */
async function atualizarPerfil(req, res) {
  // 'try': Abre a rede de segurança contra falhas no banco.
  try {
    // Chama o repositório para salvar a alteração. Passa o ID do cliente da URL e os novos dados vindos no corpo da requisição (req.body).
    const clienteAtualizado = await clientesRepository.atualizarPerfil(
      req.params.id,
      req.body || {}
    );

    // Se o cliente a ser atualizado não existir mais no banco de dados.
    if (!clienteAtualizado) {
      // Devolve status HTTP 404 (Não Encontrado).
      return res.status(404).json({
        erro: "Cliente nao encontrado.",
      });
    }

    // Se deu certo, responde com status HTTP 200 (Sucesso) confirmando a alteração e enviando os dados novos.
    return res.status(200).json({
      mensagem: "Perfil atualizado com sucesso.",
      cliente: clienteAtualizado,
    });
  // 'catch': Captura erros e regras de negócio violadas (como e-mail já em uso ou dados inválidos).
  } catch (error) {
    // Pega o texto explicativo da falha.
    const mensagem = error.message || "";

    // Regra de Conflito: O e-mail ou telefone que ela quer usar já pertence a outra pessoa.
    if (mensagem.includes("ja cadastrado")) {
      // Devolve status HTTP 409 (Conflict / Conflito de dados no banco).
      return res.status(409).json({
        erro: mensagem,
      });
    }

    // Regras de Preenchimento: Falta campos obrigatórios, e-mail inválido ou senha fraca.
    if (
      mensagem.includes("obrigatorios") ||
      mensagem.includes("valido") ||
      mensagem.includes("6 caracteres")
    ) {
      // Devolve status HTTP 400 (Bad Request / Requisição feita com dados incorretos).
      return res.status(400).json({
        erro: mensagem,
      });
    }

    // Erro inesperado do servidor.
    return res.status(500).json({
      erro: "Erro ao atualizar perfil.",
      detalhes: error.message,
    });
  }
}

/**
 * FUNÇÃO: cadastrarCliente
 * OBJETIVO: Cadastrar um novo cliente no banco de dados a partir do formulário de cadastro do app.
 */
async function cadastrarCliente(req, res) {
  // 'try': Abre a rede de segurança contra falhas no banco.
  try {
    // Envia o formulário (req.body) para o repositório validar as regras e inserir no banco.
    const cliente = await clientesRepository.cadastrarCliente(
      req.body || {}
    );

    // Devolve status HTTP 201 (Created / Registro criado com sucesso) enviando os dados do novo cliente.
    return res.status(201).json({
      mensagem: "Cliente cadastrado com sucesso.",
      cliente: cliente,
    });
  // 'catch': Captura as falhas de validação ou de duplicidade de e-mail/telefone.
  } catch (error) {
    const mensagem = error.message || "Erro ao cadastrar cliente.";
    // Começa assumindo que é um erro genérico do servidor (500).
    let status = 500;

    // Se for erro de validação de dados do formulário.
    if (
      mensagem.includes("obrigatorios") ||
      mensagem.includes("valido") ||
      mensagem.includes("6 caracteres")
    ) {
      // Define código HTTP 400 (Bad Request).
      status = 400;
    // Se for e-mail ou telefone já em uso por outra conta.
    } else if (mensagem.includes("ja cadastrado")) {
      // Define código HTTP 409 (Conflict).
      status = 409;
    }

    // Envia a resposta final para o aplicativo com o status correto e a explicação do erro.
    return res.status(status).json({
      erro: mensagem,
    });
  }
}

// Exporta as funções controladoras para serem vinculadas nas rotas.
module.exports = {
  buscarPerfil,
  atualizarPerfil,
  cadastrarCliente,
};
