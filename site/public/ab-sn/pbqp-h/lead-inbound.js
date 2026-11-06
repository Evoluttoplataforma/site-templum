/* Modal + POST /api/lead (INBOUND) + WhatsApp fixo. Clarity vai no HTML. */
(function () {
  var OBRIGADO = "/consultoria/pbqp-h-obrigado";
  var NORMA = "PBQP-H";
  var WPP_NUM = "551940402157";
  var WPP_LINHA = "Olá! Vim pelo site da Templum e quero saber sobre o PBQP-H.";
  var EMPRESA_LABEL = "Nome da Construtora";
  var EMPRESA_PH = "Nome da Construtora";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function uuid() {
    try { return crypto.randomUUID(); }
    catch (_) { return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  }

  window.__tplContentName = window.__tplContentName || function (pathname) {
    var parts = (pathname || location.pathname).split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "home";
  };
  window.__tplUuid = window.__tplUuid || uuid;
  window.fireMetaLead = window.fireMetaLead || function (data, contentName, eventId) {
    if (!window.fbq) return;
    data = data || {};
    var email = (data.email || "").trim().toLowerCase().replace(/\s+/g, "");
    var digits = (data.phone || data.telefone || "").replace(/\D/g, "");
    var phone = digits ? "55" + digits : "";
    try {
      ["1265191353683807", "4177249519256900"].forEach(function (id) {
        fbq("init", id, { em: email || undefined, ph: phone || undefined });
      });
      fbq("track", "Lead", { content_name: contentName || window.__tplContentName() }, { eventID: eventId || uuid() });
    } catch (_) {}
  };

  function digitsBR(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.indexOf("55") === 0 && d.length >= 12) d = d.slice(2);
    return d.slice(0, 11);
  }

  function maskTel(input) {
    input.addEventListener("input", function () {
      var d = digitsBR(input.value);
      if (d.length <= 2) input.value = d ? "(" + d : "";
      else if (d.length <= 7) input.value = "(" + d.slice(0, 2) + ") " + d.slice(2);
      else input.value = "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
    });
  }

  function attrib() {
    var out = {};
    var urlP = new URLSearchParams(location.search);
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "gclid", "gbraid", "wbraid", "fbclid", "gad_source", "gad_campaignid", "msclkid", "ttclid"
    ].forEach(function (k) {
      var v = urlP.get(k);
      if (v) out[k] = v;
    });
    return out;
  }

  function wppHref() {
    return "https://wa.me/" + WPP_NUM + "?text=" + encodeURIComponent(WPP_LINHA);
  }

  function ensureModal() {
    var existing = $("#tpl-lead-modal");
    if (existing) return existing;

    var wrap = document.createElement("div");
    wrap.innerHTML = [
      '<dialog id="tpl-lead-modal" class="tpl-lead-modal" aria-labelledby="tpl-lead-title">',
      '  <button type="button" class="tpl-lead-modal__x" data-fecha-form aria-label="Fechar">×</button>',
      '  <div class="tpl-lead-card">',
      '    <div class="tpl-lead-title" id="tpl-lead-title">Solicite uma proposta</div>',
      '    <p class="tpl-lead-sub">Preencha os dados. Um especialista prepara a proposta para a sua empresa.</p>',
      '    <form class="tpl-lead-form" data-trk-event="lead" data-obrigado="' + OBRIGADO + '" novalidate>',
      '      <input type="hidden" name="norma" value="' + NORMA + '" />',
      '      <input type="text" name="website" value="" tabindex="-1" autocomplete="off" aria-hidden="true" class="tpl-lead-hp" />',
      '      <div class="tpl-lead-row">',
      '        <div class="tpl-lead-field"><label for="tpl-nome">Nome</label><input id="tpl-nome" name="nome" placeholder="Seu nome" required /></div>',
      '        <div class="tpl-lead-field"><label for="tpl-tel">Telefone / WhatsApp</label><input id="tpl-tel" type="tel" inputmode="numeric" name="telefone" placeholder="(00) 00000-0000" required /></div>',
      '      </div>',
      '      <div class="tpl-lead-field"><label for="tpl-email">E-mail</label><input id="tpl-email" type="email" name="email" placeholder="voce@empresa.com" required /></div>',
      '      <div class="tpl-lead-field"><label for="tpl-empresa">' + EMPRESA_LABEL + '</label><input id="tpl-empresa" name="empresa" placeholder="' + EMPRESA_PH + '" /></div>',
      '      <div class="tpl-lead-row">',
      '        <div class="tpl-lead-field"><label for="tpl-cargo">Seu cargo</label>',
      '          <select id="tpl-cargo" name="cargo"><option value="">Selecione</option>',
      '            <option>Proprietário</option><option>Diretor / C-level</option><option>Consultor</option>',
      '            <option>Funcionário buscando informações</option><option>Só estou curioso</option>',
      '          </select></div>',
      '        <div class="tpl-lead-field"><label for="tpl-fat">Faturamento mensal</label>',
      '          <select id="tpl-fat" name="faturamento" required><option value="">Selecione</option>',
      '            <option>Até R$ 50 mil</option><option>R$ 50 mil a R$ 100 mil</option>',
      '            <option>R$ 100 mil a R$ 300 mil</option><option>R$ 300 mil a R$ 500 mil</option>',
      '            <option>R$ 500 mil a R$ 1 milhão</option><option>Acima de R$ 1 milhão</option>',
      '          </select></div>',
      '      </div>',
      '      <p class="tpl-lead-status" hidden></p>',
      '      <button type="submit" class="tpl-lead-submit" data-cta-pos="modal">Solicite uma proposta</button>',
      '      <a class="tpl-lead-wpp" href="' + wppHref() + '" target="_blank" rel="noopener" data-wpp-ref="1" data-wpp-norma="' + NORMA + '" data-wpp-linha="' + WPP_LINHA.replace(/"/g, "&quot;") + '">Prefere conversar pelo WhatsApp?</a>',
      '      <p class="tpl-lead-legal">Ao enviar, você concorda em ser contatado pela Templum. Seus dados estão protegidos conforme a LGPD.</p>',
      '    </form>',
      '  </div>',
      '</dialog>'
    ].join("");

    var dlg = wrap.firstElementChild;
    document.body.appendChild(dlg);
    maskTel($("#tpl-tel", dlg));
    return dlg;
  }

  function ensureWppFixo() {
    if ($("[data-wpp-fixo]")) return;
    var a = document.createElement("a");
    a.className = "tpl-lead-wpp-fixo";
    a.href = wppHref();
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("data-wpp-ref", "1");
    a.setAttribute("data-wpp-fixo", "1");
    a.setAttribute("data-wpp-norma", NORMA);
    a.setAttribute("data-wpp-linha", WPP_LINHA);
    a.innerHTML = '<span aria-hidden="true">💬</span> Falar no WhatsApp';
    document.body.appendChild(a);
    document.body.classList.add("tpl-wpp-on");

    var mq = window.matchMedia("(max-width: 767px)");
    function sync() {
      var dlg = $("#tpl-lead-modal");
      var cobre = dlg && dlg.open;
      a.classList.toggle("is-clear", !!cobre || !mq.matches);
      if (!mq.matches) a.setAttribute("aria-hidden", "true");
      else if (cobre) a.setAttribute("aria-hidden", "true");
      else a.removeAttribute("aria-hidden");
    }
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else if (mq.addListener) mq.addListener(sync);
    document.addEventListener("tpl:lead-modal", sync);
    sync();
  }

  function openModal(ctaPos) {
    var dlg = ensureModal();
    if (typeof dlg.showModal === "function" && !dlg.open) dlg.showModal();
    document.body.classList.add("tpl-lead-modal-on");
    try { document.dispatchEvent(new CustomEvent("tpl:lead-modal", { detail: { open: true } })); } catch (_) {}
    if (window.tplFormEvento) {
      window.tplFormEvento({ evento: "form_visivel", norma: NORMA, cta_pos: ctaPos || "" });
    }
    var first = dlg.querySelector('input:not([type="hidden"]):not(.tpl-lead-hp)');
    if (first) setTimeout(function () { first.focus(); }, 50);
  }

  function closeModal() {
    var dlg = $("#tpl-lead-modal");
    if (dlg && dlg.open) dlg.close();
    document.body.classList.remove("tpl-lead-modal-on");
    try { document.dispatchEvent(new CustomEvent("tpl:lead-modal", { detail: { open: false } })); } catch (_) {}
  }

  function showError(form, msg) {
    var el = $(".tpl-lead-status", form);
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || "";
  }

  function bindSubmit(form) {
    if (form.dataset.bound === "1") return;
    form.dataset.bound = "1";
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = {};
      new FormData(form).forEach(function (v, k) { d[k] = String(v || "").trim(); });
      showError(form, "");

      if (!d.nome || d.nome.length < 2) { showError(form, "Informe seu nome."); $("#tpl-nome", form).focus(); return; }
      var tel = digitsBR(d.telefone);
      if (tel.length < 10 || tel.length > 11) { showError(form, "Informe um WhatsApp válido com DDD."); $("#tpl-tel", form).focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email || "")) { showError(form, "Informe um e-mail válido."); $("#tpl-email", form).focus(); return; }
      if (!d.faturamento) { showError(form, "Selecione o faturamento mensal."); $("#tpl-fat", form).focus(); return; }
      if (d.website) return;

      if (form.dataset.leadSubmitted === "1") return;
      form.dataset.leadSubmitted = "1";
      var btn = form.querySelector('[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }

      var leadEventId = uuid();
      var contentName = window.__tplContentName(location.pathname);
      var destino = form.getAttribute("data-obrigado") || OBRIGADO;
      var done = false;
      function go() { if (!done) { done = true; location.href = destino; } }
      function fail() {
        try { sessionStorage.removeItem("tpl_lead_pending"); } catch (_) {}
        delete form.dataset.leadSubmitted;
        if (btn) { btn.disabled = false; btn.textContent = "Solicite uma proposta"; }
        showError(form, "Não foi possível enviar agora. Tente de novo.");
      }

      var tokenPromise = window.tplTurnstileToken
        ? window.tplTurnstileToken()
        : (window.tplTurnstileStatus = "script", Promise.resolve(""));

      tokenPromise.then(function (token) {
        try {
          sessionStorage.setItem("tpl_lead_pending", JSON.stringify({
            email: d.email, phone: d.telefone, name: d.nome, norma: NORMA,
            event_id: leadEventId
          }));
        } catch (_) {}

        var payload = Object.assign({
          nome: d.nome,
          email: d.email,
          telefone: "+55" + tel,
          empresa: d.empresa || "",
          norma: NORMA,
          cargo: d.cargo || "",
          faturamento: d.faturamento || "",
          evento: "lead",
          pagina: location.pathname,
          meta_event_id: leadEventId,
          lead_event_id: leadEventId,
          meta_content_name: contentName,
          turnstile_token: token || "",
          turnstile_status: token ? (window.tplTurnstileStatus || "ok") : (window.tplTurnstileStatus || "script"),
          form_age_ms: Date.now() - (window.tplFormLoadedAt || 0),
          website: d.website || ""
        }, attrib());

        var t = setTimeout(go, 5000);
        return fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify(payload)
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (body) {
            return { httpOk: r.ok, body: body };
          });
        }).then(function (res) {
          if (window.tplTurnstileReset) window.tplTurnstileReset();
          if (res.body && res.body.error === "turnstile") { clearTimeout(t); fail(); return; }
          if (res.body && res.body.error === "honeypot") {
            clearTimeout(t);
            delete form.dataset.leadSubmitted;
            if (btn) { btn.disabled = false; btn.textContent = "Solicite uma proposta"; }
            return;
          }
          var saved = res.httpOk && res.body && res.body.ok === true && res.body.supabase && res.body.supabase.ok === true;
          clearTimeout(t);
          if (saved) {
            window.fireMetaLead({ email: d.email, phone: d.telefone }, contentName, leadEventId);
            try {
              document.dispatchEvent(new CustomEvent("tpl:lead-saved", {
                detail: { data: d, contentName: contentName, eventId: leadEventId }
              }));
            } catch (_) {}
            setTimeout(go, 400);
          } else {
            go();
          }
        }).catch(function () {
          clearTimeout(t);
          if (window.tplTurnstileReset) window.tplTurnstileReset();
          go();
        });
      }).catch(fail);
    });
  }

  function bindUi() {
    var dlg = ensureModal();
    bindSubmit($("form", dlg));
    ensureWppFixo();

    $$("[data-abre-form]").forEach(function (btn) {
      if (btn.dataset.boundAbre === "1") return;
      btn.dataset.boundAbre = "1";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        openModal(btn.getAttribute("data-cta-pos") || "");
      });
    });

    $$("[data-fecha-form]", dlg).forEach(function (btn) {
      btn.addEventListener("click", closeModal);
    });
    dlg.addEventListener("close", function () {
      document.body.classList.remove("tpl-lead-modal-on");
      try { document.dispatchEvent(new CustomEvent("tpl:lead-modal", { detail: { open: false } })); } catch (_) {}
    });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) closeModal();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindUi);
  } else {
    bindUi();
  }
})();
