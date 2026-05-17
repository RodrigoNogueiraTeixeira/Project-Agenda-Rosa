const empresaRepository = require("../repositories/empresaRepository");

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

async function cadastrarEmpresa(req, res) {
  try {
    const erroValidacao = validarCadastroEmpresa(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const empresa = await empresaRepository.cadastrarEmpresa(req.body);

    return res.status(201).json({
      message: "Empresa cadastrada com sucesso. Aguardando aprovacao do administrador.",
      empresa,
    });
  } catch (error) {
    if (error.message.includes("E-mail ja cadastrado")) {
      return res.status(409).json({ message: error.message });
    }

    console.error("Erro ao cadastrar empresa:", error);
    return res.status(500).json({
      message: "Erro interno ao cadastrar empresa.",
    });
  }
}

module.exports = {
  cadastrarEmpresa,
};
