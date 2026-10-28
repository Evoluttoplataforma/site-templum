/* Comportamento da LP ISO 9001 — Templum. Depende de config.js e variant.js. */
(function () {
  var cfg = window.LP_CONFIG;
  var LP = window.LP;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  // Eventos de analytics. Nunca enviar nome, e-mail, telefone ou empresa.
  function track(event, data) {
    var payload = { event: event, experiment_id: cfg.experiment.id, variant_id: LP.variant };
    for (var k in data) payload[k] = data[k];
    window.dataLayer.push(payload);
  }

  var lucide = {
    info: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    check: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    alert: '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>'
  };

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Links e textos vindos da configuração ---------- */
  $$("[data-privacy]").forEach(function (a) { a.href = cfg.form.privacyUrl; });
  $$("[data-source-link]").forEach(function (a) { a.href = cfg.market.sourceUrl; });
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- CTAs ---------- */
  $$("[data-cta]").forEach(function (el) {
    el.addEventListener("click", function () {
      track("cta_click", { cta_location: el.getAttribute("data-cta") });
    });
  });
  $$('a[href="#proposta"]').forEach(function (a) {
    a.addEventListener("click", function () {
      setTimeout(function () { $("#f-nome").focus({ preventScroll: true }); }, 450);
    });
  });

  /* ---------- Gráfico de mercado ---------- */
  (function chart() {
    var plot = $("[data-chart]");
    if (!plot) return;
    if (cfg.market.show === false) { $("#mercado").hidden = true; return; }
    var series = cfg.market.series;
    var fmt = function (n) { return n.toLocaleString("pt-BR"); };
    var W = 420, H = 280, top = 36, bottom = 236, left = 52, right = 410;
    var max = 1800000, ticks = [0, 600000, 1200000, 1800000];
    var y = function (v) { return bottom - (v / max) * (bottom - top); };
    var barW = 96, gap = (right - left - barW * series.length) / (series.length + 1);
    var colors = ["#8a929c", "#1167e4"];

    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="presentation">';
    svg += '<g class="grid">';
    ticks.forEach(function (t) {
      svg += '<line x1="' + left + '" x2="' + right + '" y1="' + y(t) + '" y2="' + y(t) + '"/>';
      svg += '<text class="axis-label" x="' + (left - 8) + '" y="' + (y(t) + 4) + '" text-anchor="end">' + (t === 0 ? "0" : (t / 1000000).toLocaleString("pt-BR") + " mi") + "</text>";
    });
    svg += "</g><g>";
    var tops = [];
    series.forEach(function (d, i) {
      var x = left + gap * (i + 1) + barW * i;
      var yt = y(d.value);
      tops.push({ x: x + barW / 2, y: yt });
      svg += '<g class="bar"><rect x="' + x + '" y="' + yt + '" width="' + barW + '" height="' + (bottom - yt) + '" rx="8" fill="' + colors[i % 2] + '"/>';
      svg += '<text class="bar-value" x="' + (x + barW / 2) + '" y="' + (yt - 10) + '" text-anchor="middle">' + fmt(d.value) + "</text>";
      svg += '<text class="bar-year" x="' + (x + barW / 2) + '" y="' + (bottom + 24) + '" text-anchor="middle">' + d.year + "</text></g>";
    });
    svg += "</g>";
    if (tops.length === 2) {
      var mx = (tops[0].x + tops[1].x) / 2;
      svg += '<path d="M' + (tops[0].x + 30) + " " + (tops[0].y - 34) + " Q " + mx + " " + (tops[1].y - 46) + " " + (tops[1].x - 52) + " " + (tops[1].y - 30) + '" fill="none" stroke="#1167e4" stroke-width="2" stroke-dasharray="4 4"/>';
      svg += '<text class="delta" x="' + mx + '" y="' + (tops[1].y - 44) + '" text-anchor="middle">' + cfg.market.change + "</text>";
    }
    svg += "</svg>";
    plot.innerHTML = svg;

    $("[data-chart-rows]").innerHTML = series.map(function (d) {
      return "<tr><td>" + d.year + "</td><td>" + fmt(d.value) + "</td></tr>";
    }).join("");

    // Único movimento automático da página: as barras crescem ao entrar na tela.
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { plot.classList.add("is-ready"); io.disconnect(); }
      }, { threshold: 0.4 });
      io.observe(plot);
    }
  })();

  /* ---------- Linha do tempo do método ---------- */
  (function method() {
    var steps = [
      { title: "Diagnóstico inicial", text: "Entender o cenário da empresa, o requisito recebido e as necessidades da implementação.", icon: "diagnostico" },
      { title: "Plano de implementação", text: "Definir etapas, responsáveis e prioridades considerando o escopo e a disponibilidade da equipe.", icon: "plano" },
      { title: "Implementação orientada", text: "Estruturar processos, documentos e evidências com os responsáveis internos.", icon: "implementacao" },
      { title: "Preparação para auditoria", text: "Verificar a prontidão do sistema de gestão para a avaliação do organismo certificador.", icon: "auditoria" }
    ];
    var tabs = $$(".step[role=tab]");
    var panel = $("#panel-step");
    if (!panel) return;

    function select(i, focus) {
      tabs.forEach(function (t, j) {
        var on = i === j;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        t.classList.toggle("is-done", j < i);
      });
      panel.setAttribute("aria-labelledby", tabs[i].id);
      $("[data-step-count]", panel).textContent = "Etapa " + (i + 1) + " de " + steps.length;
      $("[data-step-title]", panel).textContent = steps[i].title;
      $("[data-step-text]", panel).textContent = steps[i].text;
      $("[data-step-icon]", panel).src = "assets/img/icons/" + steps[i].icon + ".webp";
      $$("[data-step-img]").forEach(function (img) {
        img.classList.toggle("is-active", img.getAttribute("data-step-img") === String(i));
      });
      panel.classList.remove("is-swapping");
      void panel.offsetWidth;
      panel.classList.add("is-swapping");
      if (focus) tabs[i].focus();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i); });
      t.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") n = (i + 1) % tabs.length;
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") n = (i - 1 + tabs.length) % tabs.length;
        if (e.key === "Home") n = 0;
        if (e.key === "End") n = tabs.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
  })();

  /* ---------- Cases ---------- */
  (function cases() {
    var section = $("#cases");
    var list = $("[data-cases]");
    if (!section) return;
    if (cfg.cases.length) {
      list.innerHTML = cfg.cases.map(function (c) {
        return '<article class="case">' +
          (c.logo ? '<img src="' + escapeHtml(c.logo) + '" alt="' + escapeHtml(c.company) + '" height="40" loading="lazy">' : "") +
          '<h3 class="case__company">' + escapeHtml(c.company) + "</h3>" +
          '<p class="case__sector">' + escapeHtml(c.sector || "") + "</p>" +
          "<dl><div><dt>Desafio</dt><dd>" + escapeHtml(c.challenge) + "</dd></div>" +
          "<div><dt>Solução</dt><dd>" + escapeHtml(c.solution) + "</dd></div>" +
          "<div><dt>Resultado</dt><dd>" + escapeHtml(c.result) + "</dd></div></dl></article>";
      }).join("");
      section.hidden = false;
    }
  })();

  /* ---------- Formulário ---------- */
  (function form() {
    var f = $("#lead-form");
    if (!f) return;
    var status = $(".lead-form__status", f);
    var button = $("button[type=submit]", f);
    var loadedAt = Date.now();
    var started = false;
    var attempted = false;

    f.elements.variant_id.value = LP.variant;
    $("[data-tracking-fields]", f).innerHTML = Object.keys(LP.tracking).map(function (k) {
      return '<input type="hidden" name="' + k + '" value="' + escapeHtml(LP.tracking[k]) + '">';
    }).join("");

    // Máscara de WhatsApp: (11) 99999-9999
    var phone = f.elements.whatsapp;
    phone.addEventListener("input", function () {
      var d = phone.value.replace(/\D/g, "").slice(0, 11);
      var out = d;
      if (d.length > 2) out = "(" + d.slice(0, 2) + ") " + d.slice(2);
      if (d.length > 6) out = "(" + d.slice(0, 2) + ") " + d.slice(2, d.length - 4) + "-" + d.slice(-4);
      phone.value = out;
    });

    function markStart() {
      if (!started) { started = true; track("form_start", {}); }
    }
    f.addEventListener("focusin", markStart);
    f.addEventListener("input", markStart);

    var rules = {
      nome: function (v) { return v.trim() ? "" : "Preencha este campo."; },
      empresa: function (v) { return v.trim() ? "" : "Preencha este campo."; },
      whatsapp: function (v) {
        var d = v.replace(/\D/g, "");
        if (!d) return "Preencha este campo.";
        return d.length === 10 || d.length === 11 ? "" : "Informe um WhatsApp válido com DDD.";
      },
      email: function (v) {
        v = v.trim().toLowerCase();
        if (!v) return "Preencha este campo.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Informe um e-mail válido.";
        if (cfg.form.blockedEmailDomains.indexOf(v.split("@")[1]) !== -1) return "Use o e-mail da empresa. Endereços como Gmail e Hotmail não são aceitos.";
        return "";
      }
    };

    function check(name) {
      var input = f.elements[name];
      var msg = rules[name](input.value);
      var box = $("#e-" + name);
      input.setAttribute("aria-invalid", msg ? "true" : "false");
      box.textContent = msg;
      box.classList.toggle("is-visible", !!msg);
      return msg;
    }

    Object.keys(rules).forEach(function (name) {
      f.elements[name].addEventListener("blur", function () {
        if (attempted || f.elements[name].value) check(name);
      });
    });

    function showStatus(kind, title, text) {
      status.innerHTML = lucide[kind] + "<div><strong>" + title + "</strong>" + text + "</div>";
      status.hidden = false;
    }

    f.addEventListener("submit", function (e) {
      e.preventDefault();
      attempted = true;
      status.hidden = true;

      if (f.elements.website.value) return; // robô preencheu o campo oculto

      var invalid = Object.keys(rules).filter(function (n) { return check(n); });
      if (invalid.length) {
        track("form_error", { error_fields: invalid.join(",") });
        f.elements[invalid[0]].focus();
        return;
      }
      if (Date.now() - loadedAt < 3000) {
        showStatus("alert", "Aguarde um instante.", " Envie novamente em alguns segundos.");
        return;
      }

      if (!cfg.form.endpoint) {
        showStatus("info", "Formulário de demonstração.", " Os dados não foram enviados: a integração com o CRM ainda não está configurada.");
        return;
      }

      var data = {};
      new FormData(f).forEach(function (v, k) { if (k !== "website") data[k] = String(v); });
      var leadEventId = (window.LP_TRACK && window.LP_TRACK.uuid) ? window.LP_TRACK.uuid() : ("x" + Date.now().toString(36));
      var clickKeys = ["gclid", "gbraid", "wbraid", "fbclid", "gad_source", "gad_campaignid"];
      var utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      var tracking = LP.tracking || {};
      var payload = {
        nome: data.nome || "",
        email: (data.email || "").trim().toLowerCase(),
        telefone: data.whatsapp || "",
        empresa: data.empresa || "",
        norma: "ISO 9001",
        mensagem: "LP Google Ads ISO 9001. Variante " + LP.variant + ". Experimento " + cfg.experiment.id + ".",
        evento: "lead",
        pagina: location.pathname,
        landing: location.pathname,
        referrer: document.referrer || "",
        meta_event_id: leadEventId,
        lead_event_id: leadEventId,
        meta_content_name: "iso-9001",
        variant_id: LP.variant,
        experiment_id: cfg.experiment.id
      };
      utmKeys.forEach(function (k) { payload[k] = tracking[k] || ""; });
      clickKeys.forEach(function (k) { payload[k] = tracking[k] || ""; });
      payload.utm_from_url = utmKeys.some(function (k) { return !!payload[k]; });
      payload.click_from_url = clickKeys.some(function (k) { return !!payload[k]; });
      try {
        var fbp = document.cookie.match(/(?:^|; )_fbp=([^;]*)/);
        var fbc = document.cookie.match(/(?:^|; )_fbc=([^;]*)/);
        if (fbp) payload.fbp = decodeURIComponent(fbp[1]);
        if (fbc) payload.fbc = decodeURIComponent(fbc[1]);
      } catch (err) {}

      button.disabled = true;
      button.textContent = "Enviando sua solicitação…";

      var tokenPromise = (window.tplTurnstileToken)
        ? window.tplTurnstileToken()
        : Promise.reject(new Error("turnstile_script"));

      tokenPromise.then(function (token) {
        payload.turnstile_token = token || "";
        return fetch(cfg.form.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify(payload)
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (body) {
            return { httpOk: r.ok, status: r.status, body: body };
          });
        });
      }).then(function (res) {
        if (window.tplTurnstileReset) window.tplTurnstileReset();
        if (res.body && res.body.error === "turnstile") {
          track("form_error", { error_fields: "submit" });
          showStatus("alert", "A verificação anti-robô falhou.", " Tente novamente em instantes.");
          button.disabled = false;
          button.textContent = cfg.variants[LP.variant].cta;
          return;
        }
        var saved = res.httpOk && res.body && res.body.ok === true && res.body.supabase && res.body.supabase.ok === true;
        if (!saved) throw new Error("not_saved");
        if (window.LP_TRACK && window.LP_TRACK.onLeadSaved) {
          window.LP_TRACK.onLeadSaved({
            email: payload.email,
            phone: payload.telefone,
            name: payload.nome,
            eventId: leadEventId
          });
        }
        var sent = false;
        try {
          sent = sessionStorage.getItem("tpl_lp9001_dl_lead") === "1";
          sessionStorage.setItem("tpl_lp9001_dl_lead", "1");
        } catch (err) {}
        if (!sent) track("generate_lead", { form_id: "lp_iso9001_proposta" });
        showStatus("check", "Solicitação recebida.", " Nossa equipe entrará em contato sobre seu projeto.");
      }).catch(function () {
        if (window.tplTurnstileReset) window.tplTurnstileReset();
        track("form_error", { error_fields: "submit" });
        showStatus("alert", "Não foi possível confirmar o recebimento.", " Tente novamente em instantes.");
        button.disabled = false;
        button.textContent = cfg.variants[LP.variant].cta;
      });
    });
  })();

  /* ---------- WhatsApp ---------- */
  $$("[data-whatsapp]").forEach(function (a) {
    a.href = "https://wa.me/" + cfg.whatsapp.number + "?text=" + encodeURIComponent(cfg.whatsapp.message);
  });

  /* ---------- ISO 9001:2026 e logos (ligados pela configuração) ---------- */
  if (!cfg.iso2026.showTransitionDates) $$("[data-transition-date]").forEach(function (el) { el.hidden = true; });
  if (cfg.iso2026.showTransitionOffer) $$("[data-transition-offer]").forEach(function (el) { el.hidden = false; });
  if (cfg.clientLogos.show) $$("[data-client-logos]").forEach(function (el) { el.hidden = false; });

  /* ---------- Vídeos: o player do Vimeo só carrega no clique ---------- */
  $$("[data-vimeo]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      var item = a.closest(".video");
      var frame = document.createElement("iframe");
      frame.src = "https://player.vimeo.com/video/" + a.getAttribute("data-vimeo") + "?autoplay=1&dnt=1";
      frame.title = a.querySelector(".sr-only").textContent;
      frame.allow = "autoplay; fullscreen; picture-in-picture";
      frame.allowFullscreen = true;
      a.replaceWith(frame);
      item.classList.add("is-playing");
      frame.focus();
    });
  });

  /* ---------- CTA fixo no mobile ---------- */
  (function stickyCta() {
    var bar = $("[data-mobile-cta]");
    var formBox = $(".hero__form");
    if (!bar || !formBox || !("IntersectionObserver" in window)) return;
    var link = $("a", bar);
    new IntersectionObserver(function (entries) {
      // Visível sempre que o formulário estiver fora da tela (antes ou depois dele).
      var show = !entries[0].isIntersecting;
      bar.classList.toggle("is-visible", show);
      bar.setAttribute("aria-hidden", String(!show));
      link.tabIndex = show ? 0 : -1;
    }).observe(formBox);
  })();

  /* ---------- Painel de homologação ---------- */
  (function qaPanel() {
    if (!LP.preview) return;
    var opts = Object.keys(cfg.variants).map(function (id) {
      return '<option value="' + id + '"' + (id === LP.variant ? " selected" : "") + ">" + escapeHtml(cfg.variants[id].label) + "</option>";
    }).join("");
    var pend = [];
    if (!cfg.form.endpoint) pend.push("integração do formulário");
    if (!cfg.cases.length) pend.push("cases");
    if (cfg.form.privacyUrl === "#") pend.push("link da Política de Privacidade");
    if (cfg.iso2026.showTransitionDates) pend.push("datas de transição da ISO 9001:2026");
    if (!cfg.clientLogos.show) pend.push("logos de clientes (desligados)");

    var el = document.createElement("aside");
    el.className = "qa-panel is-collapsed";
    el.setAttribute("aria-label", "Painel de homologação");
    el.innerHTML = '<button class="qa-panel__toggle" type="button">Abrir painel de homologação</button>' +
      "<strong>Modo homologação</strong>" +
      '<label for="qa-variant">Variante de headline</label><select id="qa-variant">' + opts + "</select>" +
      "<p>Origem da variante: " + LP.variantSource + ".</p>" +
      '<button type="button" class="qa-panel__reroll">Sortear outra headline</button>' +
      (pend.length ? "<p>Pendente de aprovação: " + pend.join(", ") + ".</p>" : "");
    document.body.appendChild(el);

    $("#qa-variant", el).addEventListener("change", function () {
      var u = new URL(location.href);
      u.searchParams.set("v", this.value);
      location.href = u.toString();
    });
    $(".qa-panel__reroll", el).addEventListener("click", function () {
      try { localStorage.removeItem(cfg.experiment.storageKey); } catch (e) {}
      var u = new URL(location.href);
      u.searchParams.delete("v");
      location.href = u.toString();
    });
    var toggle = $(".qa-panel__toggle", el);
    toggle.addEventListener("click", function () {
      var c = el.classList.toggle("is-collapsed");
      toggle.textContent = c ? "Abrir painel de homologação" : "Recolher painel";
    });
  })();
})();
