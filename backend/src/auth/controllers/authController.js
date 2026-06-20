// Importa o repositório de autenticação (contém as regras de acesso ao banco e verificação de senha).
const authRepository = require("../repositories/authRepository");
const jwt = require("jsonwebtoken");

/**
 * Controller responsável por receber as requisições de login, chamar o repositório para
 * validar as credenciais e retornar a resposta adequada (sucesso ou erro) ao cliente.
 * 
 * @param {Object} req - Objeto de requisição do Express (contém os dados enviados pelo usuário no req.body).
 * @param {Object} res - Objeto de resposta do Express (usado para enviar dados de volta ao navegador).
 */
async function login(req, res) {
  try {
    // Chama o repositório passando o corpo da requisição (se vier nulo, envia um objeto vazio '{}' para evitar erros).
    // O 'await' espera a validação de banco e criptografia de senha terminar.
    const resultado = await authRepository.login(req.body || {});
    
    // Inicializa uma variável 'cliente' como null (será preenchida apenas se for um perfil de cliente).
    let cliente = null;

    // Condicional para manter a compatibilidade com telas e códigos antigos do frontend
    // que esperavam encontrar o objeto do usuário dentro de um campo chamado 'cliente'.
    if (resultado.perfil === "cliente") {
      // Atribui o objeto do usuário autenticado à variável 'cliente'.
      cliente = resultado.usuario;
    }

    // Gera o JSON Web Token (JWT) com os dados essenciais do usuário e seu perfil.
    const secret = process.env.JWT_SECRET || "sua_chave_secreta_super_segura_aqui";
    const token = jwt.sign(
      { id: resultado.usuario.id, perfil: resultado.perfil },
      secret,
      { expiresIn: "7d" } // Token expira em 7 dias
    );

    // Retorna uma resposta de sucesso (Status HTTP 200 OK) em formato JSON contendo o token e dados.
    return res.status(200).json({
      mensagem: "Login realizado com sucesso.",
      token: token,
      perfil: resultado.perfil,
      usuario: resultado.usuario,
      cliente: cliente, // Mantém o objeto de cliente para retrocompatibilidade.
    });
  } catch (error) {
    // Obtém a mensagem de erro disparada pelo repositório ou define uma mensagem padrão.
    const mensagem = error.message || "Erro ao realizar login.";
    
    // Define o código de status HTTP padrão como 401 (Não Autorizado / Não Autenticado).
    let status = 401;

    // O método '.includes()' verifica se o texto procurado (argumento) existe dentro da string 'mensagem', retornando true ou false.
    // Se o erro indicar que o banco ou algum serviço não está configurado no servidor:
    if (mensagem.includes("nao configurado")) {
      // Define o código como 503 (Serviço Indisponível).
      status = 503;
    // Se o erro indicar campos obrigatórios ausentes ou problemas com a aprovação do cadastro da empresa (buscando palavras-chave na mensagem):
    } else if (
      mensagem.includes("obrigatorios") ||
      mensagem.includes("aprovacao") ||
      mensagem.includes("reprovada")
    ) {
      // Define o código como 400 (Requisição Ruim / Erro do Cliente).
      status = 400;
    }

    // Retorna a resposta de erro ao cliente com o status HTTP mapeado e a mensagem do erro.
    return res.status(status).json({
      erro: mensagem,
    });
  }
}

// Exporta as funções da controller para que possam ser utilizadas na definição das rotas HTTP (em routes).
module.exports = {
  login,
};
