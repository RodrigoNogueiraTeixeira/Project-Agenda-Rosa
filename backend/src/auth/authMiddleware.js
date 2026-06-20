const jwt = require("jsonwebtoken");

function verificarToken(perfilPermitido) {
  return (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ erro: "Acesso negado. Token nao fornecido." });
      }

      const token = authHeader.split(" ")[1];
      if (!token) {
        return res.status(401).json({ erro: "Acesso negado. Formato de token invalido." });
      }

      const secret = process.env.JWT_SECRET || "sua_chave_secreta_super_segura_aqui";
      const decodificado = jwt.verify(token, secret);

      // Se um array de perfis ou string for fornecida, validar.
      if (perfilPermitido) {
        if (Array.isArray(perfilPermitido)) {
          if (!perfilPermitido.includes(decodificado.perfil)) {
             return res.status(403).json({ erro: "Acesso negado. Perfil sem permissao para esta rota." });
          }
        } else if (decodificado.perfil !== perfilPermitido) {
          return res.status(403).json({ erro: "Acesso negado. Perfil sem permissao para esta rota." });
        }
      }

      // Injeta o payload do token na requisicao para ser usado nos controllers (ex: req.user.id)
      req.user = decodificado;
      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return res.status(401).json({ erro: "Acesso negado. Token expirado." });
      }
      return res.status(401).json({ erro: "Acesso negado. Token invalido." });
    }
  };
}

module.exports = { verificarToken };
