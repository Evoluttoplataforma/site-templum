/**
 * Fonte da verdade do "próximo encontro" do MQ26.
 * Depois das 17h (Brasília) do encontro do dia, avança para o seguinte.
 */
(function (root) {
  var SERIES = [
    {
      ymd: "2026-11-09",
      diaCurto: "09/11",
      diaLongo: "9 de novembro",
      titulo: "Performance de processos e valor",
      quem: "Igor Furniel",
      resumo: "Processos, equipes e tecnologia alinhados ao que o cliente busca.",
    },
    {
      ymd: "2026-11-16",
      diaCurto: "16/11",
      diaLongo: "16 de novembro",
      titulo: "Performance na execução",
      quem: "Daniela Albuquerque",
      resumo: "Responsáveis claros e equipes trabalhando juntas.",
    },
    {
      ymd: "2026-11-23",
      diaCurto: "23/11",
      diaLongo: "23 de novembro",
      titulo: "Performance de indicadores e melhoria",
      quem: "Daniela Albuquerque",
      resumo: "Medições para decidir e prioridades de melhoria definidas.",
    },
    {
      ymd: "2026-11-30",
      diaCurto: "30/11",
      diaLongo: "30 de novembro",
      titulo: "Performance com IA e melhoria contínua",
      quem: "Igor Furniel",
      resumo: "IA como apoio ao método, com cultura de melhoria.",
    },
  ];

  function agoraBrasilia() {
    return new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }),
    );
  }

  function fimDoDia(ymd) {
    var p = ymd.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2], 17, 0, 0, 0);
  }

  function proximo(agora) {
    var now = agora || agoraBrasilia();
    for (var i = 0; i < SERIES.length; i++) {
      if (now < fimDoDia(SERIES[i].ymd)) return SERIES[i];
    }
    return null;
  }

  function aplicar(doc) {
    var d = doc || document;
    var p = proximo();
    root.__mq26Proximo = p;
    if (!p) {
      d.querySelectorAll("[data-mq26]").forEach(function (el) {
        var ended = el.getAttribute("data-mq26-ended");
        if (ended) el.textContent = ended;
      });
      return p;
    }

    d.querySelectorAll("[data-mq26]").forEach(function (el) {
      var key = el.getAttribute("data-mq26");
      var map = {
        "hero-data": p.diaLongo,
        "hero-lead":
          "Próximo encontro: " +
          p.titulo +
          ", com " +
          p.quem +
          ". As gravações dos encontros anteriores serão disponibilizadas.",
        "meta-desc":
          "Próximo encontro do Mês da Qualidade 2026: " +
          p.diaLongo +
          ", às 16h (horário de Brasília), online e gratuito. " +
          p.titulo +
          ", com " +
          p.quem +
          ". As gravações dos encontros anteriores serão disponibilizadas.",
        "bloco-proximo":
          "O próximo encontro é dia " +
          p.diaLongo +
          ". As gravações dos encontros anteriores serão disponibilizadas. O trabalho continua ao longo de novembro para evoluir a organização dos dados e a visualização dos indicadores.",
        "card-proximo":
          "As informações essenciais do seu sistema de gestão, com a orientação da equipe Templum. Próximo: " +
          p.diaCurto +
          ".",
        "temas-lead":
          "Cada encontro de trabalho parte de um tema que destrava a implementação e recebe as suas dúvidas. Os encontros semanais de novembro são às 16h (horário de Brasília). O próximo é dia " +
          p.diaCurto +
          ". As gravações dos encontros anteriores serão disponibilizadas.",
        "faq-quando":
          "Dia " +
          p.diaLongo +
          " de 2026, às 16h (horário de Brasília), online: " +
          p.titulo +
          ", com " +
          p.quem +
          ". As gravações dos encontros anteriores serão disponibilizadas.",
        "faq-imersao":
          "Não. A imersão prática de 3 a 5 de novembro já aconteceu. O Mês da Qualidade segue às segundas, às 16h (horário de Brasília). O próximo encontro é dia " +
          p.diaCurto +
          ". As gravações dos encontros anteriores serão disponibilizadas.",
        "form-date":
          "Inscreva-se gratuitamente no Mês da Qualidade 2026 · próximo encontro " +
          p.diaLongo +
          " · 16h (horário de Brasília) · Online. Gravações dos encontros anteriores serão disponibilizadas.",
        "sticky":
          "Próximo encontro " +
          p.diaLongo +
          " · 16h (horário de Brasília) · Online · Gravações dos encontros anteriores serão disponibilizadas",
        "bar": "Mês da Qualidade 2026 · Próximo encontro " + p.diaLongo,
        "obrigado-meta":
          "Confirme sua inscrição pelo WhatsApp. É por lá que você recebe o link de cada encontro. Próximo: " +
          p.diaLongo +
          ".",
        "obrigado-fato":
          "Próximo encontro: " +
          p.diaLongo +
          ", às 16h (horário de Brasília). " +
          p.titulo +
          ", com " +
          p.quem +
          ".",
      };
      if (map[key]) el.textContent = map[key];
    });

    var meta = d.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "Próximo encontro do Mês da Qualidade 2026: " +
          p.diaLongo +
          ", às 16h (horário de Brasília), online e gratuito. " +
          p.titulo +
          ", com " +
          p.quem +
          ". As gravações dos encontros anteriores serão disponibilizadas.",
      );
    }
    return p;
  }

  root.MQ26Proximo = { SERIES: SERIES, proximo: proximo, aplicar: aplicar };
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        aplicar(document);
      });
    } else {
      aplicar(document);
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
