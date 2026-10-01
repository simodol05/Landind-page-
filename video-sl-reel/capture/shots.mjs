// Piano di ripresa: posizione di scorrimento (px CSS) nel tempo, per ogni ripresa.
// I tempi sono in secondi dall'inizio della ripresa; il montaggio avviene poi in Remotion.
const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const lin = (x) => x;

// keyframes: [t, y, curva per il tratto che porta a questo punto]
function track(keys) {
  return (t) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, y1, ease = easeInOut] = keys[i];
      const [t0, y0] = keys[i - 1];
      if (t <= t1) return y0 + (y1 - y0) * ease((t - t0) / (t1 - t0));
    }
    return keys[keys.length - 1][1];
  };
}

export const SHOTS = {
  // A — apertura, pacchetti romantici (scene 1, 2 e inizio 3)
  A: {
    duration: 21.4,
    scroll: track([
      [0, 0],
      [9.9, 0],
      [13.6, 880],            // verso "Essenza d'Amore"
      [15.5, 940, lin],       // lettura lenta dei dettagli
      [16.9, 1570],           // "Momento d'Amore"
      [18.1, 1620, lin],
      [19.6, 2390],           // "Sogno d'Amore"
      [21.4, 2580, lin],
    ]),
    actions: [],
  },
  // B — orari flessibili: scelta di un'opzione e pulsante "Richiedi il servizio" (fine scena 3)
  B: {
    duration: 4.0,
    scroll: track([
      [0, 330],
      [1.1, 430],
      [4.0, 438, lin],
    ]),
    // tocco sull'opzione "Combinazione": cambia solo lo stato della pagina nel browser,
    // il pulsante NON viene premuto (nessuna richiesta, nessun invio).
    actions: [{ t: 1.5, run: () => document.querySelectorAll('#orari-flessibili .rf-option')[3].click() }],
  },
};
