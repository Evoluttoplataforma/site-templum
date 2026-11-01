/*
 * Sorteia o título do hero da LP PBQP-H.
 * Se o utm_term traz a palavra da busca, o título começa por ela.
 * A frase acima do título fica fixa.
 * Carregado sem defer para trocar o título antes da primeira pintura.
 */
(function () {
  var headlines = {
    a: "Prepare sua construtora para a certificação PBQP-H.",
    b: "Entenda o caminho da certificação PBQP-H para sua construtora.",
    c: "A obra não pode parar. E sua equipe precisa de apoio para implementar o PBQP-H.",
    d: "Consultoria PBQP-H da conversa com um especialista à preparação para auditoria.",
    e: "Avance para a certificação PBQP-H com um plano de implementação para sua construtora."
  };
  var key = "tpl_lpbqph_variant";
  var params = new URLSearchParams(location.search);
  var fromUrl = (params.get("v") || "").toLowerCase();
  var id = headlines[fromUrl] ? fromUrl : null;
  if (!id) {
    try { id = localStorage.getItem(key); } catch (e) { id = null; }
  }
  if (!headlines[id]) {
    var keys = ["a", "b", "c", "d", "e"];
    id = keys[Math.floor(Math.random() * keys.length)];
  }
  try { localStorage.setItem(key, id); } catch (e) { /* armazenamento bloqueado */ }

  function termHeadline(term) {
    if (!term) return "";
    var t = term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    var rules = [
      { keys: ["consultoria"], text: "Consultoria PBQP-H: prepare sua construtora para a certificação" },
      { keys: ["certifica", "habilita"], text: "Certificação PBQP-H: prepare sua construtora para atender aos requisitos do SiAC" },
      { keys: ["custo", "preco", "valor"], text: "Quanto custa implementar o PBQP-H na sua construtora?" },
      { keys: ["implanta", "implementa"], text: "Implantação PBQP-H: prepare sua construtora para a certificação SiAC" }
    ];
    for (var i = 0; i < rules.length; i++) {
      for (var j = 0; j < rules[i].keys.length; j++) {
        if (t.indexOf(rules[i].keys[j]) !== -1) return rules[i].text;
      }
    }
    return "";
  }

  function gluePbqp(root) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var list = [];
    while (walker.nextNode()) list.push(walker.currentNode);
    list.forEach(function (node) {
      var parent = node.parentNode;
      if (!parent || parent.tagName === "SCRIPT" || parent.tagName === "STYLE") return;
      if (parent.closest && (parent.closest("[data-pbqp-keep]") || parent.closest("header") || parent.closest(".btn") || parent.closest("button"))) return;
      if (node.nodeValue.indexOf("PBQP-H") === -1) return;
      var parts = node.nodeValue.split("PBQP-H");
      var frag = document.createDocumentFragment();
      parts.forEach(function (part, i) {
        if (part) frag.appendChild(document.createTextNode(part));
        if (i < parts.length - 1) {
          var span = document.createElement("span");
          span.setAttribute("data-pbqp-keep", "");
          span.style.whiteSpace = "nowrap";
          span.textContent = "PBQP-H";
          frag.appendChild(span);
        }
      });
      parent.replaceChild(frag, node);
    });
  }

  window.LP = {
    variant: id,
    applyHero: function () {
      var el = document.querySelector("[data-copy='headline']");
      var fromTerm = termHeadline(params.get("utm_term"));
      if (el) el.textContent = fromTerm || headlines[id];
      gluePbqp(document.querySelector(".hero"));
      document.documentElement.setAttribute("data-variant", id);
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    gluePbqp(document.body);
  });
})();
