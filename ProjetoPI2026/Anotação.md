# Documentação do Projeto Administrativo (Agenda Rosa)

Para Daniel, Rodrigo e Equipe:
Este documento descreve a estrutura final do módulo administrativo e como a integração Full-Stack (Frontend + Backend) foi implementada.

## 1. Estrutura do Projeto

O repositório foi dividido para respeitar o padrão MVC, onde o Frontend atua como a `View` consumindo a nossa nova API, e o Backend possui `Controllers` e `Models`.

```
ProjetoAndamento/
│
├── backend/                  # A nossa API em Node.js
│   ├── controllers/          # As regras de negócio (O que acontece quando clica)
│   ├── models/               # Os dados (Banco de dados em memória)
│   ├── routes/               # As portas de entrada (URLs da API)
│   ├── package.json          # Dependências do servidor
│   └── server.js             # O motor principal
│
├── DashboardAdm/             # Tela principal
├── DashboardAprovacaoCadastro/ # Tela de aprovação
├── DashboardCatServicos/     # Tela de categorias
├── EsqueciMinhaSenha/        # Tela de recuperação
└── RelatoriosBasicos/        # Tela de relatórios
```

## 2. Como Funciona a Integração

Evitamos sobrecarregar o HTML com lógica. Toda a inteligência de clique e carregamento de dados fica nos arquivos `.js` dentro das pastas do Frontend.

**Exemplo Prático (Aprovação de Empresa):**
1. O HTML (`DashboardAprovacao.html`) possui uma tabela vazia `<tbody id="tabela-aprovacao">`.
2. O Javascript (`DashboardAprovacao.js`) faz um `fetch` para `http://localhost:3000/api/empresas/pendentes`.
3. A Rota do Backend (`empresaRoutes.js`) direciona isso para o Controller.
4. O Controller (`empresaController.js`) pede os dados para o Model (`empresaModel.js`).
5. O Model devolve a lista de empresas pendentes, que volta pelo mesmo caminho até o JS do Frontend.
6. O Javascript injeta as linhas `<tr>` na tabela.

*(Nota: Adicionamos um sistema de Fallback em todos os arquivos Javascript. Se o servidor do backend não estiver rodando, o Javascript usa dados falsos locais para que o design não quebre na tela!)*

## 3. Como Rodar o Servidor Localmente

Como usamos Node.js para o Backend, você precisará ter o Node instalado na sua máquina (ou na máquina do Daniel/Rodrigo).

1. Abra o terminal na pasta `ProjetoAndamento/backend`.
2. Rode o comando para instalar as ferramentas (só na primeira vez):
   `npm install`
3. Inicie o servidor com:
   `npm start`

O terminal avisará: `🚀 Servidor rodando na porta http://localhost:3000`.
A partir desse momento, ao abrir as páginas HTML no navegador, o Frontend consumirá dados reais do servidor!
