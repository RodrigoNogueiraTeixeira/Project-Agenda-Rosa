const authRepository = require("../repositories/authRepository");

// POST /api/auth/login
async function login(req, res) {
  try {
    const resultado = await authRepository.login(req.body || {});
    res.status(200).json({
      mensagem: "Login realizado com sucesso.",
      perfil: resultado.perfil,
      usuario: resultado.usuario,
      // Retrocompatibilidade para chamadas legadas do cliente
      cliente: resultado.perfil === "cliente" ? resultado.usuario : null
    });
  } catch (error) {
    // 1. Obtém a mensagem de erro ocorrida durante a tentativa de login.
    // Se o erro não tiver uma mensagem definida, define um texto padrão genérico.
    const mensagem = error.message || "Erro ao realizar login.";
    
    // 2. Define o código de status HTTP com base na mensagem de erro identificada.
    // Usamos operadores ternários encadeados para mapear o erro ao status correto:
    const status = mensagem.includes("nao configurado")
      ? 503 // 503 Service Unavailable (Serviço Indisponível): indica que falta configuração no servidor (ex: variáveis de ambiente ausentes)
      : (
        mensagem.includes("obrigatorios") || // Campos obrigatórios não preenchidos
        mensagem.includes("aprovacao") ||    // Empresa pendente de aprovação dos administradores
        mensagem.includes("reprovada")        // Empresa com cadastro reprovado/rejeitado
      ) ? 400 // 400 Bad Request (Requisição Inválida): erro gerado por dados inválidos enviados pelo cliente ou estado de cadastro inválido
        : 401; // 401 Unauthorized (Não Autorizado): erro clássico de credenciais incorretas (e-mail ou senha errados)
        
    // 3. Retorna a resposta ao navegador/frontend com o status correspondente e o JSON contendo o erro.
    res.status(status).json({ erro: mensagem });
  }
}

module.exports = {
  login
};
