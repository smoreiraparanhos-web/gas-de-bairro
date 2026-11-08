/* Ícones e ilustrações em SVG (sem dependências externas). */
window.ICONES = (function () {
  const s = (d, w = 24, extra = "") =>
    `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;

  // Logo: toldo laranja listrado com borda ondulada
  const logo = (largura = 64) => `
  <svg width="${largura}" height="${largura * 0.56}" viewBox="0 0 64 36" aria-hidden="true">
    <rect x="1" y="1" width="62" height="6" rx="3" fill="#1A2B4C"/>
    <rect x="4" y="6" width="56" height="20" fill="#E8600F"/>
    <g fill="#FFF5E4"><rect x="11" y="6" width="7" height="20"/><rect x="25" y="6" width="7" height="20"/><rect x="39" y="6" width="7" height="20"/><rect x="53" y="6" width="7" height="20"/></g>
    <path d="M4 26a3.5 3.5 0 0 0 7 0 3.5 3.5 0 0 0 7 0 3.5 3.5 0 0 0 7 0 3.5 3.5 0 0 0 7 0 3.5 3.5 0 0 0 7 0 3.5 3.5 0 0 0 7 0 3.5 3.5 0 0 0 7 0 3.5 3.5 0 0 0 7 0z" fill="#E8600F"/>
    <g fill="#FFF5E4"><path d="M11 26a3.5 3.5 0 0 0 7 0z"/><path d="M25 26a3.5 3.5 0 0 0 7 0z"/><path d="M39 26a3.5 3.5 0 0 0 7 0z"/><path d="M53 26a3.5 3.5 0 0 0 7 0z"/></g>
  </svg>`;

  // Ilustração do botijão P13
  const botijao = `
  <svg width="62" height="80" viewBox="0 0 62 80" aria-hidden="true">
    <path d="M17 4h28a3 3 0 0 1 3 3v12H14V7a3 3 0 0 1 3-3z" fill="#1A2B4C"/>
    <rect x="21" y="8" width="20" height="7" rx="3.5" fill="#FBE8CB"/>
    <rect x="27" y="16" width="8" height="7" rx="2" fill="#56637D"/>
    <path d="M10 26c0-4 4-7 9-7h24c5 0 9 3 9 7v38c0 6-4 10-10 10H20c-6 0-10-4-10-10z" fill="#E8600F"/>
    <path d="M10 40h42v8H10z" fill="#CF520A"/>
    <path d="M17 27c0 0-1 10-1 24s1 16 1 16" stroke="#FFB27A" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M14 74h34v3a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2z" fill="#1A2B4C"/>
  </svg>`;

  return {
    logo, botijao,
    pin: s('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', 18),
    casa: s('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
    carteira: s('<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><circle cx="16.5" cy="14.5" r="1.2" fill="currentColor"/>'),
    seta: s('<path d="m9 6 6 6-6 6"/>', 22),
    voltar: s('<path d="m15 6-6 6 6 6"/>', 22),
    check: s('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 20, 'style="stroke-width:3.2"'),
    checkGrande: s('<path d="m5 12.5 4.5 4.5L19 7.5"/>', 48),
    relogio: s('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 44),
    x: s('<path d="M6 6l12 12M18 6 6 18"/>', 40),
    caminhao: s('<path d="M3 6h11v10H3z"/><path d="M14 9h4l3 3v4h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>'),
    dinheiro: s('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9v.01M18 15v.01"/>', 26),
    pix: s('<path d="m12 3 4 4-4 4-4-4z"/><path d="m12 13 4 4-4 4-4-4z"/><path d="m3 12 4-4 4 4-4 4z"/><path d="m13 12 4-4 4 4-4 4z"/>', 26),
    cartao: s('<rect x="5" y="2.5" width="14" height="19" rx="2.5"/><rect x="8" y="5.5" width="8" height="5" rx="1"/><path d="M8.5 14h.01M12 14h.01M15.5 14h.01M8.5 17.5h.01M12 17.5h.01M15.5 17.5h.01"/>', 26),
    whats: s('<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z" fill="currentColor" stroke-width="1"/>', 18),
    mapa: s('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>', 18),
    tel: s('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>', 18),
  };
})();
