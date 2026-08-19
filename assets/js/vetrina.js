/* ==========================================================================
   IL RUSTICO — vetrina dei servizi extra
   Petali che scendono sullo sfondo, con profondita' e raffiche di vento,
   e entrata in scena dei riquadri.
   Nessun pagamento, nessun modulo, nessun collegamento esterno.
   ========================================================================== */

(function () {
  "use strict";

  var motoRidotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. entrata in scena dei riquadri --------------------------------- */
  var blocchi = document.querySelectorAll("[data-entra]");
  blocchi.forEach(function (el) {
    el.style.setProperty("--ritardo", el.dataset.ritardo || 0);
  });

  function mostraTutto() {
    blocchi.forEach(function (el) { el.classList.add("e-in"); });
  }

  if (motoRidotto || !("IntersectionObserver" in window)) {
    mostraTutto();
  } else {
    var osservatore = new IntersectionObserver(function (voci) {
      voci.forEach(function (v) {
        if (v.isIntersecting) {
          v.target.classList.add("e-in");
          osservatore.unobserve(v.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    blocchi.forEach(function (el) { osservatore.observe(el); });
    window.setTimeout(mostraTutto, 3000);   // rete di sicurezza
  }

  if (motoRidotto) return;

  /* ---- 2. parallasse dello sfondo --------------------------------------- */
  var foto = document.querySelector(".scena__foto");
  if (foto) {
    var inCoda = false;
    window.addEventListener("scroll", function () {
      if (inCoda) return;
      inCoda = true;
      requestAnimationFrame(function () {
        var limite = window.innerHeight * 0.055;
        var y = Math.max(-limite, Math.min(limite, window.scrollY * 0.07));
        foto.style.transform = "translate3d(0," + y.toFixed(1) + "px,0)";
        inCoda = false;
      });
    }, { passive: true });
  }

  /* ---- 3. petali di rosa ------------------------------------------------ */
  var tela = document.getElementById("petali");
  if (!tela) return;
  var ctx = tela.getContext("2d", { alpha: true });
  if (!ctx) return;

  // tonalita' riprese dai petali veri della fotografia
  var TINTE = ["#D64430", "#C0342A", "#E2604A", "#B62B25", "#E8735C", "#CF3B2E"];

  var petali = [];
  var larghezza = 0, altezza = 0, dpr = 1;
  var attivo = true;
  var telefono = false;

  // vento: una brezza di fondo piu' raffiche che vanno e vengono
  var brezza = 0, raffica = 0, raffApp = 0, tempo = 0;

  function quanti() {
    var area = window.innerWidth * window.innerHeight;
    var n = Math.round(area / (telefono ? 44000 : 28000));
    return Math.max(12, Math.min(telefono ? 22 : 42, n));
  }

  function nuovoPetalo(sopra) {
    // profondita': 0.45 lontano e lento, 1 vicino e veloce
    var z = 0.45 + Math.random() * 0.55;
    return {
      z: z,
      x: Math.random() * larghezza,
      y: sopra ? -30 - Math.random() * 120 : Math.random() * altezza,
      dim: (5 + Math.random() * 6) * z,
      caduta: (0.16 + Math.random() * 0.3) * z,
      ondaAmp: (0.3 + Math.random() * 0.8),
      ondaVel: 0.005 + Math.random() * 0.011,
      fase: Math.random() * Math.PI * 2,
      giro: Math.random() * Math.PI * 2,
      velGiro: (Math.random() - 0.5) * 0.018,
      capriola: Math.random() * Math.PI * 2,
      velCapriola: 0.012 + Math.random() * 0.022,
      opacita: (0.3 + Math.random() * 0.34) * (0.5 + z * 0.5),
      tinta: TINTE[(Math.random() * TINTE.length) | 0]
    };
  }

  function ridimensiona() {
    telefono = window.innerWidth < 800;
    dpr = Math.min(window.devicePixelRatio || 1, telefono ? 1.5 : 2);
    larghezza = window.innerWidth;
    altezza = window.innerHeight;
    tela.width = Math.round(larghezza * dpr);
    tela.height = Math.round(altezza * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var n = quanti();
    while (petali.length < n) petali.push(nuovoPetalo(false));
    petali.length = n;
  }

  function forma(s) {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.bezierCurveTo(s * 0.82, -s * 0.62, s * 0.58, s * 0.7, 0, s);
    ctx.bezierCurveTo(-s * 0.58, s * 0.7, -s * 0.82, -s * 0.62, 0, -s);
    ctx.closePath();
    ctx.fill();
  }

  function passo() {
    if (!attivo) return;

    tempo += 0.0055;
    brezza = Math.sin(tempo) * 0.32 + Math.sin(tempo * 0.37) * 0.2;

    // ogni tanto arriva una raffica, che poi si spegne da sola
    if (raffica <= 0 && Math.random() < 0.0022) {
      raffica = 90 + Math.random() * 130;
      raffApp = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9);
    }
    var spinta = brezza;
    if (raffica > 0) {
      raffica--;
      spinta += raffApp * Math.sin((raffica / 220) * Math.PI);
    }

    ctx.clearRect(0, 0, larghezza, altezza);

    for (var i = 0; i < petali.length; i++) {
      var p = petali[i];

      p.fase += p.ondaVel;
      p.capriola += p.velCapriola;
      p.giro += p.velGiro + spinta * 0.004 * p.z;

      p.y += p.caduta;
      p.x += Math.sin(p.fase) * p.ondaAmp * p.z + spinta * p.z;

      if (p.y - p.dim > altezza) { petali[i] = nuovoPetalo(true); continue; }
      if (p.x < -40) p.x = larghezza + 40;
      else if (p.x > larghezza + 40) p.x = -40;

      // la capriola mostra il petalo ora di piatto ora di taglio
      var taglio = Math.cos(p.capriola);
      var largo = Math.max(0.12, Math.abs(taglio));

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.giro);
      ctx.scale(largo, 1);
      ctx.globalAlpha = p.opacita * (0.45 + 0.55 * largo);
      ctx.fillStyle = p.tinta;
      forma(p.dim);
      ctx.restore();
    }
    requestAnimationFrame(passo);
  }

  var attesa;
  window.addEventListener("resize", function () {
    clearTimeout(attesa);
    attesa = setTimeout(ridimensiona, 200);
  }, { passive: true });

  // a scheda nascosta l'animazione si ferma: niente batteria sprecata
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      attivo = false;
    } else if (!attivo) {
      attivo = true;
      requestAnimationFrame(passo);
    }
  });

  ridimensiona();
  requestAnimationFrame(passo);
})();
