/*
 * Atribuição de variante e preservação de parâmetros de campanha.
 * Carregado de forma síncrona no <head>, logo após config.js, para que a
 * headline seja trocada antes da primeira pintura (sem piscar).
 */
(function () {
  var cfg = window.LP_CONFIG;
  var params = new URLSearchParams(location.search);
  var preview = cfg.mode === "homologacao" || params.get("preview") === "1";

  function store(kind, key, value) {
    try { window[kind].setItem(key, value); } catch (e) { /* armazenamento bloqueado */ }
  }
  function read(kind, key) {
    try { return window[kind].getItem(key); } catch (e) { return null; }
  }

  // A variante E só aparece em homologação enquanto a garantia não for aprovada.
  function isAllowed(id, viaUrl) {
    var v = cfg.variants[id];
    if (!v) return false;
    if (v.requiresGuarantee && !cfg.guaranteeApproved && !(viaUrl && preview)) return false;
    return true;
  }

  // 1) ?v= na URL (coerência com o grupo de anúncios) tem prioridade.
  // 2) Depois, a variante já sorteada para este visitante.
  // 3) Por fim, sorteio entre as variantes ativas, gravado para não mudar a cada recarga.
  var fromUrl = (params.get("v") || "").toLowerCase();
  var saved = read("localStorage", cfg.experiment.storageKey);
  var pool = cfg.experiment.activeVariants.filter(isAllowed);
  var variant;
  var source;

  if (isAllowed(fromUrl, true)) {
    variant = fromUrl; source = "url";
  } else if (saved && pool.indexOf(saved) !== -1) {
    variant = saved; source = "stored";
  } else {
    variant = pool[Math.floor(Math.random() * pool.length)] || "control";
    source = "random";
  }
  if (source === "stored" || source === "random") store("localStorage", cfg.experiment.storageKey, variant);

  // Parâmetros de campanha: o primeiro toque da sessão é preservado.
  var tracking = {};
  cfg.trackingParams.forEach(function (key) {
    var value = params.get(key) || read("sessionStorage", "tpl_" + key);
    if (value) {
      tracking[key] = value.slice(0, 200);
      store("sessionStorage", "tpl_" + key, tracking[key]);
    }
  });

  function termHeadline(term, rules) {
    if (!term) return "";
    var t = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (var i = 0; i < rules.length; i++) {
      for (var j = 0; j < rules[i].keys.length; j++) {
        if (t.indexOf(rules[i].keys[j]) !== -1) return rules[i].text;
      }
    }
    return "";
  }

  var adHeadlines = [
    "ISO 9001 por R$ 99/dia, com especialista do seu lado",
    "Consultoria ISO 9001 com um especialista do seu lado, por R$ 99/dia",
    "Certificação ISO 9001 por menos de R$ 99/dia",
    "ISO 9001 em média 6 meses, por R$ 99/dia",
    "ISO 9001:2026 já publicada. Veja o que muda no seu sistema"
  ];
  var adRules = [
    { n: 5, keys: ["2026", "publicada", "o que muda"] },
    { n: 4, keys: ["6 meses", "seis meses"] },
    { n: 2, keys: ["consultoria"] },
    { n: 1, keys: ["99", "por dia", "preco", "custo", "valor"] },
    { n: 3, keys: ["certificado", "cliente", "norma"] }
  ];

  function fold(value) {
    return (value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  }

  function pickAdHeadline(term) {
    var t = fold(term);
    if (!t || t === "direct" || t === "none") return 3;
    var num = t.match(/^(?:v|titulo|h)?([1-5])$/);
    if (num) return Number(num[1]);
    for (var i = 0; i < adHeadlines.length; i++) {
      if (fold(adHeadlines[i]) === t) return i + 1;
    }
    for (var r = 0; r < adRules.length; r++) {
      for (var k = 0; k < adRules[r].keys.length; k++) {
        if (t.indexOf(adRules[r].keys[k]) !== -1) return adRules[r].n;
      }
    }
    return 3;
  }

  window.LP = {
    variant: variant,
    variantSource: source,
    tracking: tracking,
    preview: preview,

    applyHero: function () {
      var n = pickAdHeadline(params.get("utm_term"));
      var h1 = document.querySelector("[data-copy='headline']");
      if (h1) h1.textContent = adHeadlines[n - 1];
      document.documentElement.setAttribute("data-variant", variant);
      document.documentElement.setAttribute("data-headline", String(n));
    }
  };

  // dataLayer com o identificador da variante antes de qualquer tag.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: "page_view",
    experiment_id: cfg.experiment.id,
    variant_id: variant,
    variant_source: source
  });
})();
