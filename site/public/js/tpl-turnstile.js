/* Turnstile dos formulários que criam lead.
   Chave pública do widget templum-leads. O segredo fica só no Worker.
   Modo interaction-only: o desafio só aparece quando a Cloudflare pede clique.
   Falha técnica (timeout, script, rede, 110200, 200100) não bloqueia o envio:
   o POST segue com token vazio e window.tplTurnstileStatus.
   Recusa do desafio (600xxx) e qualquer outro código rejeitam a promise.
   O evento tpl:turnstile-fail continua, para o funil registrar a falha. */
(function () {
  function falhaTecnica(status) {
    return status === "timeout" || status === "script" || status === "rede"
      || status === "erro_110200" || status === "erro_200100";
  }
  function recusaTurnstile(status) {
    var s = String(status || "");
    if (!s || s === "ok" || s === "ausente" || falhaTecnica(s)) return false;
    return true;
  }
  window.tplTurnstileRecusa = recusaTurnstile;

  if (!window.tplFormLoadedAt) window.tplFormLoadedAt = Date.now();
  if (!window.__tplLeadFetch && typeof window.fetch === "function") {
    window.__tplLeadFetch = true;
    var fetchOriginal = window.fetch.bind(window);
    window.fetch = function (input, init) {
      try {
        var url = typeof input === "string" ? input : (input && input.url) || "";
        if (String(url).indexOf("/api/lead") !== -1 && init && typeof init.body === "string") {
          var parsed = JSON.parse(init.body);
          if (parsed && typeof parsed === "object" && !parsed.turnstile_token) {
            if (!parsed.turnstile_status) parsed.turnstile_status = window.tplTurnstileStatus || "ausente";
            if (recusaTurnstile(parsed.turnstile_status)) {
              return Promise.resolve(new Response(JSON.stringify({ ok: false, error: "turnstile" }), {
                status: 400,
                headers: { "content-type": "application/json" },
              }));
            }
            if (parsed.form_age_ms == null) parsed.form_age_ms = Date.now() - (window.tplFormLoadedAt || 0);
          }
          init = Object.assign({}, init, { body: JSON.stringify(parsed) });
        }
      } catch (_) {}
      return fetchOriginal(input, init);
    };
  }
  if (window.tplTurnstileToken) return;

  var SITE_KEY = "0x4AAAAAAFOylHIgVZ3_2VYE";
  var SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  var widgetId = null;
  var scriptPromise = null;
  var renderPromise = null;
  var attempt = 0;
  var generation = 0;
  var pending = null;
  var gate = Promise.resolve();
  var releaseGate = null;

  function loadScript() {
    if (window.turnstile) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise(function (resolve, reject) {
      var settled = false;
      function finish(ok, err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!ok) scriptPromise = null;
        if (ok) resolve();
        else reject(err);
      }
      var timer = setTimeout(function () {
        var err = new Error("turnstile_timeout");
        err.code = "timeout";
        finish(false, err);
      }, 15000);
      var s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = function () {
        if (window.turnstile) finish(true);
        else {
          var err = new Error("turnstile_script");
          err.code = "script";
          finish(false, err);
        }
      };
      s.onerror = function () {
        var err = new Error("turnstile_script");
        err.code = "script";
        finish(false, err);
      };
      document.head.appendChild(s);
    });
    return scriptPromise;
  }

  function ensureWidget() {
    if (widgetId !== null && window.turnstile) return Promise.resolve(widgetId);
    if (renderPromise) return renderPromise;
    renderPromise = loadScript().then(function () {
      var host = document.getElementById("tpl-turnstile-host");
      if (!host) {
        host = document.createElement("div");
        host.id = "tpl-turnstile-host";
        host.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:40;width:max-content;max-width:calc(100% - 32px);";
        (document.body || document.documentElement).appendChild(host);
      }
      widgetId = window.turnstile.render(host, {
        sitekey: SITE_KEY,
        size: "flexible",
        appearance: "interaction-only",
        execution: "execute",
        callback: function (token) {
          var current = pending;
          pending = null;
          if (current) current.done(true, token);
        },
        "error-callback": function (code) {
          var current = pending;
          pending = null;
          if (!current) return;
          var err = new Error("turnstile");
          err.code = code == null || code === "" ? "turnstile" : String(code);
          current.done(false, err);
        },
        "timeout-callback": function () {
          var current = pending;
          pending = null;
          if (!current) return;
          var err = new Error("turnstile_timeout");
          err.code = "timeout";
          current.done(false, err);
        },
      });
      return widgetId;
    }).catch(function (err) {
      renderPromise = null;
      throw err;
    });
    return renderPromise;
  }

  var cached = null;
  var inflight = null;
  var TOKEN_MS = 240000;

  function tokenPronto() {
    return cached && (Date.now() - cached.at) < TOKEN_MS ? cached : null;
  }

  function statusTurnstile(codigo) {
    var c = String(codigo || "");
    if (c === "turnstile_timeout" || c === "timeout") return "timeout";
    if (c === "turnstile_script" || c === "script" || c === "execute") return "script";
    if (/^erro_[a-z0-9_]+$/i.test(c)) return c.toLowerCase().slice(0, 40);
    if (/^\d+$/.test(c)) return ("erro_" + c).slice(0, 40);
    return ("erro_" + c.replace(/[^a-z0-9_]/gi, "_")).toLowerCase().slice(0, 40);
  }

  function pedirToken() {
    if (inflight) return inflight;
    inflight = getOneToken().then(function (token) {
      inflight = null;
      if (token) cached = { token: token, at: Date.now() };
      return token || "";
    }, function (err) {
      inflight = null;
      throw err;
    });
    return inflight;
  }

  function antecipar() {
    if (tokenPronto() || inflight) return;
    pedirToken().catch(function (err) {
      if (err && err.code === "reset") setTimeout(antecipar, 80);
    });
  }

  function entregarToken() {
    var hit = tokenPronto();
    if (hit) {
      var guardado = hit.token;
      cached = null;
      window.tplTurnstileReset();
      window.tplTurnstileStatus = "ok";
      setTimeout(antecipar, 0);
      return Promise.resolve(guardado);
    }
    return pedirToken().then(function (token) {
      var status = token ? "ok" : (window.tplTurnstileStatus || "ausente");
      cached = null;
      window.tplTurnstileReset();
      window.tplTurnstileStatus = status;
      if (token) setTimeout(antecipar, 0);
      return token || "";
    });
  }

  var ultimoAviso = "";
  var ultimoAvisoEm = 0;
  function avisarFalha(codigo) {
    if (codigo === "turnstile_timeout") codigo = "timeout";
    if (codigo === "turnstile_script") codigo = "script";
    if (codigo === "reset") return;
    var chave = String(codigo || "turnstile").slice(0, 40);
    var agora = Date.now();
    if (chave === ultimoAviso && agora - ultimoAvisoEm < 1500) return;
    ultimoAviso = chave;
    ultimoAvisoEm = agora;
    try {
      document.dispatchEvent(new CustomEvent("tpl:turnstile-fail", {
        detail: { codigo: chave },
      }));
    } catch (_) {}
  }

  function getOneToken() {
    var gen = generation;
    return ensureWidget().then(function () {
      if (gen !== generation) {
        var stale = new Error("turnstile_reset");
        stale.code = "reset";
        return Promise.reject(stale);
      }
      var my = ++attempt;
      return new Promise(function (resolve, reject) {
        var settled = false;
        var timer = setTimeout(function () {
          var err = new Error("turnstile_timeout");
          err.code = "timeout";
          done(false, err);
        }, 15000);
        function done(ok, value) {
          if (settled) return;
          if (my !== attempt || gen !== generation) {
            settled = true;
            clearTimeout(timer);
            var stale = new Error("turnstile_reset");
            stale.code = "reset";
            reject(stale);
            return;
          }
          settled = true;
          clearTimeout(timer);
          if (pending && pending.id === my) pending = null;
          if (!ok) {
            var codigo = (value && value.code) || (value && value.message) || "turnstile";
            var status = statusTurnstile(codigo);
            window.tplTurnstileStatus = status;
            avisarFalha(status);
            try { window.turnstile.reset(widgetId); } catch (_) {}
            if (recusaTurnstile(status)) {
              var block = new Error("turnstile_block");
              block.code = status;
              reject(block);
              return;
            }
            resolve("");
            return;
          }
          window.tplTurnstileStatus = "ok";
          resolve(value);
        }
        pending = { id: my, done: done };
        try {
          window.turnstile.execute(widgetId);
        } catch (err) {
          if (err && !err.code) err.code = "execute";
          done(false, err || { code: "execute" });
        }
      });
    }, function (err) {
      if (gen !== generation) {
        var stale = new Error("turnstile_reset");
        stale.code = "reset";
        return Promise.reject(stale);
      }
      var codigo = err && (err.code || err.message) === "turnstile_script" ? "script" : ((err && err.code) || "turnstile");
      if (err && err.message === "turnstile_timeout") codigo = "timeout";
      if (err && err.message === "turnstile_script") codigo = "script";
      window.tplTurnstileStatus = statusTurnstile(codigo);
      avisarFalha(window.tplTurnstileStatus);
      if (recusaTurnstile(window.tplTurnstileStatus)) {
        var block = new Error("turnstile_block");
        block.code = window.tplTurnstileStatus;
        return Promise.reject(block);
      }
      return "";
    });
  }

  function unlock() {
    var release = releaseGate;
    releaseGate = null;
    if (release) release();
  }

  window.tplTurnstileToken = function () {
    return entregarToken();
  };

  window.tplTurnstileReset = function () {
    generation++;
    attempt++;
    pending = null;
    if (widgetId !== null && window.turnstile) {
      try { window.turnstile.reset(widgetId); } catch (_) {}
    }
    unlock();
    gate = Promise.resolve();
  };

  function errorNode(form) {
    if (!form) return null;
    var msg = form.querySelector("[data-lead-error].tpl-lead-error");
    if (msg) return msg;
    msg = document.createElement("div");
    msg.setAttribute("data-lead-error", "1");
    msg.className = "tpl-lead-error";
    msg.setAttribute("role", "alert");
    var button = form.querySelector('[type="submit"]');
    if (button && button.parentNode) button.parentNode.insertBefore(msg, button.nextSibling);
    else form.appendChild(msg);
    return msg;
  }

  function whatsLink(form) {
    var src = (form && form.querySelector("a.lead-wpp[href], a[data-wpp-ref][href]"))
      || document.querySelector("a.lead-wpp[href], a[data-wpp-ref][href], a.whatsapp-float[href], a.wpp-fixo[href]");
    if (!src) return null;
    var a = document.createElement("a");
    a.href = src.getAttribute("href") || src.href;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "tpl-lead-wpp";
    a.textContent = "Prefere falar pelo WhatsApp?";
    ["data-wpp-ref", "data-wpp-norma", "data-wpp-linha"].forEach(function (k) {
      var v = src.getAttribute(k);
      if (v) a.setAttribute(k, v);
    });
    return a;
  }

  window.tplClearLeadError = function (form) {
    if (!form) return;
    var msg = form.querySelector("[data-lead-error].tpl-lead-error");
    if (msg) msg.textContent = "";
  };

  window.tplLeadFail = function (form, btn) {
    if (form) delete form.dataset.leadSubmitted;
    if (btn) btn.disabled = false;
    window.tplTurnstileReset();
    var msg = errorNode(form);
    if (!msg) return;
    msg.textContent = "";
    var texto = document.createElement("p");
    texto.className = "tpl-lead-error-text";
    var wpp = whatsLink(form);
    texto.textContent = wpp
      ? "A verificação anti-robô falhou. Tente de novo ou fale pelo WhatsApp."
      : "A verificação anti-robô falhou. Tente de novo.";
    msg.appendChild(texto);
    var retry = document.createElement("button");
    retry.type = "button";
    retry.className = "tpl-lead-retry";
    retry.textContent = "Tentar de novo";
    retry.addEventListener("click", function () {
      if (!form) return;
      if (form.requestSubmit) form.requestSubmit();
      else form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    msg.appendChild(retry);
    if (wpp) msg.appendChild(wpp);
    try {
      var ativo = document.activeElement;
      if (ativo && ativo.blur && form.contains(ativo)) ativo.blur();
    } catch (_) {}
    try { msg.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (_) {}
  };

  document.addEventListener("tpl:envio-sem-resposta", function () {
    var forms = document.querySelectorAll("form[data-trk-event]");
    forms.forEach(function (form) {
      if ((form.getAttribute("data-trk-event") || "") === "denuncia") return;
      if (form.dataset.leadSubmitted !== "1") return;
      window.tplLeadFail(form, form.querySelector('[type="submit"]'));
    });
  });

  if (!document.getElementById("tpl-turnstile-style")) {
    var style = document.createElement("style");
    style.id = "tpl-turnstile-style";
    style.textContent = ".tpl-lead-error{margin:12px 0 0;padding:12px;border-radius:10px;font-size:14px;line-height:1.45;font-weight:650;color:#7c2d12;background:#fff7ed;display:flex;flex-direction:column;align-items:flex-start;gap:10px}.tpl-lead-error:empty{display:none;margin:0;padding:0}.tpl-lead-error-text{margin:0;font-size:14px;line-height:1.45;font-weight:650}.tpl-lead-retry{appearance:none;-webkit-appearance:none;border:0;border-radius:10px;background:#7c2d12;color:#fff;font:inherit;font-size:16px;font-weight:700;line-height:1.2;min-height:44px;padding:10px 14px;cursor:pointer}.tpl-lead-wpp{color:#7c2d12;font-size:16px;font-weight:700;line-height:1.3;min-height:44px;display:inline-flex;align-items:center}";
    document.head.appendChild(style);
  }

  document.addEventListener("pointerdown", antecipar, true);
  document.addEventListener("keydown", antecipar, true);
})();
