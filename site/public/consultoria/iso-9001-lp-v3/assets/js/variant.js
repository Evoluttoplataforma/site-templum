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

  var utmHeadlines = [
    { keys: ["consultoria"], text: "Consultoria ISO 9001: prepare sua empresa para conquistar a certificação" },
    { keys: ["certifica"], text: "Certificação ISO 9001: prepare sua empresa com apoio especializado" },
    { keys: ["custo", "preco", "valor"], text: "Quanto custa implementar a ISO 9001 na sua empresa?" },
    { keys: ["implanta", "implementa"], text: "Implementação ISO 9001: prepare sua empresa para a certificação" }
  ];

  window.LP = {
    variant: variant,
    variantSource: source,
    tracking: tracking,
    preview: preview,

    applyHero: function () {
      var v = cfg.variants[variant];
      var fromTerm = termHeadline(params.get("utm_term"), utmHeadlines);
      document.querySelectorAll("[data-copy]").forEach(function (el) {
        var key = el.getAttribute("data-copy");
        if (key === "headline" && fromTerm) {
          el.textContent = fromTerm;
          return;
        }
        if (v[key]) el.textContent = v[key];
      });
      document.documentElement.setAttribute("data-variant", variant);
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
