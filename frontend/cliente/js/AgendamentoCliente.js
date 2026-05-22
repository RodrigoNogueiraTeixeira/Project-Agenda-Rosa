const CLIENTE_ID = Number(localStorage.getItem("clienteId") || 1);
const API_BASE_URL = window.API_BASE_URL || localStorage.getItem("apiBaseUrl") || (window.location.hostname === "localhost" ? "http://localhost:3001/api" : "/api");

document.addEventListener("DOMContentLoaded", () => {
  carregarAgendamentos();
});

async function carregarAgendamentos() {
  try {
    const resposta = await fetch(`${API_BASE_URL}/clientes/${CLIENTE_ID}/agendamentos`);
    if (!resposta.ok) {
      throw new Error("Falha ao carregar agendamentos");
    }
    
    const dados = await resposta.json();
    renderizarTela(dados.agendamentos || []);
  } catch (erro) {
    console.error(erro);
    document.getElementById("container-lista-agendamentos").innerHTML = 
      '<p style="text-align: center; color: #f44336; margin-top: 40px;">Erro ao carregar agendamentos. Tente novamente mais tarde.</p>';
  }
}

function renderizarTela(agendamentos) {
  // 1. Atualizar Contadores
  let total = agendamentos.length;
  let agendado = 0;
  let concluido = 0;
  let cancelado = 0;

  agendamentos.forEach(a => {
    if (a.status === 'agendado') agendado++;
    else if (a.status === 'concluido') concluido++;
    else if (a.status === 'cancelado') cancelado++;
    // Pendentes apenas somam no Total, sem poluir os status concluídos/agendados
  });

  document.getElementById("contador-total").textContent = total;
  document.getElementById("contador-agendado").textContent = agendado;
  document.getElementById("contador-concluido").textContent = concluido;
  document.getElementById("contador-cancelado").textContent = cancelado;

  // 2. Gerar Lista
  const container = document.getElementById("container-lista-agendamentos");
  container.innerHTML = "";

  if (agendamentos.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #8c7e96; margin-top: 40px;">Você ainda não possui nenhum agendamento.</p>';
    return;
  }

  agendamentos.forEach(a => {
    const card = document.createElement("article");
    card.className = "card-agendamento";
    
    // Status Formatado
    let statusFormatado = a.status.charAt(0).toUpperCase() + a.status.slice(1);
    if (a.status === 'pendente') {
      statusFormatado = 'Aguardando Pagamento';
    }
    
    // Nome do primeiro serviço ou fallback
    const nomeServico = a.servicos && a.servicos.length > 0 ? a.servicos[0].nome : "Serviço";
    
    // Data formato DD/MM/YYYY
    let dataFormatada = a.data;
    if (a.data && a.data.includes("-")) {
      const partes = a.data.split("-");
      if (partes.length === 3) dataFormatada = `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    // Só exibe botão de cancelar se estiver agendado ou pendente
    const podeCancelar = (a.status === 'agendado' || a.status === 'pendente');

    card.innerHTML = `
      <div class="dados-agendamento">
        <div><span>Serviço</span><strong>${nomeServico}</strong></div>
        <div><span>Estabelecimento</span><strong>${a.estabelecimentoNome || 'Estabelecimento'}</strong></div>
        <div><span>Data</span><strong>${dataFormatada}</strong></div>
        <div><span>Horário</span><strong>${a.horario}</strong></div>
        <div><span>Status</span><strong class="status-chip status-${a.status}">${statusFormatado}</strong></div>
      </div>
      <div style="display: flex; gap: 12px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f9eff4; justify-content: flex-end;">
        <button type="button" class="btn-acao-card" onclick="abrirMapaAgendamento('${a.estabelecimentoNome}', '${a.estabelecimentoLat || ''}', '${a.estabelecimentoLng || ''}', '${a.estabelecimentoEndereco || 'Endereço não informado'}')">📍 Ver mapa</button>
        ${podeCancelar ? `<button type="button" class="btn-acao-card btn-cancelar" onclick="irParaPagamentoOuCancelar('${a.id}', '${a.status}', '${a.pagamentoUrl || ''}')">${a.status === 'pendente' ? 'Ir para Pagamento' : 'Cancelar'}</button>` : ''}
      </div>
    `;
    
    container.appendChild(card);
  });
}

async function irParaPagamentoOuCancelar(id, status, pagamentoUrl) {
  if (status === 'pendente') {
    if (pagamentoUrl && pagamentoUrl !== 'undefined') {
      window.location.href = pagamentoUrl;
    } else {
      Swal.fire({
        title: 'Link Indisponível',
        text: 'Não foi possível recuperar o link de pagamento. Por favor, cancele e crie um novo agendamento.',
        icon: 'error',
        confirmButtonText: 'Entendi',
        customClass: { popup: 'swal2-borda-arredondada' },
        confirmButtonColor: '#c93f7d'
      });
    }
    return;
  }
  
  const result = await Swal.fire({
    title: 'Deseja mesmo cancelar?',
    text: "Se você já pagou, o valor será reembolsado automaticamente na sua conta bancária ou fatura do cartão.",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#c93f7d',
    cancelButtonColor: '#8c7e96',
    confirmButtonText: 'Sim, cancelar!',
    cancelButtonText: 'Voltar',
    customClass: {
      popup: 'swal2-borda-arredondada'
    }
  });

  if (result.isConfirmed) {
    Swal.fire({
      title: 'Processando...',
      text: 'Cancelando e solicitando estorno se necessário.',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const resposta = await fetch(`${API_BASE_URL}/agendamentos/${id}/cancelar`, {
        method: 'PATCH'
      });
      
      const dados = await resposta.json();
      
      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao cancelar o agendamento.");
      }

      await Swal.fire({
        title: 'Cancelado!',
        text: 'Seu agendamento foi cancelado. Caso tenha pago, o estorno já foi processado na sua conta.',
        icon: 'success',
        customClass: { popup: 'swal2-borda-arredondada' },
        confirmButtonColor: '#c93f7d'
      });
      
      // Recarrega a lista para atualizar a tela
      carregarAgendamentos();
      
    } catch (erro) {
      Swal.fire({
        title: 'Ops!',
        text: erro.message,
        icon: 'error',
        customClass: { popup: 'swal2-borda-arredondada' },
        confirmButtonColor: '#c93f7d'
      });
    }
  }
}
