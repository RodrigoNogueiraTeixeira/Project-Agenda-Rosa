PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS empresas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome_responsavel TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  nome_estabelecimento TEXT NOT NULL,
  senha_hash TEXT NOT NULL,
  categoria_principal TEXT,
  descricao TEXT,
  cep TEXT,
  endereco TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  status_aprovacao TEXT NOT NULL DEFAULT 'pendente',
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (status_aprovacao IN ('pendente', 'aprovada', 'reprovada'))
);

CREATE TABLE IF NOT EXISTS profissionais (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  email TEXT,
  especialidade TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS servicos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  preco_centavos INTEGER NOT NULL,
  duracao_minutos INTEGER NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'ativo',
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  CHECK (preco_centavos >= 0),
  CHECK (duracao_minutos > 0),
  CHECK (status IN ('ativo', 'inativo'))
);

CREATE TABLE IF NOT EXISTS horarios_funcionamento (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL,
  dia_semana INTEGER NOT NULL,
  abre INTEGER NOT NULL DEFAULT 1,
  horario_abertura TEXT,
  horario_fechamento TEXT,
  intervalo_inicio TEXT,
  intervalo_fim TEXT,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  UNIQUE (empresa_id, dia_semana),
  CHECK (dia_semana BETWEEN 0 AND 6),
  CHECK (abre IN (0, 1))
);

CREATE TABLE IF NOT EXISTS bloqueios_horarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL,
  profissional_id INTEGER,
  profissional_nome TEXT,
  data_bloqueio TEXT NOT NULL,
  horario_inicio TEXT NOT NULL,
  horario_fim TEXT NOT NULL,
  motivo TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  empresa_id INTEGER NOT NULL,
  servico_id INTEGER NOT NULL,
  profissional_id INTEGER,
  cliente_id INTEGER,
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT,
  email_cliente TEXT,
  data_agendamento TEXT NOT NULL,
  horario_inicio TEXT NOT NULL,
  horario_fim TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  criado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE,
  FOREIGN KEY (servico_id) REFERENCES servicos(id) ON DELETE RESTRICT,
  FOREIGN KEY (profissional_id) REFERENCES profissionais(id) ON DELETE SET NULL,
  CHECK (status IN ('pendente', 'confirmado', 'cancelado', 'realizado'))
);

CREATE INDEX IF NOT EXISTS idx_servicos_empresa ON servicos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_empresa_data ON agendamentos(empresa_id, data_agendamento);
CREATE INDEX IF NOT EXISTS idx_bloqueios_empresa_data ON bloqueios_horarios(empresa_id, data_bloqueio);
