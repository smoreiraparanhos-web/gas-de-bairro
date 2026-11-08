/* Painel do depósito: recebe pedidos, atualiza status, abre/fecha a loja e define o preço. */
(function () {
  const C = window.GDB_CONFIG, { store, brl, esc, fone, hora, STATUS, ATIVOS } = window.GDB, I = window.ICONES;
  const $raiz = document.getElementById("raiz");
  let aba = "ativos", pedidos = [], loja = null, conhecidos = null, timer = null, ocupado = false;

  if (store.demo) {
    document.getElementById("faixa").innerHTML =
      `<div class="faixa-demo"><b>Modo demonstração</b> · mostra só os pedidos feitos neste navegador. Configure o Supabase para receber pedidos reais.</div>`;
  }

  const PROXIMO = {
    enviado: { status: "em_preparacao", rotulo: "Aceitar pedido" },
    em_preparacao: { status: "saiu_entrega", rotulo: "Saiu para entrega" },
    saiu_entrega: { status: "entregue", rotulo: "Marcar entregue" },
  };

  // ---------- Login ----------
  function telaLogin(msg) {
    pararTimer();
    $raiz.innerHTML = `<div class="login">
      <div class="logo" style="align-items:center;margin-bottom:20px">${I.logo(80)}<span class="logo-nome">Painel do Depósito</span></div>
      <div class="cartao">
        ${store.demo
          ? `<p class="sub" style="margin-top:0">No modo demonstração não há senha. Faça um pedido em <a href="index.html" target="_blank">index.html</a> neste mesmo navegador e ele aparece aqui.</p>
             <button class="btn btn-primario" id="entrar-demo">Entrar na demonstração</button>`
          : `<form class="form" id="form-login">
               <div class="campo"><label for="email">E-mail</label><input id="email" type="email" autocomplete="username" required></div>
               <div class="campo"><label for="senha">Senha</label><input id="senha" type="password" autocomplete="current-password" required></div>
               <div id="erro">${msg ? `<div class="aviso aviso-vermelho">${esc(msg)}</div>` : ""}</div>
               <button class="btn btn-primario">Entrar</button>
             </form>`}
      </div></div>`;
    document.getElementById("entrar-demo")?.addEventListener("click", async () => { await store.entrar(); iniciar(); });
    document.getElementById("form-login")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const b = ev.target.querySelector("button"); b.disabled = true; b.textContent = "Entrando…";
      try { await store.entrar(ev.target.email.value.trim(), ev.target.senha.value); iniciar(); }
      catch (e) { telaLogin(e.amigavel ? e.message : "Não foi possível entrar."); }
    });
  }

  // ---------- Som de novo pedido ----------
  let audio;
  function bip() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((t) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = 880; o.type = "sine"; o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(0.0001, audio.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.4, audio.currentTime + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + t + 0.2);
        o.start(audio.currentTime + t); o.stop(audio.currentTime + t + 0.22);
      });
    } catch {}
  }

  // ---------- Painel ----------
  async function iniciar() {
    if (store.whatsapp) {
      $raiz.innerHTML = `<div class="login"><div class="logo" style="align-items:center;margin-bottom:20px">${I.logo(80)}<span class="logo-nome">Painel do Depósito</span></div>
        <div class="cartao"><h2>Os pedidos chegam no seu WhatsApp</h2>
        <p class="sub">O app está no modo WhatsApp: cada pedido chega como mensagem pronta no número ${esc(fone(C.whatsappDeposito))}, com endereço, pagamento e localização. Responda ao cliente por lá.</p>
        <p class="sub">Para ter este painel com acompanhamento automático, configure o Supabase (veja o README).</p></div></div>`;
      return;
    }
    if (!(await store.ehEquipe())) return telaLogin();
    $raiz.innerHTML = `<div class="painel">
      <header class="painel-topo">
        <a class="logo" href="index.html" target="_blank" title="Abrir o app do cliente">${I.logo(48)}<span class="logo-nome">Painel do Depósito</span></a>
        <span class="espaco"></span>
        <button class="btn-mini" id="som">Ativar som</button>
        <button class="btn-mini" id="sair" style="background:var(--marinho-suave)">Sair</button>
      </header>
      <div class="loja-controles" id="loja"></div>
      <div class="abas" role="tablist">
        <button class="aba" role="tab" data-aba="ativos">Em andamento <span class="cont" id="cont-ativos">0</span></button>
        <button class="aba" role="tab" data-aba="fim">Finalizados (24h)</button>
      </div>
      <div id="erro-lista"></div>
      <div class="grade" id="lista"></div>
      <p class="atualizado" id="atualizado" style="margin-top:16px"></p>
    </div>`;
    document.getElementById("sair").onclick = async () => { await store.sair(); telaLogin(); };
    document.getElementById("som").onclick = (e) => { bip(); e.target.textContent = "Som ativado ✓"; };
    document.querySelectorAll(".aba").forEach((b) => (b.onclick = () => { aba = b.dataset.aba; desenhaLista(); }));
    await Promise.all([carregaLoja(), carregaPedidos()]);
    pararTimer();
    timer = setInterval(carregaPedidos, store.demo ? 3000 : 8000);
    if (store.demo) window.addEventListener("storage", carregaPedidos);
  }

  async function carregaLoja() {
    try { loja = await store.getLoja(); } catch { return; }
    const $l = document.getElementById("loja");
    $l.innerHTML = `
      <div class="cartao"><label class="interruptor">
        <input type="checkbox" id="aberto" ${loja.aberto ? "checked" : ""}><span class="trilho"></span>
        <span>${loja.aberto ? "Aberto · recebendo pedidos" : "Fechado · clientes não conseguem pedir"}</span></label></div>
      <div class="cartao"><form class="preco-form" id="form-preco">
        <label for="preco">Preço do P13 (R$)</label>
        <input id="preco" inputmode="decimal" placeholder="0,00" value="${loja.preco != null ? loja.preco.toFixed(2).replace(".", ",") : ""}">
        <button class="btn-mini">Salvar</button>
        <span class="nota" id="preco-msg">${loja.preco == null ? (store.demo ? "Sem preço: o cliente vê o valor ilustrativo." : "Sem preço: o cliente vê “informado pelo depósito”.") : ""}</span>
      </form></div>
      <div class="cartao"><form class="preco-form" id="form-aviso" style="flex-wrap:nowrap">
        <label for="aviso" class="oculto">Aviso para clientes</label>
        <input id="aviso" style="flex:1;width:auto;font-size:16px;font-weight:700" maxlength="200" placeholder="Aviso no app (ex.: entregas com atraso hoje)" value="${esc(loja.aviso || "")}">
        <button class="btn-mini">Salvar</button>
      </form></div>`;
    document.getElementById("aberto").onchange = async (e) => {
      try { await store.salvarLoja({ aberto: e.target.checked }); } catch (err) { alert(err.message); }
      carregaLoja();
    };
    document.getElementById("form-preco").onsubmit = async (e) => {
      e.preventDefault();
      const txt = document.getElementById("preco").value.trim();
      const v = txt ? Number(txt.replace(/\./g, "").replace(",", ".")) : null;
      if (txt && (!isFinite(v) || v <= 0)) { document.getElementById("preco-msg").textContent = "Valor inválido."; return; }
      try { await store.salvarLoja({ preco: v }); } catch (err) { alert(err.message); }
      carregaLoja();
    };
    document.getElementById("form-aviso").onsubmit = async (e) => {
      e.preventDefault();
      try { await store.salvarLoja({ aviso: document.getElementById("aviso").value.trim() || null }); } catch (err) { alert(err.message); }
      carregaLoja();
    };
  }

  async function carregaPedidos() {
    if (ocupado) return;
    const $e = document.getElementById("erro-lista"); if (!$e) return;
    try {
      pedidos = await store.listarPedidos();
      $e.innerHTML = "";
    } catch (e) {
      $e.innerHTML = `<div class="aviso aviso-vermelho">Sem conexão com o servidor. Tentando de novo…</div>`;
      return;
    }
    const novos = pedidos.filter((p) => p.status === "enviado");
    if (conhecidos && novos.some((p) => !conhecidos.has(p.id))) bip();
    conhecidos = new Set(pedidos.map((p) => p.id));
    document.title = novos.length ? `(${novos.length}) Novo pedido · Painel` : "Painel do Depósito";
    document.getElementById("atualizado").textContent = `Atualizado às ${hora(new Date().toISOString())} · atualiza sozinho`;
    desenhaLista();
  }

  function cartaoPedido(p) {
    const total = p.preco_unitario != null ? brl(p.preco_unitario * p.quantidade) : "preço a combinar";
    const pag = p.pagamento === "dinheiro" ? (p.troco_para ? `Dinheiro · levar troco para ${brl(p.troco_para)}` : "Dinheiro · sem troco")
      : p.pagamento === "cartao" ? `Maquininha · ${p.cartao_tipo === "credito" ? "crédito" : "débito"}` : "Pix na entrega";
    const endCompleto = `${p.endereco}, ${p.bairro}, ${C.cidade} - ${C.uf}`;
    const gps = String(p.referencia || "").match(/q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    const mapa = gps ? `https://www.google.com/maps/search/?api=1&query=${gps[1]},${gps[2]}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endCompleto)}`;
    const prox = PROXIMO[p.status];
    const min = Math.round((Date.now() - Date.parse(p.criado_em)) / 60000);
    const tempo = min < 1 ? "agora" : min < 60 ? `há ${min} min` : `às ${hora(p.criado_em)}`;
    return `<article class="cartao pedido s-${p.status}">
      <div class="pedido-cab"><b>#${p.numero}</b><small>${tempo}</small><span class="etiqueta">${p.status === "enviado" ? "NOVO" : STATUS[p.status]}</span></div>
      <p class="qtd">${p.quantidade}× P13 ${p.troca ? "· troca" : "· <span style='color:var(--laranja-texto)'>sem vazio</span>"}</p>
      <p class="end">${esc(p.endereco)} — ${esc(p.bairro)}</p>
      ${p.referencia ? `<p class="meta">${esc(String(p.referencia).replace(/\s*·?\s*Localização: \S+/, "")) || "Localização por GPS enviada"}</p>` : ""}
      <p class="meta">${esc(p.nome)} · ${esc(fone(p.telefone))}</p>
      <p><b>${esc(pag)}</b> · ${total}</p>
      ${p.motivo ? `<p class="meta">Motivo: ${esc(p.motivo)}</p>` : ""}
      <div class="links">
        <a href="https://wa.me/55${esc(p.telefone)}" target="_blank" rel="noopener">${I.whats} WhatsApp</a>
        <a href="tel:${esc(p.telefone)}">${I.tel} Ligar</a>
        <a href="${mapa}" target="_blank" rel="noopener">${I.mapa} ${gps ? "Mapa (GPS)" : "Mapa"}</a>
      </div>
      ${prox ? `<div class="acoes">
        <button class="btn btn-primario" data-id="${p.id}" data-status="${prox.status}">${prox.rotulo}</button>
        ${p.status === "enviado" ? `<button class="btn btn-secundario" data-recusar="${p.id}" data-num="${p.numero}">Recusar</button>` : ""}
      </div>` : ""}
    </article>`;
  }

  function desenhaLista() {
    const $lista = document.getElementById("lista"); if (!$lista) return;
    document.querySelectorAll(".aba").forEach((b) => b.setAttribute("aria-selected", b.dataset.aba === aba));
    const ativos = pedidos.filter((p) => ATIVOS.includes(p.status))
      .sort((a, b) => ATIVOS.indexOf(a.status) - ATIVOS.indexOf(b.status) || Date.parse(a.criado_em) - Date.parse(b.criado_em));
    const fim = pedidos.filter((p) => !ATIVOS.includes(p.status));
    document.getElementById("cont-ativos").textContent = ativos.length;
    const lista = aba === "ativos" ? ativos : fim;
    $lista.innerHTML = lista.length ? lista.map(cartaoPedido).join("")
      : `<div class="vazio-lista">${aba === "ativos" ? "Nenhum pedido em andamento. Os novos aparecem aqui sozinhos, com aviso sonoro." : "Nenhum pedido finalizado nas últimas 24 horas."}</div>`;

    $lista.querySelectorAll("[data-status]").forEach((b) => (b.onclick = () => mudar(b, b.dataset.id, b.dataset.status)));
    $lista.querySelectorAll("[data-recusar]").forEach((b) => (b.onclick = () => recusar(b.dataset.recusar, b.dataset.num)));
  }

  async function mudar(botao, id, status, motivo) {
    ocupado = true; if (botao) { botao.disabled = true; botao.textContent = "Salvando…"; }
    try { await store.atualizarStatus(id, status, motivo); }
    catch (e) { alert(e.amigavel ? e.message : "Não foi possível atualizar."); }
    ocupado = false; carregaPedidos();
  }

  function recusar(id, num) {
    const dlg = document.getElementById("dlg-recusar"), f = document.getElementById("form-recusar"), m = document.getElementById("motivo");
    f.reset(); document.getElementById("dlg-num").textContent = `#${num}`;
    f.onchange = (e) => { if (e.target.name === "m") m.value = e.target.value; };
    dlg.onclose = () => { if (dlg.returnValue === "ok" && m.value.trim()) mudar(null, id, "recusado", m.value.trim()); };
    dlg.showModal();
  }

  function pararTimer() { if (timer) { clearInterval(timer); timer = null; } }

  iniciar();
})();
