/* Turnstile invisível dos formulários que criam lead.
   A pessoa não vê widget nem campo novo. O token entra sozinho no POST /api/lead.
   Chave pública do widget templum-leads. O segredo fica só no Worker.
   Se a verificação falhar ou o script não responder, a pessoa vê a mensagem,
   o botão de tentar de novo e o WhatsApp da própria LP. */
(function () {
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
      }, 6000);
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
        host.setAttribute("aria-hidden", "true");
        host.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;";
        (document.body || document.documentElement).appendChild(host);
      }
      widgetId = window.turnstile.render(host, {
        sitekey: SITE_KEY,
        size: "invisible",
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

  function avisarFalha(codigo) {
    if (codigo === "turnstile_timeout") codigo = "timeout";
    if (codigo === "turnstile_script") codigo = "script";
    if (codigo === "reset") return;
    try {
      document.dispatchEvent(new CustomEvent("tpl:turnstile-fail", {
        detail: { codigo: String(codigo || "turnstile").slice(0, 40) },
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
        }, 8000);
        function done(ok, value) {
          if (settled || my !== attempt || gen !== generation) return;
          settled = true;
          clearTimeout(timer);
          if (pending && pending.id === my) pending = null;
          if (!ok) {
            var codigo = (value && value.code) || (value && value.message) || "turnstile";
            avisarFalha(codigo);
            try { window.turnstile.reset(widgetId); } catch (_) {}
          }
          if (ok) resolve(value);
          else reject(value);
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
      avisarFalha(codigo);
      return Promise.reject(err);
    });
  }

  function unlock() {
    var release = releaseGate;
    releaseGate = null;
    if (release) release();
  }

  window.tplTurnstileToken = function () {
    var run = gate.then(getOneToken, getOneToken);
    gate = run.then(function () {
      return new Promise(function (resolve) {
        var opened = false;
        function once() {
          if (opened) return;
          opened = true;
          resolve();
        }
        releaseGate = once;
        setTimeout(once, 15000);
      });
    }, function () {
      return Promise.resolve();
    });
    return run;
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
    var src = form && form.querySelector("a.lead-wpp[href], a[data-wpp-ref][href]");
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

  function warm() {
    ensureWidget().catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", warm);
  else warm();
})();
