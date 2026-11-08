/* ============================================================
   Gás de Bairro — configuração
   Edite este arquivo para adaptar o app ao seu depósito.
   ============================================================ */
window.GDB_CONFIG = {
  // --- Banco de dados (Supabase) ---------------------------------
  // Deixe em branco para rodar em MODO DEMONSTRAÇÃO (dados só no navegador).
  // Preencha com os dados de Project Settings → API no Supabase.
  // A "anon key" é pública por natureza; a segurança vem das regras no schema.sql.
  supabaseUrl: "",
  supabaseAnonKey: "",

  // --- Depósito ---------------------------------------------------
  cidade: "Eldorado do Sul",
  uf: "RS",

  // Texto livre exibido ao cliente, ex.: "Seg a sáb, 8h às 19h".
  // Vazio = não mostra nada. O botão Aberto/Fechado do painel é que libera pedidos.
  horarioTexto: "",

  // Telefone do depósito para dúvidas (opcional). Ex.: "(51) 99999-0000"
  telefoneDeposito: "",

  // Bairros atendidos. Vazio = cliente digita o bairro livremente.
  // Preenchido = vira uma lista de escolha (pedidos fora dela não são aceitos).
  // Ex.: ["Centro", "Cidade Verde", "Medianeira"]
  bairrosAtendidos: [],

  // Quantidade máxima de botijões por pedido.
  maxQuantidade: 3,

  // Usado SOMENTE no modo demonstração, sempre com o selo "preço ilustrativo".
  // O preço real é definido pelo painel do depósito.
  precoIlustrativo: 120.0,
};
