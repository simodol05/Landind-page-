/* ==========================================================================
   IL RUSTICO — Romantic Suite & Sauna
   Comportamenti della landing page (nessun pagamento, nessun checkout).
   ========================================================================== */

/* ┌────────────────────────────────────────────────────────────────────────┐
   │  UNICA RIGA DA MODIFICARE                                              │
   │                                                                        │
   │  Incolla qui il link alla conversazione Airbnb, se ne hai uno.         │
   │  Lasciando le virgolette vuote il bottone resta una targhetta          │
   │  elegante e non cliccabile: l'ospite legge comunque l'istruzione       │
   │  di tornare nella chat Airbnb.                                         │
   │                                                                        │
   │  Esempio:                                                              │
   │  const AIRBNB_URL = "https://www.airbnb.it/messaging/thread/123456";   │
   └────────────────────────────────────────────────────────────────────────┘ */

const AIRBNB_URL = "";

/* ────────────────────────────────────────────────────────────────────────── */

(function () {
  "use strict";

  /* ---- 1. bottone finale "Scrivimi su Airbnb" ---------------------------- */
  const cta = document.getElementById("airbnb-cta");
  const hint = document.getElementById("airbnb-hint");

  if (cta) {
    const url = (AIRBNB_URL || "").trim();
    if (url) {
      cta.href = url;
      cta.target = "_blank";
      cta.rel = "noopener noreferrer";
      if (hint) hint.hidden = true;
    } else {
      // nessun link configurato: niente collegamento morto
      cta.removeAttribute("href");
      cta.classList.add("is-static");
      cta.setAttribute("role", "note");
      if (hint) hint.hidden = false;
    }
  }

  /* ---- 2. comparsa graduale dei blocchi allo scroll ---------------------- */
  const revealables = document.querySelectorAll("[data-reveal]");
  const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!("IntersectionObserver" in window) || !motionOk) {
    revealables.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    const revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealer.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });

    revealables.forEach(function (el) { revealer.observe(el); });

    // rete di sicurezza: se per qualsiasi motivo l'osservatore non scattasse,
    // dopo 3 secondi tutto viene comunque mostrato.
    window.setTimeout(function () {
      revealables.forEach(function (el) { el.classList.add("is-visible"); });
    }, 3000);
  }

  /* ---- 3. barra superiore: appare solo dopo la hero ---------------------- */
  const topbar = document.getElementById("topbar");
  const hero = document.querySelector(".hero");

  if (topbar && hero && "IntersectionObserver" in window) {
    const barWatcher = new IntersectionObserver(function (entries) {
      topbar.classList.toggle("is-visible", !entries[0].isIntersecting);
    }, { rootMargin: "-70% 0px 0px 0px" });
    barWatcher.observe(hero);
  }
})();
