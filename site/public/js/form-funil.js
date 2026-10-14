/* Funil do formulário, sem dados pessoais.
   O navegador manda só o evento para POST /api/form-evento.
   Se o registro falhar, o envio do lead segue normal. */
(function () {
  if (window.tplFormEvento) return;

  var UMA_VEZ = { form_visivel: 1, form_inicio: 1, envio_clique: 1, envio_ok: 1 };
  var WPP_SEND_TO = "AW-17896226473/yuvnCL_ZgpwdEKn9ytVC";
  var REF_ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  var leadAberto = 0;
  var viuForm = false;
  var comecou = false;
  var valStamp = 0;
  var valCampos = {};

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

  function jaViu(evento) {
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

  window.tplFormEvento = function (extra) {
    try {
      extra = extra || {};
      var evento = String(extra.evento || "");
      if (!evento || jaViu(evento)) return;
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

  document.addEventListener("submit", function (e) {
    var form = formLead(e.target);
    if (!form) return;
    window.tplFormEvento({ evento: "envio_clique", norma: normaDo(form) });
  }, true);

  document.addEventListener("invalid", function (e) {
    var t = e.target;
    var form = formLead(t);
    if (!form) return;
    var nome = (t && t.name) || "";
    if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(nome)) return;
    var agora = Date.now();
    if (agora - valStamp > 500) {
      valCampos = {};
      valStamp = agora;
    }
    if (valCampos[nome]) return;
    valCampos[nome] = 1;
    window.tplFormEvento({ evento: "erro_validacao", campo: nome, norma: normaDo(form) });
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

  if (typeof window.fetch === "function") {
    var fetchOriginal = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = "";
      try { url = typeof input === "string" ? input : (input && input.url) || ""; } catch (_) {}
      var caminho = "";
      try { caminho = new URL(url, location.origin).pathname; } catch (_) {}
      if (caminho !== "/api/lead") return fetchOriginal(input, init);
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
    }
  });

  function paginaDeLp() {
    if (document.documentElement.getAttribute("data-tpl-lp") === "1") return true;
    var p = (location.pathname || "/").replace(/\/+$/, "") || "/";
    return /^\/consultoria\/(?:[a-z0-9-]+-lp(?:-b)?|[a-z0-9-]+-obrigado|sassmaq-4-0)$/.test(p);
  }

  function ehWhatsapp(href) {
    try {
      var u = new URL(href, location.origin);
      var host = (u.hostname || "").replace(/^www\./, "");
      return host === "wa.me" || host === "api.whatsapp.com";
    } catch (_) { return false; }
  }

  document.addEventListener("click", function (e) {
    if (!paginaDeLp()) return;
    if (e.defaultPrevented) return;
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || !ehWhatsapp(a.href)) return;
    var ref = "";
    var normaWpp = "";
    if (a.getAttribute("data-wpp-ref") === "1") {
      ref = codigoRef();
      normaWpp = normaLimpa(a.getAttribute("data-wpp-norma")) || normaDo(null);
      var msg = "Olá! Vim pelo site da Templum e quero saber sobre " + normaWpp + ". (ref " + ref + ")";
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

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", observarFormularios);
  } else {
    observarFormularios();
  }
})();
