const fs = require('fs');
const content = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Meus agendamentos</title>
    <link rel="stylesheet" href="../css/variavies.css" />
    <link rel="stylesheet" href="../css/AgendamentoCliente.css" />
  </head>
  <body class="pagina-agendamentos">
    <main class="container-agendamentos">
      <header class="cabecalho-agendamentos">
        <div>
          <h1>Meus agendamentos</h1>
          <p>Acompanhe seus serviços e gerencie cancelamentos futuros.</p>
        </div>
        <a class="btn-voltar" href="./homeDoCliente.html">Voltar</a>
      </header>

      <section class="resumo-agendamentos" aria-label="Resumo dos agendamentos">
        <article class="card-resumo">
          <span>Total</span>
          <strong>4</strong>
        </article>
        <article class="card-resumo">
          <span>Agendado</span>
          <strong>2</strong>
        </article>
        <article class="card-resumo">
          <span>Concluído</span>
          <strong>1</strong>
        </article>
        <article class="card-resumo">
          <span>Cancelado</span>
          <strong>1</strong>
        </article>
      </section>

      <section class="lista-agendamentos" aria-label="Lista de agendamentos">
        <article class="card-agendamento">
          <div class="dados-agendamento">
            <div><span>Serviço</span><strong>Cabelo</strong></div>
            <div><span>Estabelecimento</span><strong>Studio Rosa Bela</strong></div>
            <div><span>Data</span><strong>12/03/2026</strong></div>
            <div><span>Horário</span><strong>10:00</strong></div>
            <div><span>Status</span><strong class="status-chip status-agendado">Agendado</strong></div>
          </div>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button type="button" class="btn-cancelar" style="flex: 1;">Cancelar</button>
            <button type="button" style="flex: 1; border: 1px solid var(--cor-borda); background: white; color: var(--cor-texto-principal); border-radius: var(--raio-borda-padrao); padding: 0.75rem; font-weight: 500; cursor: pointer;" onclick="abrirMapaAgendamento('Studio Rosa Bela', '-23.935639', '-46.325439', 'Rua das Flores, 123 - Centro, Sao Paulo')">📍 Ver no mapa</button>
          </div>
        </article>

        <article class="card-agendamento">
          <div class="dados-agendamento">
            <div><span>Serviço</span><strong>Barba</strong></div>
            <div><span>Estabelecimento</span><strong>Espaço Charme</strong></div>
            <div><span>Data</span><strong>20/02/2026</strong></div>
            <div><span>Horário</span><strong>09:00</strong></div>
            <div><span>Status</span><strong class="status-chip status-concluido">Concluído</strong></div>
          </div>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button type="button" class="btn-cancelar" style="flex: 1;">Cancelar</button>
            <button type="button" style="flex: 1; border: 1px solid var(--cor-borda); background: white; color: var(--cor-texto-principal); border-radius: var(--raio-borda-padrao); padding: 0.75rem; font-weight: 500; cursor: pointer;" onclick="abrirMapaAgendamento('Espaço Charme', '-23.302730', '-46.552190', 'Av. Bela Vista, 450 - Jardim America, Sao Paulo')">📍 Ver no mapa</button>
          </div>
        </article>

        <article class="card-agendamento">
          <div class="dados-agendamento">
            <div><span>Serviço</span><strong>Manicure</strong></div>
            <div><span>Estabelecimento</span><strong>Studio Rosa Bela</strong></div>
            <div><span>Data</span><strong>25/03/2026</strong></div>
            <div><span>Horário</span><strong>15:00</strong></div>
            <div><span>Status</span><strong class="status-chip status-agendado">Agendado</strong></div>
          </div>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button type="button" class="btn-cancelar" style="flex: 1;">Cancelar</button>
            <button type="button" style="flex: 1; border: 1px solid var(--cor-borda); background: white; color: var(--cor-texto-principal); border-radius: var(--raio-borda-padrao); padding: 0.75rem; font-weight: 500; cursor: pointer;" onclick="abrirMapaAgendamento('Studio Rosa Bela', '-23.935639', '-46.325439', 'Rua das Flores, 123 - Centro, Sao Paulo')">📍 Ver no mapa</button>
          </div>
        </article>

        <article class="card-agendamento">
          <div class="dados-agendamento">
            <div><span>Serviço</span><strong>Estética</strong></div>
            <div><span>Estabelecimento</span><strong>Espaço Charme</strong></div>
            <div><span>Data</span><strong>15/02/2026</strong></div>
            <div><span>Horário</span><strong>14:00</strong></div>
            <div><span>Status</span><strong class="status-chip status-cancelado">Cancelado</strong></div>
          </div>
          <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button type="button" class="btn-cancelar" style="flex: 1;">Cancelar</button>
            <button type="button" style="flex: 1; border: 1px solid var(--cor-borda); background: white; color: var(--cor-texto-principal); border-radius: var(--raio-borda-padrao); padding: 0.75rem; font-weight: 500; cursor: pointer;" onclick="abrirMapaAgendamento('Espaço Charme', '-23.302730', '-46.552190', 'Av. Bela Vista, 450 - Jardim America, Sao Paulo')">📍 Ver no mapa</button>
          </div>
        </article>
      </section>
    </main>

    <!-- Modal de Mapa -->
    <div id="overlayMapa" class="sobreposicao-agendamento" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; align-items: center; justify-content: center;">
      <section class="modal-agendamento" style="background: white; border-radius: 12px; padding: 20px; width: 90%; max-width: 500px; position: relative;">
        <button onclick="fecharMapaAgendamento()" style="position: absolute; top: 15px; right: 15px; background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        <h2 id="tituloMapa" style="margin-bottom: 5px;">Localização</h2>
        <p id="enderecoMapa" style="font-size: 0.85em; color: #666; margin-bottom: 15px;"></p>
        <div style="width: 100%; height: 250px; border-radius: 8px; overflow: hidden; border: 1px solid #ddd;">
          <iframe id="iframeMapa" width="100%" height="100%" frameborder="0" style="border:0;" allowfullscreen="" loading="lazy"></iframe>
        </div>
      </section>
    </div>

    <script>
      function abrirMapaAgendamento(nome, lat, lng, endereco) {
        document.getElementById('tituloMapa').textContent = nome;
        document.getElementById('enderecoMapa').textContent = endereco;
        document.getElementById('iframeMapa').src = \`https://maps.google.com/maps?q=\${lat},\${lng}&z=15&output=embed\`;
        document.getElementById('overlayMapa').style.display = 'flex';
      }
      function fecharMapaAgendamento() {
        document.getElementById('overlayMapa').style.display = 'none';
        document.getElementById('iframeMapa').src = '';
      }
    </script>
  </body>
</html>`;
fs.writeFileSync('c:\\Users\\RD\\Documents\\AgendaRosa\\agendarosa\\agendarosa\\frontend\\html\\AgendamentoCliente.html', content, 'utf8');
