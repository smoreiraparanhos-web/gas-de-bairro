/* App do cliente: pedido → endereço → pagamento → confirmar → acompanhar */
(function () {
  const C = window.GDB_CONFIG, { store, brl, esc, fone, hora, PAGAMENTO, ATIVOS } = window.GDB, I = window.ICONES;
  const $app = document.getElementById("app"), $rodape = document.getElementById("rodape");

  // ---------- Estado salvo no aparelho ----------
  const ler = (k, p) => { try { return JSON.parse(localStorage.getItem(k)) ?? p; } catch { return p; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const st = {
    qtd: 1, troca: true,
    end: ler("gdb_endereco", null),
    pag: ler("gdb_pagamento", null),
    ultimo: ler("gdb_ultimo_pedido", null), // { id, numero }
    loja: null,
  };
  let timer = null, enviando = false;

  if (store.demo) {
    document.getElementById("faixa").innerHTML =
      `<div class="faixa-demo"><b>Modo demonstração</b> · pedidos ficam só neste navegador e não chegam a nenhum depósito.</div>`;
  }

  // ---------- Utilidades ----------
  const ir = (h) => { location.hash = h; };
  const digitos = (s) => String(s || "").replace(/\D/g, "");
  const parseValor = (s) => { const n = Number(String(s || "").replace(/\./g, "").replace(",", ".")); return isFinite(n) && n > 0 ? n : null; };
  const rodape = (html) => { $rodape.innerHTML = html ? `<div class="rodape-fixo"><div>${html}</div></div>` : ""; };
  const precoAtual = () => st.loja?.preco ?? (store.demo ? C.precoIlustrativo : null);
  const precoIlustrativo = () => st.loja?.preco == null && store.demo;
  const textoPag = (p) => {
    if (!p) return "";
    if (p.tipo === "dinheiro") return p.troco ? `Dinheiro · troco para ${brl(p.troco)}` : "Dinheiro · sem troco";
    if (p.tipo === "cartao") return `Cartão de ${p.cartao === "credito" ? "crédito" : "débito"} na maquininha`;
    return "Pix na entrega";
  };
  const topo = (comCidade = true) => `
    <header class="topo">
      <a class="logo" href="#/" aria-label="Gás de Bairro, início">${I.logo(58)}<span class="logo-nome">Gás de Bairro</span></a>
      ${comCidade ? `<label class="cidade">${I.pin}<span class="oculto">Cidade</span>
        <select aria-label="Cidade"><option>${esc(C.cidade)}</option></select></label>` : ""}
    </header>`;
  const voltar = (para = "#/") => `<a class="voltar" href="${para}">${I.voltar} Voltar</a>`;

  // ---------- Telas ----------
  async function telaPedido() {
    $app.innerHTML = topo() + `<div class="carregando">Carregando…</div>`; rodape("");
    try { st.loja = await store.getLoja(); } catch (e) { return telaErro(e); }

    const preco = precoAtual(), loja = st.loja;
    const precoHtml = preco != null
      ? `<div class="preco">${brl(preco)}</div>${precoIlustrativo() ? `<span class="selo">preço ilustrativo</span>` : ""}`
      : `<div class="preco-confirmar">Preço informado pelo depósito</div>`;

    let andamento = "";
    if (st.ultimo) {
      andamento = `<div class="aviso aviso-verde" id="andamento" hidden>${I.caminhao}<span>Você tem um pedido em andamento.</span>
        <a class="btn-mini" href="#/pedido/${esc(st.ultimo.id)}">Acompanhar</a></div>`;
    }

    $app.innerHTML = topo() + `
      ${andamento}
      ${!loja.aberto ? `<div class="aviso aviso-vermelho">O depósito está fechado agora e não está recebendo pedidos.${C.horarioTexto ? `<br>Horário: ${esc(C.horarioTexto)}` : ""}</div>` : ""}
      ${loja.aviso ? `<div class="aviso aviso-laranja">${esc(loja.aviso)}</div>` : ""}
      <div>
        <h1>Gás na sua porta,<br>sem precisar ligar.</h1>
        <p class="sub">Entrega em ${esc(C.cidade)}${C.horarioTexto && loja.aberto ? ` · ${esc(C.horarioTexto)}` : ""}</p>
      </div>
      <section class="cartao produto" aria-label="Botijão P13">
        <div class="produto-img">${I.botijao}</div>
        <div>
          <h2>Botijão P13</h2>
          <p class="peso">13 kg · gás de cozinha</p>
          ${precoHtml}
        </div>
        <div class="produto-opcoes">
          <div class="linha-qtd"><span id="lbl-qtd">Quantidade</span>
            <div class="stepper" role="group" aria-labelledby="lbl-qtd">
              <button type="button" id="menos" aria-label="Diminuir">−</button>
              <output id="qtd" aria-live="polite">${st.qtd}</output>
              <button type="button" id="mais" aria-label="Aumentar">+</button>
            </div>
          </div>
          <label class="troca"><input type="checkbox" id="troca" ${st.troca ? "checked" : ""}>
            <span>Tenho botijão vazio para troca<small id="troca-dica">${st.troca ? "O entregador leva o vazio." : "Sem vazio, o depósito cobra o vasilhame à parte."}</small></span>
          </label>
        </div>
      </section>
      <nav class="cartao lista" aria-label="Dados da entrega">
        <a class="linha" href="#/endereco">
          <span class="linha-icone">${I.casa}</span>
          <span class="linha-texto"><span class="linha-titulo">Endereço de entrega</span>
            <span class="linha-valor ${st.end ? "" : "vazio"}">${st.end ? esc(`${st.end.endereco} · ${st.end.bairro}`) : "Toque para informar"}</span></span>
          ${I.seta}
        </a>
        <a class="linha" href="#/pagamento">
          <span class="linha-icone">${I.carteira}</span>
          <span class="linha-texto"><span class="linha-titulo">Pagamento na entrega</span>
            <span class="linha-valor ${st.pag ? "" : "vazio"}">${st.pag ? esc(textoPag(st.pag)) : "Dinheiro, Pix ou cartão"}</span></span>
          ${I.seta}
        </a>
      </nav>
      ${C.telefoneDeposito ? `<p class="nota" style="text-align:center">Dúvidas? Depósito: <a href="tel:${digitos(C.telefoneDeposito)}">${esc(C.telefoneDeposito)}</a></p>` : ""}`;

    const total = () => preco != null ? `<div class="total-rodape"><span>Total${precoIlustrativo() ? " (ilustrativo)" : ""}</span><b>${brl(preco * st.qtd)}</b></div>` : "";
    const desenhaRodape = () => rodape(`${total()}<button class="btn btn-primario" id="pedir" ${loja.aberto ? "" : "disabled"}>Pedir botijão</button>`);
    desenhaRodape();

    const atualizaQtd = () => {
      document.getElementById("qtd").textContent = st.qtd;
      document.getElementById("menos").disabled = st.qtd <= 1;
      document.getElementById("mais").disabled = st.qtd >= C.maxQuantidade;
      desenhaRodape(); ligaPedir();
    };
    document.getElementById("menos").onclick = () => { st.qtd = Math.max(1, st.qtd - 1); atualizaQtd(); };
    document.getElementById("mais").onclick = () => { st.qtd = Math.min(C.maxQuantidade, st.qtd + 1); atualizaQtd(); };
    document.getElementById("troca").onchange = (e) => {
      st.troca = e.target.checked;
      document.getElementById("troca-dica").textContent = st.troca ? "O entregador leva o vazio." : "Sem vazio, o depósito cobra o vasilhame à parte.";
    };
    const ligaPedir = () => {
      document.getElementById("pedir").onclick = () => {
        if (!st.end) return ir("#/endereco?seguir=1");
        if (!st.pag) return ir("#/pagamento?seguir=1");
        ir("#/confirmar");
      };
    };
    atualizaQtd();

    // Mostra o atalho só se o último pedido ainda estiver ativo
    if (st.ultimo) {
      store.verPedido(st.ultimo.id).then((p) => {
        const el = document.getElementById("andamento");
        if (p && ATIVOS.includes(p.status)) { if (el) el.hidden = false; }
        else { st.ultimo = null; gravar("gdb_ultimo_pedido", null); el?.remove(); }
      }).catch(() => {});
    }
  }

  function telaEndereco(seguir) {
    const e = st.end || {};
    const bairros = C.bairrosAtendidos || [];
    const campoBairro = bairros.length
      ? `<select id="bairro" name="bairro" required><option value="">Escolha o bairro</option>${bairros.map((b) => `<option ${b === e.bairro ? "selected" : ""}>${esc(b)}</option>`).join("")}</select>
         <div class="dica" style="margin-top:6px">Não achou seu bairro? No momento o depósito não entrega aí.</div>`
      : `<input id="bairro" name="bairro" autocomplete="address-level3" value="${esc(e.bairro || "")}" required maxlength="80">`;

    $app.innerHTML = `${voltar()}
      <div><h1>Endereço de entrega</h1><p class="sub">Fica salvo neste aparelho para o próximo pedido.</p></div>
      <form class="form" id="form" novalidate>
        <div class="campo"><label for="nome">Seu nome</label>
          <input id="nome" name="nome" autocomplete="name" value="${esc(e.nome || "")}" required maxlength="80"></div>
        <div class="campo"><label for="telefone">WhatsApp <span class="dica">· só se o entregador precisar falar com você</span></label>
          <input id="telefone" name="telefone" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="(51) 9____-____" value="${esc(fone(e.telefone || ""))}" required></div>
        <div class="campo"><label for="endereco">Rua e número</label>
          <input id="endereco" name="endereco" autocomplete="street-address" value="${esc(e.endereco || "")}" required maxlength="160"></div>
        <div class="campo"><label for="bairro">Bairro</label>${campoBairro}</div>
        <div class="campo"><label for="referencia">Complemento ou ponto de referência <span class="dica">· opcional</span></label>
          <textarea id="referencia" name="referencia" maxlength="200" placeholder="Ex.: casa de portão verde, ao lado do mercado">${esc(e.referencia || "")}</textarea></div>
      </form>`;
    rodape(`<button class="btn btn-primario" type="submit" form="form">${seguir ? "Continuar" : "Salvar endereço"}</button>`);

    const tel = document.getElementById("telefone");
    tel.addEventListener("input", () => { tel.value = fone(digitos(tel.value).slice(0, 11)); });

    document.getElementById("form").onsubmit = (ev) => {
      ev.preventDefault();
      const f = ev.target, d = Object.fromEntries(new FormData(f));
      Object.keys(d).forEach((k) => (d[k] = String(d[k]).trim()));
      d.telefone = digitos(d.telefone);
      const erros = {};
      if (d.nome.length < 2) erros.nome = "Informe seu nome.";
      if (d.telefone.length < 10) erros.telefone = "Informe o número com DDD.";
      if (d.endereco.length < 5) erros.endereco = "Informe a rua e o número.";
      if (d.bairro.length < 2) erros.bairro = "Informe o bairro.";
      f.querySelectorAll(".campo").forEach((c) => { c.classList.remove("invalido"); c.querySelector(".erro")?.remove(); });
      const chaves = Object.keys(erros);
      if (chaves.length) {
        chaves.forEach((k) => {
          const el = document.getElementById(k), c = el.closest(".campo");
          c.classList.add("invalido"); el.setAttribute("aria-invalid", "true");
          c.insertAdjacentHTML("beforeend", `<div class="erro">${erros[k]}</div>`);
        });
        document.getElementById(chaves[0]).focus();
        return;
      }
      st.end = d; gravar("gdb_endereco", d);
      ir(seguir ? (st.pag ? "#/confirmar" : "#/pagamento?seguir=1") : "#/");
    };
  }

  function telaPagamento(seguir) {
    const p = st.pag || {};
    const trocos = [50, 100, 150, 200];
    $app.innerHTML = `${voltar()}
      <div><h1>Pagamento na entrega</h1><p class="sub">Você paga direto ao entregador. Nada é cobrado pelo app.</p></div>
      <form class="form" id="form">
        <div class="opcoes" role="radiogroup" aria-label="Forma de pagamento">
          <label class="opcao"><input type="radio" name="tipo" value="dinheiro" ${p.tipo === "dinheiro" ? "checked" : ""}>
            <span class="linha-icone">${I.dinheiro}</span><span class="opcao-texto"><b>Dinheiro</b><small>Diga se precisa de troco</small></span></label>
          <div class="opcao-extra" data-para="dinheiro">
            <div class="campo"><label>Troco para quanto?</label>
              <div class="chips">
                <label class="chip"><input type="radio" name="troco" value="" ${!p.troco ? "checked" : ""}><span>Não preciso</span></label>
                ${trocos.map((t) => `<label class="chip"><input type="radio" name="troco" value="${t}" ${p.troco === t ? "checked" : ""}><span>R$ ${t}</span></label>`).join("")}
                <label class="chip"><input type="radio" name="troco" value="outro" ${p.troco && !trocos.includes(p.troco) ? "checked" : ""}><span>Outro valor</span></label>
              </div>
              <input id="troco-outro" inputmode="decimal" placeholder="R$" style="margin-top:10px" value="${p.troco && !trocos.includes(p.troco) ? String(p.troco).replace(".", ",") : ""}" aria-label="Outro valor de troco">
            </div>
          </div>
          <label class="opcao"><input type="radio" name="tipo" value="pix" ${p.tipo === "pix" ? "checked" : ""}>
            <span class="linha-icone">${I.pix}</span><span class="opcao-texto"><b>Pix</b><small>O entregador mostra a chave ou o QR na hora</small></span></label>
          <label class="opcao"><input type="radio" name="tipo" value="cartao" ${p.tipo === "cartao" ? "checked" : ""}>
            <span class="linha-icone">${I.cartao}</span><span class="opcao-texto"><b>Cartão na maquininha</b><small>Débito ou crédito</small></span></label>
          <div class="opcao-extra" data-para="cartao">
            <div class="chips">
              <label class="chip"><input type="radio" name="cartao" value="debito" ${p.cartao !== "credito" ? "checked" : ""}><span>Débito</span></label>
              <label class="chip"><input type="radio" name="cartao" value="credito" ${p.cartao === "credito" ? "checked" : ""}><span>Crédito</span></label>
            </div>
          </div>
        </div>
        <div class="erro oculto" id="erro-pag" style="color:var(--vermelho);font-weight:700"></div>
      </form>`;
    rodape(`<button class="btn btn-primario" type="submit" form="form">${seguir ? "Continuar" : "Salvar pagamento"}</button>`);

    const f = document.getElementById("form"), outro = document.getElementById("troco-outro");
    const sincroniza = () => {
      const tipo = f.tipo.value;
      f.querySelectorAll(".opcao-extra").forEach((el) => el.classList.toggle("oculto", el.dataset.para !== tipo));
      outro.classList.toggle("oculto", f.troco.value !== "outro");
    };
    f.addEventListener("change", sincroniza); sincroniza();
    outro.addEventListener("focus", () => { f.querySelector('input[name=troco][value=outro]').checked = true; });

    f.onsubmit = (ev) => {
      ev.preventDefault();
      const erro = document.getElementById("erro-pag");
      const tipo = f.tipo.value;
      if (!tipo) { erro.textContent = "Escolha uma forma de pagamento."; erro.classList.remove("oculto"); return; }
      const novo = { tipo };
      if (tipo === "dinheiro") {
        const t = f.troco.value;
        if (t === "outro") {
          const v = parseValor(outro.value);
          if (!v) { erro.textContent = "Informe o valor para o troco."; erro.classList.remove("oculto"); outro.focus(); return; }
          novo.troco = v;
        } else if (t) novo.troco = Number(t);
      }
      if (tipo === "cartao") novo.cartao = f.cartao.value || "debito";
      st.pag = novo; gravar("gdb_pagamento", novo);
      ir(seguir ? (st.end ? "#/confirmar" : "#/endereco?seguir=1") : "#/");
    };
  }

  async function telaConfirmar() {
    if (!st.end) return ir("#/endereco?seguir=1");
    if (!st.pag) return ir("#/pagamento?seguir=1");
    if (!st.loja) { try { st.loja = await store.getLoja(); } catch (e) { return telaErro(e); } }
    const preco = precoAtual();
    const ilustr = precoIlustrativo();
    const trocoBaixo = st.pag.tipo === "dinheiro" && st.pag.troco && preco != null && st.pag.troco < preco * st.qtd;

    $app.innerHTML = `${voltar()}
      <div><h1>Confira seu pedido</h1><p class="sub">Se estiver tudo certo, é só confirmar.</p></div>
      <section class="cartao resumo"><dl>
        <dt>Pedido</dt><dd>${st.qtd}× Botijão P13</dd>
        <dt>Vasilhame</dt><dd>${st.troca ? "Tenho vazio para troca" : "Sem vazio (cobrado à parte)"}</dd>
        <dt>Entregar para</dt><dd>${esc(st.end.nome)}</dd>
        <dt>Endereço</dt><dd>${esc(st.end.endereco)}<br>${esc(st.end.bairro)} · ${esc(C.cidade)}${st.end.referencia ? `<br><span style="font-weight:600">${esc(st.end.referencia)}</span>` : ""}</dd>
        <dt>WhatsApp</dt><dd>${esc(fone(st.end.telefone))}</dd>
        <dt>Pagamento</dt><dd>${esc(textoPag(st.pag))}</dd>
        ${preco != null ? `<dt class="total">Total${ilustr ? "*" : ""}</dt><dd class="total">${brl(preco * st.qtd)}</dd>` : ""}
      </dl></section>
      ${trocoBaixo ? `<div class="aviso aviso-laranja">O troco informado (${brl(st.pag.troco)}) é menor que o total. <a href="#/pagamento">Ajustar</a></div>` : ""}
      <p class="nota">${preco == null ? "O valor é confirmado pelo depósito. " : ""}${ilustr ? "* Preço ilustrativo do modo demonstração. " : ""}${!st.troca ? "Sem botijão vazio, o vasilhame é cobrado à parte pelo depósito. " : ""}Você paga somente na entrega.</p>
      <p class="nota"><a href="#/endereco">Alterar endereço</a> · <a href="#/pagamento">Alterar pagamento</a></p>
      <div id="erro"></div>`;
    rodape(`<button class="btn btn-primario" id="confirmar" ${st.loja.aberto ? "" : "disabled"}>${st.loja.aberto ? "Confirmar pedido" : "Depósito fechado agora"}</button>`);

    document.getElementById("confirmar").onclick = async (ev) => {
      if (enviando) return;
      enviando = true; const b = ev.currentTarget; b.disabled = true; b.textContent = "Enviando…";
      try {
        const r = await store.criarPedido({
          quantidade: st.qtd, troca: st.troca, nome: st.end.nome, telefone: st.end.telefone,
          endereco: st.end.endereco, bairro: st.end.bairro, referencia: st.end.referencia,
          pagamento: st.pag.tipo, troco_para: st.pag.troco ?? null, cartao_tipo: st.pag.cartao ?? null,
        });
        st.ultimo = { id: r.id, numero: r.numero }; gravar("gdb_ultimo_pedido", st.ultimo);
        st.qtd = 1;
        ir(`#/pedido/${r.id}`);
      } catch (e) {
        document.getElementById("erro").innerHTML = `<div class="aviso aviso-vermelho" role="alert">${esc(e.amigavel ? e.message : "Não foi possível enviar. Verifique sua internet e tente de novo.")}</div>`;
        b.disabled = false; b.textContent = "Tentar de novo";
      } finally { enviando = false; }
    };
  }

  async function telaAcompanhar(id) {
    rodape("");
    let detalhesAbertos = false, primeira = true;
    async function carrega() {
      let p;
      try { p = await store.verPedido(id); }
      catch (e) { if (primeira) telaErro(e); return; }
      if (!p) { $app.innerHTML = topo(false) + `<div class="aviso aviso-vermelho">Pedido não encontrado.</div>`; rodape(`<a class="btn btn-primario" href="#/">Fazer um pedido</a>`); return; }
      primeira = false;
      desenha(p);
    }

    function desenha(p) {
      const h = {}; (p.historico || []).forEach((x) => { h[x.status] = x.em; });
      const ordem = ["enviado", "em_preparacao", "saiu_entrega", "entregue"];
      const idx = ordem.indexOf(p.status);
      const falhou = p.status === "recusado" || p.status === "cancelado";

      let icone, titulo, sub;
      if (p.status === "enviado") { icone = `<div class="status-icone espera">${I.relogio}</div>`; titulo = "Pedido enviado"; sub = "Aguardando o depósito confirmar. Você não precisa ligar: esta tela atualiza sozinha."; }
      else if (p.status === "entregue") { icone = `<div class="status-icone ok">${I.checkGrande}</div>`; titulo = "Pedido entregue!"; sub = "Obrigado por pedir pelo Gás de Bairro."; }
      else if (p.status === "recusado") { icone = `<div class="status-icone erro">${I.x}</div>`; titulo = "O depósito não pôde atender"; sub = p.motivo ? `Motivo: ${esc(p.motivo)}` : "Tente de novo mais tarde."; }
      else if (p.status === "cancelado") { icone = `<div class="status-icone erro">${I.x}</div>`; titulo = "Pedido cancelado"; sub = ""; }
      else { icone = `<div class="status-icone ok">${I.checkGrande}</div>`; titulo = "Pedido aceito"; sub = p.status === "saiu_entrega" ? "O entregador está a caminho." : "O depósito está separando seu botijão."; }

      const passos = [
        { s: "enviado", t: "Pedido recebido", d: p.status === "enviado" ? "Aguardando confirmação do depósito" : "Confirmado pelo depósito", quando: h.em_preparacao || h.enviado },
        { s: "em_preparacao", t: "Em preparação", quando: h.em_preparacao },
        { s: "saiu_entrega", t: "Saiu para entrega", quando: h.saiu_entrega },
        { s: "entregue", t: "Entregue", quando: h.entregue },
      ];
      const tl = falhou ? "" : `<section class="cartao"><ol class="timeline">${passos.map((x, i) => {
        // passo 0 fica "feito" assim que o depósito aceita; enquanto "enviado", fica "atual"
        const cls = i < idx || (i === idx && p.status === "entregue") ? "feito" : i === idx ? "atual" : "pendente";
        const feito = cls === "feito";
        return `<li class="${cls}"><span class="ponto">${feito ? I.check : ""}</span>
          <span class="tl-texto"><b>${x.t}</b>${x.d ? `<small>${x.d}</small>` : ""}</span>
          <span class="tl-hora">${feito && x.quando ? hora(x.quando) : ""}</span></li>`;
      }).join("")}</ol></section>`;

      const total = p.preco_unitario != null ? brl(p.preco_unitario * p.quantidade) : "Confirmado pelo depósito";
      const pagTxt = p.pagamento === "dinheiro" ? (p.troco_para ? `Dinheiro · troco para ${brl(p.troco_para)}` : "Dinheiro · sem troco")
        : p.pagamento === "cartao" ? `Cartão de ${p.cartao_tipo === "credito" ? "crédito" : "débito"}` : "Pix na entrega";

      $app.innerHTML = topo(false) + `
        <div class="status-topo">${icone}<h1>${titulo}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}
          <span class="numero">Pedido nº ${p.numero} · ${new Date(p.criado_em).toLocaleDateString("pt-BR")} às ${hora(p.criado_em)}</span></div>
        ${tl}
        <section class="cartao resumo ${detalhesAbertos ? "" : "oculto"}" id="detalhes"><dl>
          <dt>Pedido</dt><dd>${p.quantidade}× Botijão P13</dd>
          <dt>Vasilhame</dt><dd>${p.troca ? "Com troca" : "Sem vazio"}</dd>
          <dt>Endereço</dt><dd>${esc(p.endereco)}<br>${esc(p.bairro)}${p.referencia ? `<br><span style="font-weight:600">${esc(p.referencia)}</span>` : ""}</dd>
          <dt>Pagamento</dt><dd>${esc(pagTxt)}</dd>
          <dt class="total">Total</dt><dd class="total">${total}</dd>
        </dl></section>
        ${ATIVOS.includes(p.status) ? `<p class="atualizado">Atualiza automaticamente · última verificação às ${hora(new Date().toISOString())}</p>` : ""}
        ${p.status === "enviado" ? `<button class="btn btn-texto" id="cancelar">Cancelar pedido</button>` : ""}
        ${C.telefoneDeposito ? `<p class="nota" style="text-align:center">Precisa falar com o depósito? <a href="tel:${digitos(C.telefoneDeposito)}">${esc(C.telefoneDeposito)}</a></p>` : ""}`;

      const fim = !ATIVOS.includes(p.status);
      rodape(fim
        ? `<a class="btn btn-primario" href="#/">Fazer novo pedido</a>`
        : `<button class="btn btn-secundario" id="ver-detalhes" aria-expanded="${detalhesAbertos}" aria-controls="detalhes">${detalhesAbertos ? "Ocultar detalhes" : "Ver detalhes"}</button>`);
      document.getElementById("ver-detalhes")?.addEventListener("click", () => { detalhesAbertos = !detalhesAbertos; desenha(p); });
      if (fim) { document.getElementById("detalhes").classList.remove("oculto"); pararTimer(); if (st.ultimo?.id === p.id) { st.ultimo = null; gravar("gdb_ultimo_pedido", null); } }
      document.getElementById("cancelar")?.addEventListener("click", async (ev) => {
        if (!confirm("Cancelar este pedido?")) return;
        ev.target.disabled = true;
        try { const ok = await store.cancelarPedido(p.id); if (!ok) alert("O depósito já aceitou o pedido. Para cancelar, fale com o depósito."); }
        catch (e) { alert(e.amigavel ? e.message : "Não foi possível cancelar agora."); }
        carrega();
      });
    }

    $app.innerHTML = topo(false) + `<div class="carregando">Carregando pedido…</div>`;
    await carrega();
    pararTimer();
    timer = setInterval(carrega, store.demo ? 3000 : 10000);
    if (store.demo) window.addEventListener("storage", carrega, { once: true });
  }

  function telaErro(e) {
    $app.innerHTML = topo() + `<div class="aviso aviso-vermelho" role="alert">${esc(e?.amigavel ? e.message : "Não foi possível carregar. Verifique sua internet.")}</div>`;
    rodape(`<button class="btn btn-primario" onclick="location.reload()">Tentar de novo</button>`);
  }

  function pararTimer() { if (timer) { clearInterval(timer); timer = null; } }

  // ---------- Rotas ----------
  function rota() {
    pararTimer();
    const [caminho, qs] = (location.hash.slice(1) || "/").split("?");
    const seguir = new URLSearchParams(qs || "").has("seguir");
    window.scrollTo(0, 0);
    if (caminho === "/endereco") return telaEndereco(seguir);
    if (caminho === "/pagamento") return telaPagamento(seguir);
    if (caminho === "/confirmar") return telaConfirmar();
    const m = caminho.match(/^\/pedido\/([\w-]+)$/);
    if (m) return telaAcompanhar(m[1]);
    return telaPedido();
  }
  window.addEventListener("hashchange", rota);
  rota();
})();
