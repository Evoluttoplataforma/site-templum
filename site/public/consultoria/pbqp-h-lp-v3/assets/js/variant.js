/*
 * Sorteia só o título do hero da LP PBQP-H.
 * A frase acima do título fica fixa.
 * Carregado sem defer para trocar o título antes da primeira pintura.
 */
(function () {
  var headlines = {
    a: "Prepare sua construtora para a certificação PBQP-H.",
    b: "Entenda o caminho da certificação PBQP-H para sua construtora.",
    c: "A obra não pode parar. E sua equipe precisa de apoio para implementar o PBQP-H.",
    d: "Consultoria PBQP-H do diagnóstico à preparação para auditoria.",
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

  window.LP = {
    variant: id,
    applyHero: function () {
      var el = document.querySelector("[data-copy='headline']");
      if (el) el.textContent = headlines[id];
      document.documentElement.setAttribute("data-variant", id);
    }
  };
})();
