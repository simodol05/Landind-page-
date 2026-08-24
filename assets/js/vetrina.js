/* ==========================================================================
   IL RUSTICO — vetrina dei servizi extra
   Due strati di petali: uno dietro ai riquadri, nitido, e uno davanti,
   fuori fuoco come un petalo vicinissimo all'obiettivo. Piu' la parallasse
   dello sfondo e l'entrata in scena dei riquadri.
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

  /* ---- 2. parallasse dello sfondo --------------------------------------- */
  // La parallasse e' un movimento ampio: e' la prima cosa da togliere
  // quando il sistema chiede meno animazioni. I petali invece restano.
  var foto = motoRidotto ? null : document.querySelector(".scena__foto");
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

  /* ---- 3. petali --------------------------------------------------------- */
  // tonalita' riprese dai petali veri della fotografia
  var TINTE = ["#D64430", "#C0342A", "#E2604A", "#B62B25", "#E8735C", "#CF3B2E"];
  var scegliTinta = function () { return TINTE[(Math.random() * TINTE.length) | 0]; };

  var larghezza = 0, altezza = 0, telefono = false;
  // vento condiviso dai due strati, cosi' si muovono d'accordo
  var brezza = 0, raffica = 0, raffApp = 0, tempo = 0, spinta = 0;

  function Strato(tela, conf) {
    this.tela = tela;
    this.ctx = tela.getContext("2d", { alpha: true });
    this.conf = conf;
    this.petali = [];
  }

  Strato.prototype.nuovo = function (sopra) {
    var c = this.conf;
    // profondita': verso 1 il petalo e' vicino, veloce e nitido
    var z = c.zMin + Math.random() * (c.zMax - c.zMin);
    return {
      z: z,
      x: Math.random() * larghezza,
      y: sopra ? -40 - Math.random() * 140 : Math.random() * altezza,
      dim: (c.dim + Math.random() * c.dimVar) * z,
      caduta: (c.caduta + Math.random() * c.cadutaVar) * z,
      ondaAmp: c.onda + Math.random() * c.ondaVar,
      ondaVel: 0.005 + Math.random() * 0.011,
      fase: Math.random() * Math.PI * 2,
      giro: Math.random() * Math.PI * 2,
      velGiro: (Math.random() - 0.5) * 0.02,
      capriola: Math.random() * Math.PI * 2,
      velCapriola: 0.012 + Math.random() * 0.024,
      opacita: (c.opac + Math.random() * c.opacVar) * (0.55 + z * 0.45),
      // i petali di primo piano compaiono a tratti, non di continuo
      attesa: sopra ? Math.round(Math.random() * c.attesa) : 0,
      tinta: scegliTinta()
    };
  };

  Strato.prototype.ridimensiona = function () {
    var f = this.conf.risoluzione;
    this.tela.width = Math.max(1, Math.round(larghezza * f));
    this.tela.height = Math.max(1, Math.round(altezza * f));
    this.ctx.setTransform(f, 0, 0, f, 0, 0);

    var n = this.conf.quanti();
    while (this.petali.length < n) this.petali.push(this.nuovo(false));
    this.petali.length = n;
  };

  Strato.prototype.forma = function (s) {
    var c = this.ctx;
    c.beginPath();
    c.moveTo(0, -s);
    c.bezierCurveTo(s * 0.82, -s * 0.62, s * 0.58, s * 0.7, 0, s);
    c.bezierCurveTo(-s * 0.58, s * 0.7, -s * 0.82, -s * 0.62, 0, -s);
    c.closePath();
    c.fill();
  };

  Strato.prototype.disegna = function () {
    var c = this.ctx;
    c.clearRect(0, 0, larghezza, altezza);

    for (var i = 0; i < this.petali.length; i++) {
      var p = this.petali[i];

      if (p.attesa > 0) { p.attesa--; continue; }

      p.fase += p.ondaVel;
      p.capriola += p.velCapriola;
      p.giro += p.velGiro + spinta * 0.004 * p.z;

      p.y += p.caduta;
      p.x += Math.sin(p.fase) * p.ondaAmp * p.z + spinta * p.z;

      if (p.y - p.dim > altezza) { this.petali[i] = this.nuovo(true); continue; }
      if (p.x < -60) p.x = larghezza + 60;
      else if (p.x > larghezza + 60) p.x = -60;

      // la capriola mostra il petalo ora di piatto ora di taglio
      var taglio = Math.cos(p.capriola);
      var largo = Math.max(0.12, Math.abs(taglio));

      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.giro);
      c.scale(largo, 1);
      c.globalAlpha = p.opacita * (0.45 + 0.55 * largo);
      c.fillStyle = p.tinta;
      this.forma(p.dim);
      c.restore();
    }
  };

  var telaDietro = document.getElementById("petali");
  var telaAvanti = document.getElementById("petali-avanti");
  if (!telaDietro || !telaDietro.getContext) return;

  var strati = [];

  strati.push(new Strato(telaDietro, {
    risoluzione: 1,               // impostata a ogni ridimensionamento
    zMin: 0.45, zMax: 1,
    dim: 6, dimVar: 7,
    caduta: 0.19, cadutaVar: 0.34,
    onda: 0.3, ondaVar: 0.8,
    opac: 0.4, opacVar: 0.38,
    attesa: 0,
    quanti: function () {
      var area = window.innerWidth * window.innerHeight;
      var n = Math.round(area / (telefono ? 34000 : 23000));
      return Math.max(16, Math.min(telefono ? 30 : 54, n));
    }
  }));

  if (telaAvanti && telaAvanti.getContext) {
    strati.push(new Strato(telaAvanti, {
      // disegnato in piccolo e riportato a schermo intero: l'ingrandimento
      // sfoca da solo, la sfocatura CSS rifinisce
      risoluzione: 0.4,
      zMin: 1.5, zMax: 2.4,
      dim: 14, dimVar: 11,
      caduta: 0.58, cadutaVar: 0.5,
      onda: 0.5, ondaVar: 0.9,
      opac: 0.34, opacVar: 0.18,
      attesa: 200,                // fino a ~3 secondi di pausa fra un petalo e l'altro
      quanti: function () { return telefono ? 4 : 6; }
    }));
  }

  function ridimensiona() {
    telefono = window.innerWidth < 800;
    var dpr = Math.min(window.devicePixelRatio || 1, telefono ? 1.5 : 2);
    larghezza = window.innerWidth;
    altezza = window.innerHeight;
    strati[0].conf.risoluzione = dpr;
    strati.forEach(function (s) { s.ridimensiona(); });
  }

  var attivo = true;

  function passo() {
    if (!attivo) return;

    tempo += 0.0055;
    brezza = (Math.sin(tempo) * 0.32 + Math.sin(tempo * 0.37) * 0.2) * (motoRidotto ? 0.5 : 1);

    // ogni tanto arriva una raffica, che poi si spegne da sola
    if (!motoRidotto && raffica <= 0 && Math.random() < 0.0022) {
      raffica = 90 + Math.random() * 130;
      raffApp = (Math.random() < 0.5 ? -1 : 1) * (0.6 + Math.random() * 0.9);
    }
    spinta = brezza;
    if (raffica > 0) {
      raffica--;
      spinta += raffApp * Math.sin((raffica / 220) * Math.PI);
    }

    for (var i = 0; i < strati.length; i++) strati[i].disegna();
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
