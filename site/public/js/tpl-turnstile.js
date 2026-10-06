/* Turnstile invisível dos formulários que criam lead.
   A pessoa não vê widget nem campo novo. O token entra sozinho no POST /api/lead.
   Chave pública do widget templum-leads. O segredo fica só no Worker. */
(function () {
  if (window.tplTurnstileToken) return;

  var SITE_KEY = "0x4AAAAAAFOylHIgVZ3_2VYE";
  var SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
  var widgetId = null;
  var scriptPromise = null;
  var renderPromise = null;
  var attempt = 0;
  var pending = null;
  var gate = Promise.resolve();
  var releaseGate = null;

  function loadScript() {
    if (window.turnstile) return Promise.resolve();
    if (scriptPromise) return scriptPromise;
    scriptPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.onload = function () { resolve(); };
      s.onerror = function () {
        scriptPromise = null;
        reject(new Error("turnstile_script"));
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
        "error-callback": function () {
          var current = pending;
          pending = null;
          if (current) current.done(false, new Error("turnstile"));
        },
        "timeout-callback": function () {
          var current = pending;
          pending = null;
          if (current) current.done(false, new Error("turnstile_timeout"));
        },
      });
      return widgetId;
    }).catch(function (err) {
      renderPromise = null;
      throw err;
    });
    return renderPromise;
  }

  function getOneToken() {
    return ensureWidget().then(function () {
      var my = ++attempt;
      return new Promise(function (resolve, reject) {
        var settled = false;
        var timer = setTimeout(function () {
          done(false, new Error("turnstile_timeout"));
        }, 8000);
        function done(ok, value) {
          if (settled || my !== attempt) return;
          settled = true;
          clearTimeout(timer);
          if (pending && pending.id === my) pending = null;
          if (!ok) {
            try { window.turnstile.reset(widgetId); } catch (_) {}
          }
          if (ok) resolve(value);
          else reject(value);
        }
        pending = { id: my, done: done };
        try {
          window.turnstile.execute(widgetId);
        } catch (err) {
          done(false, err);
        }
      });
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
    if (widgetId !== null && window.turnstile) {
      try { window.turnstile.reset(widgetId); } catch (_) {}
    }
    unlock();
  };

  function errorNode(form) {
    if (!form) return null;
    var msg = form.querySelector("[data-lead-error].tpl-lead-error");
    if (msg) return msg;
    msg = document.createElement("p");
    msg.setAttribute("data-lead-error", "1");
    msg.className = "tpl-lead-error";
    msg.setAttribute("role", "alert");
    var button = form.querySelector('[type="submit"]');
    if (button && button.parentNode) button.parentNode.insertBefore(msg, button.nextSibling);
    else form.appendChild(msg);
    return msg;
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
    if (msg) msg.textContent = "Não conseguimos enviar agora. Tente de novo.";
  };

  if (!document.getElementById("tpl-turnstile-style")) {
    var style = document.createElement("style");
    style.id = "tpl-turnstile-style";
    style.textContent = ".tpl-lead-error{margin:12px 0 0;padding:10px 12px;border-radius:10px;font-size:14px;line-height:1.45;font-weight:650;color:#7c2d12;background:#fff7ed;}";
    document.head.appendChild(style);
  }

  function warm() {
    ensureWidget().catch(function () {});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", warm);
  else warm();
})();
