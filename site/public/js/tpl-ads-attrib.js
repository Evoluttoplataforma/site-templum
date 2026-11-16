/* Clique de anúncio por 90 dias.
   localStorage tpl_ads_attrib + cookie de reserva com o mesmo nome.
   Visita sem parâmetros não apaga clique pago.
   utm_medium cpc não vira organic.
   window.tplAdsAttrib() devolve os campos do /api/lead e do /api/whatsapp-ref. */
(function () {
  var CHAVE = "tpl_ads_attrib";
  var DIAS = 90;
  var TTL = DIAS * 24 * 60 * 60 * 1000;
  var CLICKS = ["gclid", "gbraid", "wbraid"];
  var UTMS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
  var CAMPOS = CLICKS.concat(UTMS);
  var TESTE = /teste|test/i;

  function agora() { return Date.now(); }

  function limpo(v, max) {
    var s = String(v || "").replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
    if (!s || s.indexOf("@") !== -1) return "";
    return s.slice(0, max || 200);
  }

  function pago(o) {
    return !!(o && (o.gclid || o.gbraid || o.wbraid));
  }

  function meioPago(m) {
    return /^(cpc|ppc|paid|paidsocial|paid-social|cpm|display)$/i.test(m || "");
  }

  function meioOrganico(m) {
    return /^organic$/i.test(String(m || "").trim());
  }

  function lerUrl() {
    var p = new URLSearchParams(location.search);
    var o = {};
    CAMPOS.forEach(function (k) { o[k] = limpo(p.get(k)); });
    o.modo_teste_url = p.get("modo_teste") === "1";
    return o;
  }

  function parse(raw) {
    if (!raw) return null;
    try {
      var o = JSON.parse(raw);
      if (!o || typeof o !== "object") return null;
      var t = Number(o.t);
      if (!t || agora() - t > TTL) return null;
      var out = { t: t, origem: o.origem === "cookie_google" ? "cookie_google" : "url" };
      CAMPOS.forEach(function (k) { out[k] = limpo(o[k]); });
      return out;
    } catch (_) { return null; }
  }

  function lerCookieBruto() {
    var m = document.cookie.match(new RegExp("(?:^|; )" + CHAVE + "=([^;]*)"));
    if (!m) return "";
    try { return decodeURIComponent(m[1]); } catch (_) { return ""; }
  }

  function lerGuardado() {
    var a = null;
    var b = null;
    try { a = parse(localStorage.getItem(CHAVE)); } catch (_) {}
    b = parse(lerCookieBruto());
    if (a && b) return a.t >= b.t ? a : b;
    return a || b;
  }

  function apagar() {
    try { localStorage.removeItem(CHAVE); } catch (_) {}
    document.cookie = CHAVE + "=; Path=/; Max-Age=0; SameSite=Lax";
  }

  function salvar(o) {
    var rec = { t: o.t || agora(), origem: o.origem === "cookie_google" ? "cookie_google" : "url" };
    CAMPOS.forEach(function (k) { rec[k] = limpo(o[k]); });
    var json = "";
    try { json = JSON.stringify(rec); } catch (_) { return; }
    try { localStorage.setItem(CHAVE, json); } catch (_) {}
    var seg = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = CHAVE + "=" + encodeURIComponent(json)
      + "; Path=/; Max-Age=" + Math.floor(TTL / 1000) + "; SameSite=Lax" + seg;
  }

  function gcl(nome) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]*)"));
    if (!m) return null;
    var v = "";
    try { v = decodeURIComponent(m[1]); } catch (_) { return null; }
    var partes = v.split(".");
    if (partes.length < 3 || partes[0] !== "GCL") return null;
    var ts = Number(partes[1]);
    var valor = limpo(partes.slice(2).join("."));
    if (!ts || !valor) return null;
    if (agora() - ts * 1000 > TTL) return null;
    return { t: ts * 1000, valor: valor };
  }

  function temUtm(o) {
    return UTMS.some(function (k) { return !!o[k]; });
  }

  function capturar() {
    var url = lerUrl();
    var guard = lerGuardado();
    if (pago(url)) {
      var next = { t: agora(), origem: "url", gclid: url.gclid, gbraid: url.gbraid, wbraid: url.wbraid };
      UTMS.forEach(function (k) {
        if (url[k]) next[k] = url[k];
        else if (guard && guard[k]) next[k] = guard[k];
      });
      salvar(next);
      return;
    }
    if (temUtm(url)) {
      if (pago(guard) && meioPago(guard.utm_medium) && meioOrganico(url.utm_medium)) return;
      if (pago(guard)) return;
      var base = guard ? Object.assign({}, guard) : { t: agora(), origem: "url" };
      UTMS.forEach(function (k) { if (url[k]) base[k] = url[k]; });
      base.t = agora();
      salvar(base);
      return;
    }
    guard = lerGuardado();
    var aw = gcl("_gcl_aw");
    var gb = gcl("_gcl_gb");
    var tCookie = Math.max(aw ? aw.t : 0, gb ? gb.t : 0);
    var tGuard = pago(guard) ? guard.t : 0;
    if ((aw || gb) && tCookie && tCookie > tGuard) {
      var rec = {
        t: tCookie,
        origem: "cookie_google",
        gclid: aw ? aw.valor : "",
        gbraid: gb ? gb.valor : "",
        wbraid: (guard && guard.wbraid) || ""
      };
      UTMS.forEach(function (k) { rec[k] = (guard && guard[k]) || ""; });
      salvar(rec);
    }
  }

  function modoTeste(vals) {
    var url = lerUrl();
    if (url.modo_teste_url) return true;
    return CLICKS.some(function (k) { return TESTE.test(vals[k] || ""); });
  }

  function montar() {
    capturar();
    var url = lerUrl();
    var guard = lerGuardado();
    var origem = "";
    var src = {};
    if (pago(url)) {
      origem = "url";
      src = guard && pago(guard) ? guard : url;
    } else if (pago(guard)) {
      origem = guard.origem === "cookie_google" ? "cookie_google" : "guardado";
      src = guard;
    } else if (guard) {
      src = guard;
    }
    var out = { origem_clique: origem, modo_teste: false };
    CAMPOS.forEach(function (k) { out[k] = limpo(src[k]); });
    out.modo_teste = modoTeste(out);
    return out;
  }

  capturar();
  window.tplAdsAttrib = montar;
  window.tplAdsModoTeste = function () { return montar().modo_teste === true; };
})();
