// Controller simples para teste rapido do servidor.
function health(req, res) {
  res.status(200).json({ ok: true, status: "online" });
}

module.exports = {
  health
};
