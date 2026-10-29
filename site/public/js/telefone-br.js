/* Telefone / WhatsApp das LPs.
   Aceita DDD, +55, espaço e o 9 do celular.
   Recusa número sem DDD, sem o 9 ou com DDD que não existe.
   Não guarda o número: só devolve máscara, código e a frase do erro. */
(function (root) {
  var DDD = {
    11: 1, 12: 1, 13: 1, 14: 1, 15: 1, 16: 1, 17: 1, 18: 1, 19: 1,
    21: 1, 22: 1, 24: 1, 27: 1, 28: 1,
    31: 1, 32: 1, 33: 1, 34: 1, 35: 1, 37: 1, 38: 1,
    41: 1, 42: 1, 43: 1, 44: 1, 45: 1, 46: 1, 47: 1, 48: 1, 49: 1,
    51: 1, 53: 1, 54: 1, 55: 1,
    61: 1, 62: 1, 63: 1, 64: 1, 65: 1, 66: 1, 67: 1, 68: 1, 69: 1,
    71: 1, 73: 1, 74: 1, 75: 1, 77: 1, 79: 1,
    81: 1, 82: 1, 83: 1, 84: 1, 85: 1, 86: 1, 87: 1, 88: 1, 89: 1,
    91: 1, 92: 1, 93: 1, 94: 1, 95: 1, 96: 1, 97: 1, 98: 1, 99: 1,
  };
  var TEXTOS = {
    vazio: "Informe o WhatsApp com DDD.",
    sem_ddd: "Falta o DDD. Use o código da cidade e o 9 na frente.",
    incompleto: "WhatsApp incompleto. Use DDD e o 9 na frente.",
    sem_nove: "Inclua o 9 na frente, depois do DDD.",
    ddd: "Esse DDD não é válido. Confira o código da cidade.",
  };

  function digitsBR(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.charAt(0) === "0" && d.length >= 12) d = d.slice(1);
    if (d.indexOf("55") === 0 && d.length >= 12) d = d.slice(2);
    if (d.charAt(0) === "0" && d.length >= 12) d = d.slice(1);
    if (d.length > 11) d = d.slice(0, 11);
    return d;
  }

  function maskBR(d) {
    var len = d.length;
    if (!len) return "";
    if (len <= 2) return "(" + d;
    if (len <= 7) return "(" + d.slice(0, 2) + ") " + d.slice(2);
    return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
  }

  function motivoTelefone(raw) {
    var d = digitsBR(raw);
    if (!d) return "vazio";
    if (d.length < 10) {
      if (d.length >= 8 && d.charAt(0) === "9") return "sem_ddd";
      return "incompleto";
    }
    if (d.length === 10) {
      if (!DDD[d.slice(0, 2)]) return "incompleto";
      return "sem_nove";
    }
    if (!DDD[d.slice(0, 2)]) return "ddd";
    if (d.charAt(2) !== "9") return "sem_nove";
    return "";
  }

  function mensagemTelefone(codigo) {
    return TEXTOS[codigo] || "";
  }

  function caixaErro(el) {
    var field = el.closest ? el.closest(".field") : null;
    if (!field) return { field: null, box: null };
    var box = field.querySelector("[data-tel-error]");
    if (!box) {
      box = document.createElement("p");
      box.className = "error-msg";
      box.setAttribute("data-tel-error", "");
      box.setAttribute("role", "alert");
      field.appendChild(box);
    }
    return { field: field, box: box };
  }

  function aplicar(el, opts) {
    if (!el) return "";
    opts = opts || {};
    var d = digitsBR(el.value);
    var codigo = motivoTelefone(el.value);
    var msg = mensagemTelefone(codigo);
    var masked = maskBR(d);
    if (el.value !== masked) el.value = masked;
    if (el.setCustomValidity) el.setCustomValidity(msg);
    if (codigo) el.dataset.telMotivo = codigo;
    else delete el.dataset.telMotivo;
    el.setAttribute("aria-invalid", codigo ? "true" : "false");
    var ui = caixaErro(el);
    if (!codigo) {
      if (ui.field) ui.field.classList.remove("field--error");
      if (ui.box) ui.box.textContent = "";
      return "";
    }
    var mostrar = !!opts.mostrar || (ui.field && ui.field.classList.contains("field--error"));
    if (!mostrar) return codigo;
    if (ui.field) ui.field.classList.add("field--error");
    if (ui.box) ui.box.textContent = msg;
    if (opts.rolar && el.scrollIntoView) {
      try { el.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (_) {}
    }
    return codigo;
  }

  root.tplTelefone = {
    digitsBR: digitsBR,
    maskBR: maskBR,
    motivoTelefone: motivoTelefone,
    mensagemTelefone: mensagemTelefone,
    aplicar: aplicar,
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
