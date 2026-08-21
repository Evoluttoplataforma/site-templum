/* ==========================================================================
   /os/ — captura de lead da página-experiência do Templum OS
   ==========================================================================
   Esta página é ESTÁTICA (fica em public/os/, fora do Astro), então não herda
   o handler de formulário do Base.astro. Este arquivo refaz o mesmo caminho,
   de propósito idêntico, porque é ele que faz a diferença entre "página bonita"
   e "página que gera lead":

     1. atribuição first/last-touch nas MESMAS chaves de localStorage do site
        (tpl_first / tpl_last / tpl_cid) — mesma origem, então o que o site
        gravou vale aqui e vice-versa. Foi por isso que /os/ virou pasta em
        templum.com.br em vez de os.templum.com.br: subdomínio quebraria isso;
     2. POST para /api/lead — same-origin, sem preflight, o mesmo endpoint que
        alimenta Supabase + Mailchimp + Pipedrive + Orbit;
     3. Lead do Meta Pixel disparado SÓ com confirmação de que o Supabase salvou
        (res.body.supabase.ok), com o MESMO event id enviado ao CAPI no campo
        meta_event_id — é isso que faz o Meta deduplicar em vez de contar 2;
     4. redireciona para /lp/templum-os-obrigado/, que é onde o trk.lead dispara
        GA4, Google Ads e TikTok. Não reinventar essa parte: a página de obrigado
        já existe e está testada.

   ⚠️ O bloco de atribuição abaixo é CÓPIA VERBATIM do Base.astro. Se mudar lá,
   muda aqui. É o preço de a página ser estática — e é barato comparado a ter a
   experiência presa ao build do Astro.
   ========================================================================== */
(function () {
  "use strict";

  var PIXELS = ["1265191353683807", "4177249519256900"];
  var OBRIGADO = "/lp/templum-os-obrigado/";
  var EVENTO = "os-experience"; // vira etiqueta de origem no CRM/ManyChat
  var CONTENT_NAME = "templum-os";

  function uuid() {
    try { return crypto.randomUUID(); }
    catch (_) { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }

  // ---- atribuição (cópia do Base.astro) ----------------------------------
  var KEYS = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content",
              "gclid","fbclid","gbraid","wbraid","gad_source","gad_campaignid","msclkid","ttclid"];
  try {
    var p = new URLSearchParams(location.search), cur = {}, now = Date.now();
    KEYS.forEach(function (k) { var v = p.get(k); if (v) cur[k] = v; });
    if (!localStorage.getItem("tpl_first")) {
      localStorage.setItem("tpl_first", JSON.stringify(Object.assign({
        landing: location.pathname, referrer: document.referrer || "", first_seen: now,
      }, cur)));
    }
    if (Object.keys(cur).length) localStorage.setItem("tpl_last", JSON.stringify(cur));
    if (!localStorage.getItem("tpl_cid")) localStorage.setItem("tpl_cid", uuid());
  } catch (_) {}

  function atribuicao() {
    var f = {}, l = {};
    try { f = JSON.parse(localStorage.getItem("tpl_first") || "{}"); } catch (_) {}
    try { l = JSON.parse(localStorage.getItem("tpl_last") || "{}"); } catch (_) {}
    var out = {};
    KEYS.forEach(function (k) { var v = l[k] || f[k]; if (v) out[k] = v; });
    // Fallback direto da URL: se o visitante caiu aqui de anúncio e o
    // localStorage está bloqueado (aba privada), a UTM ainda vai no lead.
    var u = new URLSearchParams(location.search);
    KEYS.forEach(function (k) { if (!out[k] && u.get(k)) out[k] = u.get(k); });
    if (!out.utm_source) out.utm_source = "site";
    if (!out.utm_medium) out.utm_medium = "organico";
    return out;
  }

  // ---- Meta Pixel: base + Lead deduplicado ------------------------------
  function fireMetaLead(dados, eventId) {
    if (!window.fbq) return;
    var email = (dados.email || "").trim().toLowerCase().replace(/\s+/g, "");
    var digits = (dados.telefone || "").replace(/\D/g, "");
    var phone = digits ? "55" + digits : "";
    try {
      PIXELS.forEach(function (id) {
        fbq("init", id, { em: email || undefined, ph: phone || undefined });
      });
      fbq("track", "Lead", { content_name: CONTENT_NAME }, { eventID: eventId });
    } catch (_) {}
  }

  // ---- submit -----------------------------------------------------------
  function ligar(form) {
    if (!form) return;
    var erro = form.querySelector("[data-erro]");
    var botao = form.querySelector('[type="submit"]');
    var abriu = Date.now();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (form.dataset.enviado === "1") return; // duplo clique não gera 2 leads

      var d = {};
      new FormData(form).forEach(function (v, k) { d[k] = typeof v === "string" ? v.trim() : v; });

      // Bot: honeypot preenchido ou envio em menos de 2,5s (são 5 campos).
      // Mesma resposta dada ao humano — erro só ensinaria o bot a tentar diferente.
      if (d.site || Date.now() - abriu < 2500) { sucesso(form); return; }

      form.dataset.enviado = "1";
      if (botao) { botao.disabled = true; botao.dataset.label = botao.textContent; botao.textContent = "Enviando…"; }
      if (erro) erro.hidden = true;

      var eventId = uuid();
      try {
        sessionStorage.setItem("tpl_lead_pending", JSON.stringify({
          email: d.email || "", phone: d.telefone || "", name: d.nome || "", norma: "Mini Orbit",
        }));
      } catch (_) {}

      var indo = false;
      function ir() { if (!indo) { indo = true; location.href = OBRIGADO; } }
      var limite = setTimeout(ir, 5000); // iOS cancela request na navegação: espera, mas não para sempre

      fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify(Object.assign({
          nome: d.nome || "", email: d.email || "", telefone: d.telefone || "",
          empresa: d.empresa || "", cargo: d.cargo || "",
          // cf_produto do CRM é um SELECT: valor fora da lista faz o worker
          // reenviar o lead SEM NENHUM campo personalizado (sem cargo, sem UTM).
          // "Mini Orbit" é a opção existente mais próxima do Templum OS.
          norma: "Mini Orbit",
          mensagem: "Lead da página-experiência /os/\nCTA de origem: os-form",
          // `origem` fora do namespace UTM de propósito: o tracking-kit reescreve
          // utm_source/utm_medium no clique de link interno com a atribuição de
          // sessão do visitante, e a origem interna se perde (medido no blog em
          // 21/08/2026 — CTA de artigo chegava como google/organic). Mesmo campo
          // que o blog agora grava em blog_templum_leads.
          origem: "os-form",
          evento: EVENTO, pagina: location.pathname,
          meta_event_id: eventId, meta_content_name: CONTENT_NAME,
        }, atribuicao())),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (b) { return { ok: r.ok, body: b }; }); })
        .then(function (res) {
          var salvou = res.ok && res.body && res.body.ok === true && res.body.supabase && res.body.supabase.ok === true;
          clearTimeout(limite);
          if (salvou) {
            fireMetaLead(d, eventId);
            setTimeout(ir, 400); // fbevents envia async; navegar no mesmo tick perde o evento
          } else {
            ir();
          }
        })
        .catch(function () { clearTimeout(limite); ir(); });
    });
  }

  function sucesso(form) {
    form.hidden = true;
    var ok = form.parentElement && form.parentElement.querySelector("[data-sucesso]");
    if (ok) ok.hidden = false;
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("form[data-lead]").forEach(ligar);
  });
})();
