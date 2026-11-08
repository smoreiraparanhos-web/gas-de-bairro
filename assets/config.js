/* ============================================================
   Gás de Bairro — configuração
   Edite este arquivo para adaptar o app ao seu depósito.
   ============================================================ */
window.GDB_CONFIG = {
  // --- Como os pedidos chegam ------------------------------------
  // 1) WhatsApp (funciona na hora): preencha whatsappDeposito com DDD, só números.
  //    O cliente monta o pedido no app e ele chega pronto como mensagem no seu WhatsApp.
  whatsappDeposito: "",

  // 2) Painel com acompanhamento automático (Supabase): preencha os dois campos abaixo
  //    (Project Settings → API). Quando preenchidos, têm prioridade sobre o WhatsApp.
  supabaseUrl: "",
  supabaseAnonKey: "",

  // Sem nenhum dos dois, o app roda em MODO DEMONSTRAÇÃO, com faixa de aviso.

  // --- Depósito ---------------------------------------------------
  cidade: "Eldorado do Sul",
  uf: "RS",

  // Texto livre exibido ao cliente, ex.: "Seg a sáb, 8h às 19h". Vazio = não mostra.
  horarioTexto: "",

  // Bairros da cidade (fonte: Prefeitura de Eldorado do Sul). O cliente escolhe da lista
  // ou toca em "Outro bairro" e digita. Remova os bairros onde você não entrega.
  bairros: [
    "Bom Retiro", "Centro", "Centro Novo", "Chácara", "Cidade Verde", "Delta do Jacuí",
    "Gardenville", "Industrial", "Itaí", "Medianeira", "Parque Eldorado", "Picada",
    "Progresso", "Sans Souci", "Sol Nascente", "Vila da Paz",
  ],
  permitirOutroBairro: true,

  // Quantidade máxima de botijões por pedido.
  maxQuantidade: 3,

  // --- Preço ------------------------------------------------------
  // Preço do SEU depósito para o P13. Deixe null para mostrar a média de referência abaixo.
  // (No modo Supabase, o preço é definido pelo painel e este campo é ignorado.)
  precoDeposito: null,

  // Referência pública, exibida com o aviso "preço de referência · confirmado na entrega"
  // enquanto o depósito não informar o próprio preço.
  precoReferencia: 117.89,
  precoReferenciaFonte: "média no RS, ANP, out/2026",
};
