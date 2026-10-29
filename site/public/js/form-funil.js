/* Funil do formulário, sem dados pessoais.
   O navegador manda só o evento para POST /api/form-evento.
   Se o registro falhar, o envio do lead segue normal. */
(function () {
  if (window.tplFormEvento) return;

  var UMA_VEZ = { form_visivel: 1, form_inicio: 1, envio_clique: 1 };
  var WPP_SEND_TO = "AW-17896226473/yuvnCL_ZgpwdEKn9ytVC";
  var REF_ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  var leadAberto = 0;
  var viuForm = false;
  var comecou = false;
  var valStamp = 0;
  var valCampos = {};
  var espera = null;
  var TERMINAL = {
    envio_ok: 1,
    erro_validacao: 1,
    erro_turnstile: 1,
    erro_servidor: 1,
    erro_rede: 1,
    envio_sem_resposta: 1,
  };
  var MOTIVO_MSG = {
    vazio: "vazio",
    formato: "formato",
    incompleto: "incompleto",
    invalido: "invalido",
    sem_ddd: "falta ddd",
    sem_nove: "falta o 9",
    ddd: "ddd invalido",
  };

  function ler(chave) {
    try { return sessionStorage.getItem(chave) || ""; } catch (_) { return ""; }
  }
  function gravar(chave, valor) {
    try { sessionStorage.setItem(chave, valor); } catch (_) {}
  }

  function sessaoId() {
    var cur = ler("tpl_funil_sid");
    if (/^[A-Za-z0-9-]{8,80}$/.test(cur)) return cur;
    var id = "";
    try { id = crypto.randomUUID(); } catch (_) {}
    if (!/^[A-Za-z0-9-]{8,80}$/.test(id)) {
      id = "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
    }
    gravar("tpl_funil_sid", id);
    return id;
  }

  function dispositivo() {
    var ua = navigator.userAgent || "";
    var w = window.innerWidth || (screen && screen.width) || 0;
    var iPad = /iPad/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (iPad || /Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
    if (/Mobi|iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
    if (w && w < 768) return "mobile";
    if (w && w < 1024 && navigator.maxTouchPoints > 1) return "tablet";
    return "desktop";
  }

  function navegadorApp() {
    var ua = navigator.userAgent || "";
    if (/Instagram/i.test(ua)) return "Instagram";
    if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return "Facebook";
    if (/\bGSA\/|GoogleApp/i.test(ua)) return "Google";
    if (/LinkedInApp|\bLinkedIn\b/i.test(ua)) return "LinkedIn";
    if (/Edg\//.test(ua)) return "Edge";
    if (/OPR\/|Opera/.test(ua)) return "Opera";
    if (/SamsungBrowser/.test(ua)) return "Samsung Internet";
    if (/Firefox\//.test(ua)) return "Firefox";
    if (/Chrome\/|CriOS\//.test(ua)) return "Chrome";
    if (/Safari\//.test(ua)) return "Safari";
    return "Outro";
  }

  function contexto() {
    var p = new URLSearchParams(location.search);
    var stored = {};
    try { stored = JSON.parse(ler("tpl_funil_ctx") || "{}") || {}; } catch (_) { stored = {}; }
    if (["gclid", "gbraid", "wbraid"].some(function (k) { return !!p.get(k); })) stored.ads = true;
    ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) {
      var v = p.get(k);
      if (v) stored[k] = String(v).slice(0, 120);
    });
    gravar("tpl_funil_ctx", JSON.stringify({
      ads: !!stored.ads,
      utm_source: stored.utm_source || "",
      utm_medium: stored.utm_medium || "",
      utm_campaign: stored.utm_campaign || "",
    }));
    return stored;
  }

  function normaLimpa(valor) {
    var s = String(valor || "").replace(/\s+/g, " ").trim().slice(0, 80);
    if (!s || s.indexOf("@") !== -1) return "";
    return s;
  }

  function normaDo(form) {
    var input = form && form.querySelector
      ? form.querySelector('input[name="norma"], select[name="norma"]')
      : null;
    var valor = normaLimpa(input && input.value);
    if (!valor) {
      var hidden = document.querySelector('form[data-trk-event] input[name="norma"]');
      valor = normaLimpa(hidden && hidden.value);
    }
    if (valor) gravar("tpl_funil_norma", valor);
    return valor || normaLimpa(ler("tpl_funil_norma"));
  }

  function formLead(el) {
    var form = el && el.closest ? el.closest("form[data-trk-event]") : null;
    if (!form) return null;
    if ((form.getAttribute("data-trk-event") || "") === "denuncia") return null;
    return form;
  }

  function jaViu(evento, extra) {
    if (evento === "envio_ok") {
      var id = extra && String(extra.lead_event_id || "");
      if (!/^[A-Za-z0-9-]{8,80}$/.test(id)) return false;
      var ok = {};
      try { ok = JSON.parse(ler("tpl_funil_ok") || "{}") || {}; } catch (_) { ok = {}; }
      if (ok[id]) return true;
      ok[id] = 1;
      gravar("tpl_funil_ok", JSON.stringify(ok));
      return false;
    }
    if (!UMA_VEZ[evento]) return false;
    var cur = {};
    try { cur = JSON.parse(ler("tpl_funil_once") || "{}") || {}; } catch (_) { cur = {}; }
    if (cur[evento]) return true;
    cur[evento] = 1;
    gravar("tpl_funil_once", JSON.stringify(cur));
    return false;
  }

  function enviarBeacon(url, payload) {
    var corpo = "";
    try { corpo = JSON.stringify(payload); } catch (_) { return; }
    try {
      if (navigator.sendBeacon) {
        var blob = new Blob([corpo], { type: "application/json" });
        if (navigator.sendBeacon(url, blob)) return;
      }
    } catch (_) {}
    try {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: corpo,
        keepalive: true,
      }).catch(function () {});
    } catch (_) {}
  }

  function enviar(payload) {
    enviarBeacon("/api/form-evento", payload);
  }

  function codigoRef() {
    var bytes = new Uint8Array(6);
    try {
      crypto.getRandomValues(bytes);
    } catch (_) {
      for (var i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    var out = "";
    for (var j = 0; j < 6; j++) out += REF_ALFABETO[bytes[j] % REF_ALFABETO.length];
    return out;
  }

  function adsDoClique() {
    var p = new URLSearchParams(location.search);
    var stored = {};
    try { stored = JSON.parse(ler("tpl_wpp_ads") || "{}") || {}; } catch (_) { stored = {}; }
    ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term"].forEach(function (k) {
      var v = p.get(k);
      if (!v || String(v).indexOf("@") !== -1) return;
      stored[k] = String(v).replace(/\s+/g, " ").trim().slice(0, 200);
    });
    var limpo = {};
    ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term"].forEach(function (k) {
      if (stored[k] && String(stored[k]).indexOf("@") === -1) limpo[k] = String(stored[k]).slice(0, 200);
    });
    gravar("tpl_wpp_ads", JSON.stringify(limpo));
    return limpo;
  }

  function enviarWhatsappRef(ref, normaWpp) {
    var ads = adsDoClique();
    enviarBeacon("/api/whatsapp-ref", {
      ref: ref,
      pagina: location.pathname || "/",
      norma: normaWpp || "",
      dispositivo: dispositivo(),
      sessao_id: sessaoId(),
      gclid: ads.gclid || "",
      gbraid: ads.gbraid || "",
      wbraid: ads.wbraid || "",
      utm_source: ads.utm_source || "",
      utm_medium: ads.utm_medium || "",
      utm_campaign: ads.utm_campaign || "",
      utm_term: ads.utm_term || "",
    });
  }

  function cancelarEspera() {
    if (!espera) return;
    espera.aberta = false;
    clearTimeout(espera.timer);
    espera = null;
  }

  function vencerEspera(item) {
    if (!item || !item.aberta || espera !== item) return;
    if (leadAberto > 0 && item.fase < 1) {
      item.fase = 1;
      item.timer = setTimeout(function () { vencerEspera(item); }, 15000);
      return;
    }
    var evento = leadAberto > 0 ? "erro_rede" : "envio_sem_resposta";
    item.aberta = false;
    clearTimeout(item.timer);
    if (espera === item) espera = null;
    var extra = { evento: evento, norma: item.norma || "" };
    if (evento === "envio_sem_resposta") extra.erro_codigo = item.saiu ? "saiu" : "15s";
    else {
      extra.erro_codigo = "timeout";
      extra.erro_msg = "tempo esgotado";
    }
    window.tplFormEvento(extra);
    if (evento === "envio_sem_resposta") {
      try { document.dispatchEvent(new CustomEvent("tpl:envio-sem-resposta")); } catch (_) {}
    }
  }

  function armarEspera(norma) {
    cancelarEspera();
    var item = { norma: norma || "", aberta: true, fase: 0, saiu: false };
    espera = item;
    item.timer = setTimeout(function () { vencerEspera(item); }, 15000);
  }

  window.tplFormEvento = function (extra) {
    try {
      extra = extra || {};
      var evento = String(extra.evento || "");
      if (!evento) return;
      if (TERMINAL[evento]) cancelarEspera();
      if (jaViu(evento, extra)) return;
      var ctx = contexto();
      var payload = {
        sessao_id: sessaoId(),
        evento: evento,
        pagina: location.pathname || "/",
        norma: normaLimpa(extra.norma) || normaDo(null),
        dispositivo: dispositivo(),
        navegador_app: navegadorApp(),
        tem_clique_anuncio: ctx.ads === true,
        utm_source: ctx.utm_source || "",
        utm_medium: ctx.utm_medium || "",
        utm_campaign: ctx.utm_campaign || "",
      };
      if (extra.campo) payload.campo = String(extra.campo).slice(0, 40);
      if (extra.erro_codigo) payload.erro_codigo = String(extra.erro_codigo).slice(0, 40);
      if (extra.erro_msg) payload.erro_msg = String(extra.erro_msg).slice(0, 200);
      if (extra.lead_event_id) payload.lead_event_id = String(extra.lead_event_id).slice(0, 80);
      var h1 = {};
      try { h1 = window.tplH1ParaLead ? window.tplH1ParaLead() : {}; } catch (_) { h1 = {}; }
      if (h1 && h1.experimento_id) {
        ["experimento_id", "lp_id", "variante_h1", "angulo", "variante_exposta", "angulo_exposto", "visitante_id", "persistencia", "estado"].forEach(function (k) {
          if (h1[k] !== "" && h1[k] != null) payload[k] = h1[k];
        });
        if (h1.modo_teste === true) payload.modo_teste = true;
      }
      enviar(payload);
    } catch (_) {}
  };

  function observarFormularios() {
    var forms = document.querySelectorAll("form[data-trk-event]");
    var alvos = [];
    forms.forEach(function (form) {
      if ((form.getAttribute("data-trk-event") || "") === "denuncia") return;
      alvos.push(form);
    });
    if (!alvos.length || viuForm) return;
    alvos = alvos.filter(function (form) { return !form.closest("dialog"); });
    if (!alvos.length) return;
    function marcar(form) {
      if (viuForm) return;
      viuForm = true;
      window.tplFormEvento({ evento: "form_visivel", norma: normaDo(form) });
    }
    if (!("IntersectionObserver" in window)) {
      alvos.forEach(function (form) { marcar(form); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          marcar(entry.target);
          io.disconnect();
        }
      });
    }, { threshold: [0.5] });
    alvos.forEach(function (form) { io.observe(form); });
  }

  document.addEventListener("focusin", function (e) {
    if (comecou) return;
    var t = e.target;
    if (!t || !/^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName || "")) return;
    if (t.type === "hidden" || t.type === "submit") return;
    var form = formLead(t);
    if (!form) return;
    comecou = true;
    window.tplFormEvento({ evento: "form_inicio", norma: normaDo(form) });
  });

  document.addEventListener("input", function (e) {
    if (comecou) return;
    var t = e.target;
    var form = formLead(t);
    if (!form) return;
    comecou = true;
    window.tplFormEvento({ evento: "form_inicio", norma: normaDo(form) });
  });

  function motivoValidacao(el) {
    var codigo = el && el.dataset ? String(el.dataset.telMotivo || "") : "";
    if (!/^[a-z0-9_]{1,40}$/.test(codigo)) {
      var v = el && el.validity;
      codigo = "invalido";
      if (v && v.valueMissing) codigo = "vazio";
      else if (v && (v.typeMismatch || v.patternMismatch)) codigo = "formato";
      else if (v && (v.tooShort || v.tooLong)) codigo = "incompleto";
    }
    return codigo;
  }

  document.addEventListener("submit", function (e) {
    var form = formLead(e.target);
    if (!form) return;
    var norma = normaDo(form);
    window.tplFormEvento({ evento: "envio_clique", norma: norma });
    armarEspera(norma);
  }, true);

  document.addEventListener("invalid", function (e) {
    var t = e.target;
    var form = formLead(t);
    if (!form) return;
    var nome = (t && t.name) || "";
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(nome)) return;
    try { form.dataset.funilVal = "1"; } catch (_) {}
    var agora = Date.now();
    if (agora - valStamp > 500) {
      valCampos = {};
      valStamp = agora;
    }
    if (valCampos[nome]) return;
    valCampos[nome] = 1;
    var codigo = motivoValidacao(t);
    window.tplFormEvento({
      evento: "erro_validacao",
      campo: nome,
      erro_codigo: codigo,
      erro_msg: MOTIVO_MSG[codigo] || "invalido",
      norma: normaDo(form),
    });
  }, true);

  document.addEventListener("tpl:turnstile-fail", function (e) {
    var codigo = (e.detail && e.detail.codigo) || "turnstile";
    window.tplFormEvento({
      evento: "erro_turnstile",
      erro_codigo: String(codigo).slice(0, 40),
      erro_msg: "turnstile",
    });
  });

  function metaDoEnvio(init) {
    var meta = { lead_event_id: "", norma: "" };
    try {
      var bruto = init && init.body;
      if (typeof bruto !== "string") return meta;
      var parsed = JSON.parse(bruto);
      if (!parsed || typeof parsed !== "object") return meta;
      meta.lead_event_id = String(parsed.lead_event_id || parsed.meta_event_id || "");
      meta.norma = String(parsed.norma || "");
    } catch (_) {}
    return meta;
  }

  function classificarLead(status, body, meta) {
    var erro = body && typeof body.error === "string" ? body.error : "";
    if (erro === "turnstile" || status === 403 && erro === "turnstile") {
      window.tplFormEvento({
        evento: "erro_turnstile",
        erro_codigo: String(status || "403"),
        erro_msg: "turnstile",
        norma: meta.norma,
      });
      return;
    }
    var salvou = status >= 200 && status < 300 && body && body.ok === true && body.supabase && body.supabase.ok === true;
    if (salvou) {
      window.tplFormEvento({
        evento: "envio_ok",
        lead_event_id: meta.lead_event_id,
        norma: meta.norma,
      });
      return;
    }
    var msg = /^[a-z0-9_-]{1,40}$/i.test(erro) ? erro : "resposta";
    if (body && body.ok === true && body.supabase && body.supabase.ok === false) msg = "supabase";
    window.tplFormEvento({
      evento: "erro_servidor",
      erro_codigo: String(status || 0),
      erro_msg: msg,
      norma: meta.norma,
    });
  }

  function medicaoViva() {
    try {
      var vivo = window.__tplH1 && window.__tplH1.medicao;
      if (vivo && vivo.experimento_id) return vivo;
    } catch (_) {}
    try {
      var salvo = JSON.parse(sessionStorage.getItem("tpl_h1_origem") || "null");
      if (salvo && salvo.experimento_id) return salvo;
    } catch (_) {}
    return null;
  }

  window.tplH1ParaLead = function () {
    var m = medicaoViva();
    if (!m) return {};
    return {
      experimento_id: m.experimento_id || "",
      lp_id: m.lp_id || "",
      variante_h1: m.variante_h1 || "",
      angulo: m.angulo || "",
      variante_exposta: m.variante_exposta || "",
      angulo_exposto: m.angulo_exposto || "",
      modo_teste: m.modo_teste === true,
      visitante_id: m.visitante_id || "",
      sessao_id: m.sessao_id || "",
      persistencia: m.persistencia || "",
      estado: m.estado || "",
    };
  };

  function enriquecerLead(init) {
    if (!init || typeof init.body !== "string") return init;
    var extra = window.tplH1ParaLead ? window.tplH1ParaLead() : null;
    if (!extra || !extra.experimento_id) return init;
    try {
      var parsed = JSON.parse(init.body);
      if (!parsed || typeof parsed !== "object") return init;
      Object.keys(extra).forEach(function (k) {
        if (extra[k] === "" || extra[k] == null) return;
        if (parsed[k] == null || parsed[k] === "") parsed[k] = extra[k];
      });
      if (extra.modo_teste === true) parsed.modo_teste = true;
      return Object.assign({}, init, { body: JSON.stringify(parsed) });
    } catch (_) {
      return init;
    }
  }

  if (typeof window.fetch === "function") {
    var fetchOriginal = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = "";
      try { url = typeof input === "string" ? input : (input && input.url) || ""; } catch (_) {}
      var caminho = "";
      try { caminho = new URL(url, location.origin).pathname; } catch (_) {}
      if (caminho !== "/api/lead") return fetchOriginal(input, init);
      init = enriquecerLead(init);
      var meta = metaDoEnvio(init);
      leadAberto++;
      return fetchOriginal(input, init).then(function (res) {
        leadAberto = Math.max(0, leadAberto - 1);
        try {
          res.clone().json().then(function (body) {
            classificarLead(res.status, body, meta);
          }).catch(function () {
            classificarLead(res.status, null, meta);
          });
        } catch (_) {
          classificarLead(res.status, null, meta);
        }
        return res;
      }, function (err) {
        leadAberto = Math.max(0, leadAberto - 1);
        window.tplFormEvento({
          evento: "erro_rede",
          erro_codigo: "rede",
          erro_msg: "falha de rede",
          norma: meta.norma,
        });
        return Promise.reject(err);
      });
    };
  }

  window.addEventListener("pagehide", function () {
    if (leadAberto > 0) {
      window.tplFormEvento({
        evento: "erro_rede",
        erro_codigo: "timeout",
        erro_msg: "tempo esgotado",
      });
      return;
    }
    if (espera && espera.aberta) {
      espera.saiu = true;
      vencerEspera(espera);
    }
  });

  window.tplPrecisaTurnstile = function () {
    if (typeof window.tplTurnstileToken === "function") return window.tplTurnstileToken();
    try {
      document.dispatchEvent(new CustomEvent("tpl:turnstile-fail", { detail: { codigo: "script" } }));
    } catch (_) {}
    return Promise.reject(new Error("turnstile_script"));
  };

  window.tplLeadMarca = function (form) {
    var marca = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    if (form) form.dataset.leadAttempt = marca;
    return marca;
  };

  window.tplLeadMarcaAtual = function (form, marca) {
    return !!form && form.dataset.leadSubmitted === "1" && form.dataset.leadAttempt === marca;
  };

  function paginaDeLp() {
    if (document.documentElement.getAttribute("data-tpl-lp") === "1") return true;
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return /^\/consultoria\/(?:[a-z0-9-]+-lp(?:-b|-v\d+)?|[a-z0-9-]+-obrigado|sassmaq-4-0)$/.test(p);
  }

  function ehWhatsapp(href) {
    try {
      var u = new URL(href, location.origin);
      var host = (u.hostname || "").replace(/^www\./, "");
      return host === "wa.me" || host === "api.whatsapp.com";
    } catch (_) { return false; }
  }

  document.addEventListener("click", function (e) {
    var abre = e.target && e.target.closest ? e.target.closest("[data-abre-form]") : null;
    if (abre && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      var pos = String(abre.getAttribute("data-cta-pos") || "");
      var extraCta = { evento: "cta_clique", norma: normaDo(abre.closest("form") || document.querySelector("form[data-trk-event]")) };
      if (pos === "topo" || pos === "meio" || pos === "final" || pos === "menu") extraCta.campo = pos;
      window.tplFormEvento(extraCta);
    }
    if (!paginaDeLp()) return;
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || !ehWhatsapp(a.href)) return;
    // Link com número e texto fixos (ex.: confirmação do Mês da Qualidade).
    // O kit não reescreve o href nem troca pelo WhatsApp genérico do site.
    // Mensagem travada (ex.: confirmação do Mês da Qualidade) não ganha código.
    // O botão fixo da LP traz os dois atributos e segue o fluxo do código.
    if (a.getAttribute("data-wpp-fixo") === "1" && a.getAttribute("data-wpp-ref") !== "1") return;
    var ref = "";
    var normaWpp = "";
    if (a.getAttribute("data-wpp-ref") === "1") {
      ref = codigoRef();
      normaWpp = normaLimpa(a.getAttribute("data-wpp-norma")) || normaDo(null);
      var linha = String(a.getAttribute("data-wpp-linha") || "").replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
      if (!linha) {
        linha = normaWpp
          ? "Olá! Vim pelo site da Templum e quero saber sobre " + normaWpp + "."
          : "Olá! Vim pelo site da Templum.";
      }
      var msg = linha + "\nCódigo de atendimento: " + ref;
      try {
        var atual = new URL(a.href, location.origin);
        var fone = (atual.pathname || "").replace(/\D/g, "");
        if (fone) a.href = "https://wa.me/" + fone + "?text=" + encodeURIComponent(msg);
      } catch (_) {}
      enviarWhatsappRef(ref, normaWpp);
    }
    var destino = a.href;
    var novaAba = a.target === "_blank";
    var aba = null;
    if (novaAba) {
      try {
        aba = window.open("about:blank", "_blank");
        if (aba) aba.opener = null;
      } catch (_) { aba = null; }
    }
    e.preventDefault();
    var extraWpp = { evento: "whatsapp_clique" };
    if (ref) extraWpp.lead_event_id = ref;
    if (normaWpp) extraWpp.norma = normaWpp;
    window.tplFormEvento(extraWpp);
    var abriu = false;
    function abrir() {
      if (abriu) return;
      abriu = true;
      if (aba) {
        try { aba.location.href = destino; return; } catch (_) {}
      }
      if (novaAba) {
        try { window.open(destino, "_blank", "noopener"); return; } catch (_) {}
      }
      location.href = destino;
    }
    var timer = setTimeout(abrir, 300);
    if (typeof window.__loadTrackingKit === "function") {
      try { window.__loadTrackingKit(); } catch (_) {}
    }
    try {
      if (typeof window.gtag === "function") {
        window.gtag("event", "conversion", {
          send_to: WPP_SEND_TO,
          event_callback: function () {
            clearTimeout(timer);
            abrir();
          },
        });
        return;
      }
    } catch (_) {}
    clearTimeout(timer);
    abrir();
  }, true);

  adsDoClique();
  contexto();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observarFormularios);
  } else {
    observarFormularios();
  }
})();
