/* Camada de dados: Supabase (produção) ou localStorage (modo demonstração). */
(function () {
  const C = window.GDB_CONFIG;
  const ATIVOS = ["enviado", "em_preparacao", "saiu_entrega"];

  function erro(msg) { const e = new Error(msg); e.amigavel = true; return e; }

  // ---------------- Supabase ----------------
  function storeSupabase() {
    const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey);
    const ok = ({ data, error }) => {
      if (error) throw erro(error.code === "P0001" ? error.message : "Não foi possível falar com o servidor. Tente de novo.");
      return data;
    };
    const num = (v) => (v == null ? null : Number(v));
    const normaliza = (p) => p && { ...p, preco_unitario: num(p.preco_unitario), troco_para: num(p.troco_para) };

    return {
      demo: false,
      async getLoja() {
        const d = ok(await sb.from("loja").select("preco_p13,aberto,aviso").eq("id", 1).single());
        return { preco: num(d.preco_p13), aberto: d.aberto, aviso: d.aviso };
      },
      async criarPedido(p) {
        const d = ok(await sb.rpc("criar_pedido", {
          p_quantidade: p.quantidade, p_troca: p.troca, p_nome: p.nome, p_telefone: p.telefone,
          p_endereco: p.endereco, p_bairro: p.bairro, p_referencia: p.referencia || "",
          p_pagamento: p.pagamento, p_troco_para: p.troco_para ?? null, p_cartao_tipo: p.cartao_tipo ?? null,
        }));
        return d[0];
      },
      async verPedido(id) { return normaliza(ok(await sb.rpc("ver_pedido", { p_id: id }))[0] || null); },
      async cancelarPedido(id) { return ok(await sb.rpc("cancelar_pedido", { p_id: id })); },

      // painel
      async entrar(email, senha) {
        const { error } = await sb.auth.signInWithPassword({ email, password: senha });
        if (error) throw erro("E-mail ou senha incorretos.");
        if (!(await this.ehEquipe())) { await sb.auth.signOut(); throw erro("Este login não tem acesso ao painel."); }
      },
      async sair() { await sb.auth.signOut(); },
      async ehEquipe() {
        const { data: s } = await sb.auth.getSession();
        if (!s.session) return false;
        const { data } = await sb.rpc("eh_equipe");
        return data === true;
      },
      async listarPedidos() {
        const desde = new Date(Date.now() - 24 * 3600e3).toISOString();
        const d = ok(await sb.from("pedidos").select("*")
          .or(`status.in.(${ATIVOS.join(",")}),criado_em.gte.${desde}`)
          .order("criado_em", { ascending: false }).limit(200));
        return d.map(normaliza);
      },
      async atualizarStatus(id, status, motivo) {
        const patch = { status };
        if (motivo !== undefined) patch.motivo = motivo;
        ok(await sb.from("pedidos").update(patch).eq("id", id));
      },
      async salvarLoja(patch) {
        const m = {};
        if ("preco" in patch) m.preco_p13 = patch.preco;
        if ("aberto" in patch) m.aberto = patch.aberto;
        if ("aviso" in patch) m.aviso = patch.aviso;
        m.atualizado_em = new Date().toISOString();
        ok(await sb.from("loja").update(m).eq("id", 1));
      },
    };
  }

  // ---------------- Demonstração (localStorage) ----------------
  function storeDemo() {
    const K_P = "gdb_demo_pedidos", K_L = "gdb_demo_loja", K_S = "gdb_demo_sessao";
    const ler = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
    const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
    const pedidos = () => ler(K_P, []);
    const espera = () => new Promise((r) => setTimeout(r, 250));

    return {
      demo: true,
      async getLoja() { await espera(); const l = ler(K_L, { preco: null, aberto: true, aviso: "" }); return l; },
      async criarPedido(p) {
        await espera();
        const loja = await this.getLoja();
        if (!loja.aberto) throw erro("O depósito está fechado no momento.");
        const lista = pedidos();
        const agora = new Date().toISOString();
        const novo = {
          ...p, id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
          numero: (lista.reduce((m, x) => Math.max(m, x.numero), 0) || 0) + 1,
          criado_em: agora, atualizado_em: agora, status: "enviado",
          preco_unitario: loja.preco, motivo: null,
          historico: [{ status: "enviado", em: agora }],
        };
        lista.unshift(novo); gravar(K_P, lista);
        return { id: novo.id, numero: novo.numero };
      },
      async verPedido(id) { await espera(); return pedidos().find((p) => p.id === id) || null; },
      async cancelarPedido(id) {
        const p = pedidos().find((x) => x.id === id);
        if (!p || p.status !== "enviado") return false;
        await this.atualizarStatus(id, "cancelado"); return true;
      },
      async entrar() { gravar(K_S, true); },
      async sair() { gravar(K_S, false); },
      async ehEquipe() { return ler(K_S, false); },
      async listarPedidos() {
        const desde = Date.now() - 24 * 3600e3;
        return pedidos().filter((p) => ATIVOS.includes(p.status) || Date.parse(p.criado_em) >= desde);
      },
      async atualizarStatus(id, status, motivo) {
        const lista = pedidos(); const p = lista.find((x) => x.id === id); if (!p) return;
        const agora = new Date().toISOString();
        if (p.status !== status) { p.historico.push({ status, em: agora }); p.atualizado_em = agora; }
        p.status = status; if (motivo !== undefined) p.motivo = motivo;
        gravar(K_P, lista);
      },
      async salvarLoja(patch) { const l = await this.getLoja(); gravar(K_L, { ...l, ...patch }); },
      limparDemo() { localStorage.removeItem(K_P); localStorage.removeItem(K_L); },
    };
  }

  const configurado = C.supabaseUrl && C.supabaseAnonKey && window.supabase;
  window.GDB = {
    store: configurado ? storeSupabase() : storeDemo(),
    ATIVOS,
    STATUS: {
      enviado: "Aguardando o depósito",
      em_preparacao: "Em preparação",
      saiu_entrega: "Saiu para entrega",
      entregue: "Entregue",
      recusado: "Recusado",
      cancelado: "Cancelado",
    },
    PAGAMENTO: { dinheiro: "Dinheiro", pix: "Pix", cartao: "Cartão na maquininha" },
    brl: (v) => v == null ? "" : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    esc: (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])),
    fone: (d) => { d = String(d || "").replace(/\D/g, ""); return d.length === 11 ? `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}` : d; },
    hora: (iso) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
  };
})();
