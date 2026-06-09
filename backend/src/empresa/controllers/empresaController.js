const empresaRepository = require("../repositories/empresaRepository");

function validarCadastroEmpresa(dados) {
  // Confere os campos obrigatorios do cadastro.
  if (
    !dados.nomeResponsavel ||
    String(dados.nomeResponsavel).trim() === "" ||
    !dados.telefone ||
    String(dados.telefone).trim() === "" ||
    !dados.email ||
    String(dados.email).trim() === "" ||
    !dados.nomeEstabelecimento ||
    String(dados.nomeEstabelecimento).trim() === "" ||
    !dados.senha ||
    String(dados.senha).trim() === ""
  ) {
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

function validarPerfilEmpresa(dados) {
  // Confere os dados obrigatorios do perfil.
  if (
    !dados.empresaId ||
    String(dados.empresaId).trim() === "" ||
    !dados.nomeEstabelecimento ||
    String(dados.nomeEstabelecimento).trim() === "" ||
    !dados.categoriaPrincipal ||
    String(dados.categoriaPrincipal).trim() === "" ||
    !dados.telefone ||
    String(dados.telefone).trim() === "" ||
    !dados.email ||
    String(dados.email).trim() === "" ||
    !dados.cep ||
    String(dados.cep).trim() === "" ||
    !dados.endereco ||
    String(dados.endereco).trim() === "" ||
    !dados.bairro ||
    String(dados.bairro).trim() === "" ||
    !dados.cidade ||
    String(dados.cidade).trim() === ""
  ) {
    return "Preencha todos os campos obrigatorios do perfil.";
  }

  if (!String(dados.email).includes("@")) {
    return "Informe um e-mail valido.";
  }

  if (!/^\d{5}-?\d{3}$/.test(String(dados.cep).trim())) {
    return "Informe um CEP valido.";
  }

  if (
    dados.logoUrl &&
    !/^data:image\/(png|jpeg|webp);base64,/i.test(String(dados.logoUrl))
  ) {
    return "Selecione uma imagem PNG, JPG ou WEBP.";
  }

  if (dados.logoUrl && String(dados.logoUrl).length > 1400000) {
    return "A imagem deve ter no maximo 1 MB.";
  }

  return null;
}

async function cadastrarEmpresa(req, res) {
  // Valida e salva uma nova empresa.
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

async function buscarPerfil(req, res) {
  // Busca os dados usados na tela de perfil.
  try {
    if (!req.query.empresaId) {
      return res.status(400).json({ message: "Informe o ID da empresa." });
    }

    const perfil = await empresaRepository.buscarPerfil(req.query.empresaId);

    if (!perfil) {
      return res.status(404).json({ message: "Empresa nao encontrada." });
    }

    return res.json(perfil);
  } catch (error) {
    console.error("Erro ao buscar perfil da empresa:", error);
    return res.status(500).json({ message: "Erro interno ao buscar perfil." });
  }
}

async function atualizarPerfil(req, res) {
  // Valida e atualiza os dados do estabelecimento.
  try {
    const erroValidacao = validarPerfilEmpresa(req.body);

    if (erroValidacao) {
      return res.status(400).json({ message: erroValidacao });
    }

    const perfil = await empresaRepository.atualizarPerfil(req.body);

    if (!perfil) {
      return res.status(404).json({ message: "Empresa nao encontrada." });
    }

    return res.json({
      message: "Perfil do estabelecimento atualizado com sucesso.",
      perfil,
    });
  } catch (error) {
    if (error.message.includes("E-mail ja cadastrado")) {
      return res.status(409).json({ message: error.message });
    }

    console.error("Erro ao atualizar perfil da empresa:", error);
    return res.status(500).json({ message: "Erro interno ao atualizar perfil." });
  }
}

module.exports = {
  cadastrarEmpresa,
  buscarPerfil,
  atualizarPerfil,
};
