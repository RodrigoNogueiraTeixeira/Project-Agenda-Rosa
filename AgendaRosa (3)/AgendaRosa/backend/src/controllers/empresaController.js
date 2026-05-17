const empresaModel = require("../models/empresaModel");
const { hashPassword } = require("../utils/password");

// Valida os dados obrigatorios antes de tentar salvar a empresa no banco.
function validarCadastroEmpresa(dados) {
  const camposObrigatorios = [
    "nomeResponsavel",
    "telefone",
    "email",
    "nomeEstabelecimento",
    "senha",
  ];

  const camposAusentes = camposObrigatorios.filter((campo) => {
    return !dados[campo] || String(dados[campo]).trim() === "";
  });

  if (camposAusentes.length > 0) {
    return "Preencha todos os campos obrigatorios.";
  }

  if (!String(dados.email).includes("@")) {
    return "Informe um e-mail valido.";
  }

  if (String(dados.senha).length < 6) {
    return "A senha deve ter pelo menos 6 caracteres.";
  }

  return null;
}

// Controller responsavel por receber a requisicao de cadastro de empresa.
async function cadastrarEmpresa(req, res) {
  try {
    // Primeiro valida os campos enviados pela tela.
    const erroValidacao = validarCadastroEmpresa(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    // Impede o cadastro de duas empresas usando o mesmo e-mail.
    const emailJaExiste = await empresaModel.buscarPorEmail(req.body.email);

    if (emailJaExiste) {
      return res.status(409).json({
        message: "Ja existe uma empresa cadastrada com este e-mail.",
      });
    }

    // Gera o hash da senha para nao armazenar senha pura no banco.
    const senhaHash = hashPassword(req.body.senha);

    // Envia os dados ja tratados para a camada Model gravar no SQLite.
    const empresa = await empresaModel.criar({
      nomeResponsavel: req.body.nomeResponsavel,
      telefone: req.body.telefone,
      email: req.body.email,
      nomeEstabelecimento: req.body.nomeEstabelecimento,
      senhaHash,
    });

    // Retorna a empresa criada sem expor a senha.
    return res.status(201).json({
      message: "Empresa cadastrada com sucesso. Aguardando aprovacao do administrador.",
      empresa,
    });
  } catch (error) {
    // Resposta padrao para falhas inesperadas.
    console.error("Erro ao cadastrar empresa:", error);

    return res.status(500).json({
      message: "Erro interno ao cadastrar empresa.",
    });
  }
}

// Exporta as funcoes que serao usadas pela camada de rotas.
module.exports = {
  cadastrarEmpresa,
};
