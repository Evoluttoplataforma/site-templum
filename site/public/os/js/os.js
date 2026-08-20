/* ==========================================================================
   TEMPLUM OS — motor da página /os/
   ==========================================================================
   Quatro coisas, nesta ordem de importância:
     1. a órbita interativa (o "uau" da página);
     2. revelação no scroll e contadores;
     3. parallax dos closes;
     4. vídeos e barra fixa de CTA no mobile.

   Zero dependência externa: sem three.js, sem GSAP, sem CDN. A órbita é CSS 3D
   com transform calculado por requestAnimationFrame — o suficiente para 12
   objetos, e imune a bloqueio de CDN ou a versão nova de biblioteca quebrando a
   página no meio de uma campanha.

   `prefers-reduced-motion` é respeitado em tudo: a órbita para de girar (mas
   continua navegável por teclado e clique), o parallax desliga, os contadores
   mostram o valor final direto.
   ========================================================================== */
(function () {
  "use strict";

  var calmo = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- 1. ÓRBITA */
  function orbita() {
    var palco = document.querySelector("[data-palco]");
    if (!palco) return;

    var orbes = [].slice.call(palco.querySelectorAll(".orbe"));
    if (!orbes.length) return;

    var cartaoRotulo = document.querySelector("[data-cartao-rotulo]");
    var cartaoTexto = document.querySelector("[data-cartao-texto]");

    // Dois anéis com raios e inclinações diferentes: 7 objetos no de fora, 5 no
    // de dentro. Ângulo distribuído por anel para não empilhar objeto.
    var aneis = [
      { raio: 0.40, inclin: 30, itens: [], vel: 1 },
      { raio: 0.25, inclin: -34, itens: [], vel: -1.35 },
    ];
    orbes.forEach(function (o, i) {
      var anel = i % 3 === 2 ? aneis[1] : aneis[0];
      anel.itens.push(o);
    });
    aneis.forEach(function (a) {
      a.itens.forEach(function (o, i) {
        o.__base = (i / a.itens.length) * Math.PI * 2;
        o.__anel = a;
      });
    });

    var giro = 0;              // rotação acumulada, em radianos
    var velocidade = 0.0016;   // ~60s por volta
    var arrastoV = 0;          // velocidade residual do arraste (inércia)
    var pausado = false;
    var arrastando = false;
    var xInicial = 0;
    var giroInicial = 0;

    function posiciona() {
      var w = palco.clientWidth;
      var h = palco.clientHeight;
      var base = Math.min(w, h);

      aneis.forEach(function (a) {
        a.itens.forEach(function (o) {
          var ang = o.__base + giro * a.vel;
          var raio = base * a.raio;
          var x = Math.cos(ang) * raio * (w / base) * 0.78;
          var z = Math.sin(ang) * raio;
          var y = Math.sin(ang) * (a.inclin / 100) * raio;
          // profundidade: normalizada em 0..1 (1 = na frente)
          var p = (z / raio + 1) / 2;
          var escala = 0.62 + p * 0.58;
          var opac = 0.34 + p * 0.66;
          o.style.transform =
            "translate(-50%,-50%) translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px," + z.toFixed(1) + "px) scale(" + escala.toFixed(3) + ")";
          o.style.opacity = opac.toFixed(3);
          o.style.zIndex = String(Math.round(p * 10));
          o.style.filter = p < 0.45 ? "brightness(" + (0.55 + p) .toFixed(2) + ")" : "";
        });
      });
    }

    function quadro() {
      if (!pausado && !arrastando) giro += velocidade;
      if (arrastoV) {
        giro += arrastoV;
        arrastoV *= 0.94;
        if (Math.abs(arrastoV) < 0.00008) arrastoV = 0;
      }
      posiciona();
      requestAnimationFrame(quadro);
    }

    // --- seleção
    function seleciona(o) {
      orbes.forEach(function (x) { x.classList.toggle("ativo", x === o); });
      if (cartaoRotulo) cartaoRotulo.textContent = o.getAttribute("data-rotulo") || "";
      if (cartaoTexto) cartaoTexto.textContent = o.getAttribute("data-linha") || "";
    }
    orbes.forEach(function (o) {
      o.addEventListener("click", function () { seleciona(o); });
      o.addEventListener("focus", function () { seleciona(o); });
      o.addEventListener("mouseenter", function () { pausado = true; });
      o.addEventListener("mouseleave", function () { pausado = false; });
    });
    seleciona(orbes[0]); // estado inicial ensina a interação sem tutorial

    // --- arraste com inércia
    function pega(e) {
      arrastando = true;
      palco.classList.add("arrastando");
      xInicial = (e.touches ? e.touches[0].clientX : e.clientX);
      giroInicial = giro;
      arrastoV = 0;
    }
    function move(e) {
      if (!arrastando) return;
      var x = (e.touches ? e.touches[0].clientX : e.clientX);
      var d = (x - xInicial) / palco.clientWidth;
      var novo = giroInicial + d * Math.PI * 1.6;
      arrastoV = (novo - giro) * 0.35;
      giro = novo;
    }
    function solta() {
      arrastando = false;
      palco.classList.remove("arrastando");
    }
    palco.addEventListener("mousedown", pega);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", solta);
    palco.addEventListener("touchstart", pega, { passive: true });
    palco.addEventListener("touchmove", move, { passive: true });
    palco.addEventListener("touchend", solta);

    // Fora da tela não gasta CPU (e bateria no celular).
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        pausado = !es[0].isIntersecting;
      }, { threshold: 0.05 }).observe(palco);
    }

    posiciona();
    if (calmo) { velocidade = 0; }
    requestAnimationFrame(quadro);
    window.addEventListener("resize", posiciona);
  }

  /* ------------------------------------------------- 2. REVELAÇÃO + CONTADOR */
  function revelacao() {
    var alvos = [].slice.call(document.querySelectorAll(".rev, [data-anel]"));
    if (!("IntersectionObserver" in window)) {
      alvos.forEach(function (e) { e.classList.add("dentro"); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add("dentro");
        io.unobserve(e.target);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    alvos.forEach(function (e) { io.observe(e); });

    // Rede de segurança — e não é teórica: com salto instantâneo de scroll (é o
    // que o link do CTA faz ao pular para #comecar) o observer não recebe um
    // quadro em que o elemento está intersectando, e o bloco fica invisível.
    // Medido: 9 de 42 blocos revelados depois de rolar a página inteira em
    // saltos. Esta varredura revela qualquer coisa que já passou pela dobra.
    function varre() {
      var lim = window.innerHeight * 0.92;
      for (var i = alvos.length - 1; i >= 0; i--) {
        var el = alvos[i];
        if (el.classList.contains("dentro")) { alvos.splice(i, 1); continue; }
        if (el.getBoundingClientRect().top < lim) {
          el.classList.add("dentro");
          io.unobserve(el);
          alvos.splice(i, 1);
        }
      }
    }
    var agendado = false;
    function agenda() {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(function () { agendado = false; varre(); });
    }
    window.addEventListener("scroll", agenda, { passive: true });
    window.addEventListener("hashchange", function () { setTimeout(varre, 60); });
    varre();
  }

  function contadores() {
    var nums = [].slice.call(document.querySelectorAll("[data-conta]"));
    if (!nums.length) return;
    function anima(el) {
      var alvo = parseFloat(el.getAttribute("data-conta"));
      var prefixo = el.getAttribute("data-prefixo") || "";
      var sufixo = el.getAttribute("data-sufixo") || "";
      var dec = (el.getAttribute("data-dec") || "0") | 0;
      if (calmo) {
        el.textContent = prefixo + alvo.toLocaleString("pt-BR", { minimumFractionDigits: dec }) + sufixo;
        return;
      }
      var t0 = null, dur = 1100;
      function passo(t) {
        if (!t0) t0 = t;
        var p = Math.min((t - t0) / dur, 1);
        var suave = 1 - Math.pow(1 - p, 3);
        el.textContent = prefixo + (alvo * suave).toLocaleString("pt-BR", {
          minimumFractionDigits: dec, maximumFractionDigits: dec,
        }) + sufixo;
        if (p < 1) requestAnimationFrame(passo);
      }
      requestAnimationFrame(passo);
    }
    if (!("IntersectionObserver" in window)) { nums.forEach(anima); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        anima(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ------------------------------------------------------------ 3. PARALLAX */
  function parallax() {
    if (calmo) return;
    var figs = [].slice.call(document.querySelectorAll("[data-parallax]"));
    if (!figs.length) return;
    var ticking = false;
    function atualiza() {
      var vh = window.innerHeight;
      figs.forEach(function (f) {
        var r = f.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var centro = (r.top + r.height / 2 - vh / 2) / vh; // -1..1
        var forca = parseFloat(f.getAttribute("data-parallax")) || 14;
        f.style.transform = "translate3d(0," + (centro * -forca).toFixed(1) + "px,0)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(atualiza); }
    }, { passive: true });
    atualiza();
  }

  /* ------------------------------------------------- 4. VÍDEOS + BARRA MOBILE */
  // Vídeo pesa. Só dá play no que está na tela, e nunca baixa nada antes disso
  // (preload="none" no HTML). Fora da tela, pausa.
  // Hero: o vídeo só entra no desktop. No celular a imagem 9:16 já está no DOM e
  // o vídeo nem é baixado (preload="none" e nenhum autoplay no HTML).
  function heroVideo() {
    var v = document.querySelector("[data-hero-video]");
    if (!v) return;
    if (window.matchMedia("(max-width: 860px)").matches) return;
    if (calmo) return; // movimento reduzido: fica no poster
    v.load();
    v.play().catch(function () {});
  }

  function videos() {
    var vs = [].slice.call(document.querySelectorAll("video[data-lazy]"));
    if (!vs.length) return;
    if (!("IntersectionObserver" in window)) {
      vs.forEach(function (v) { v.play().catch(function () {}); });
      return;
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          if (!v.dataset.pronto) {
            v.dataset.pronto = "1";
            v.load();
          }
          v.play().catch(function () {});
        } else if (!v.paused) {
          v.pause();
        }
      });
    }, { threshold: 0.15 });
    vs.forEach(function (v) { io.observe(v); });
  }

  function barra() {
    var b = document.querySelector("[data-barra]");
    var gatilho = document.querySelector("[data-gatilho-barra]");
    var form = document.getElementById("comecar");
    if (!b || !gatilho) return;
    if (!("IntersectionObserver" in window)) return;
    // Aparece depois do hero…
    new IntersectionObserver(function (es) {
      b.classList.toggle("on", !es[0].isIntersecting);
    }, { threshold: 0 }).observe(gatilho);
    // …e sai de cena quando o próprio formulário aparece (não competir com ele).
    if (form) {
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting) b.classList.remove("on");
      }, { threshold: 0.25 }).observe(form);
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    orbita();
    heroVideo();
    revelacao();
    contadores();
    parallax();
    videos();
    barra();
    // Ano no rodapé, para não envelhecer sozinho.
    var ano = document.querySelector("[data-ano]");
    if (ano) ano.textContent = String(new Date().getFullYear());
  });
})();
