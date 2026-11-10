/*
 * O utm_term do anúncio escolhe o título. Sem termo, fica a variação 3.
 * Carregado sem defer para trocar o título antes da primeira pintura.
 */
(function () {
  var params = new URLSearchParams(location.search);
  var adHeadlines = [
    "Certifique a segurança da informação na ISO 27001 com garantia de 200%",
    "Consultoria ISO 27001 para responder à avaliação de segurança do cliente",
    "Certifique a segurança da informação na ISO 27001 com garantia de 200%",
    "ISO 27001 com garantia de 200%. Prepare sua empresa para a auditoria",
    "A avaliação de segurança do cliente chegou? Prepare-se com a ISO 27001"
  ];
  var adRules = [
    { n: 3, keys: ["sem parar", "tecnologia", "seguranca da informacao", "garantia"] },
    { n: 2, keys: ["consultoria", "responder"] },
    { n: 5, keys: ["avaliacao", "chegou"] },
    { n: 4, keys: ["auditoria"] },
    { n: 1, keys: ["quanto custa", "investimento", "custo", "preco"] },
    { n: 4, keys: ["6 meses", "seis meses"] }
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
    applyHero: function () {
      var n = pickAdHeadline(params.get("utm_term"));
      var h1 = document.querySelector("[data-copy='headline']");
      if (h1) h1.textContent = adHeadlines[n - 1];
      document.documentElement.setAttribute("data-headline", String(n));
    }
  };
})();
