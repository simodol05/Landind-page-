// Tutti i tempi in secondi sulla timeline del video.
// La voce (assets/audio/voce.mp3) parte a VOICE_OFFSET; i tempi delle parole vengono
// dalla trascrizione con marcatura temporale della registrazione reale (+ VOICE_OFFSET).
export const FPS = 30;
export const TOTAL_SECONDS = 34;
export const VOICE_OFFSET = 0.4;

export const SCENES = {
  hook: { from: 0, to: 9.4 },
  esempio: { from: 9.4, to: 18.0 },
  vantaggio: { from: 18.0, to: 24.4 },
  chiusura: { from: 24.4, to: TOTAL_SECONDS },
};

// Riprese della landing reale (capture/): A = apertura e pacchetti, B = orari flessibili.
export const SHOT_A = { src: 'footage/ripresa_A.mp4', from: 0, to: 21.4 };
export const SHOT_B = { src: 'footage/ripresa_B.mp4', from: 21.3, to: 24.7 };
export const TAP_B_LOCAL = 1.5; // istante del tocco sull'opzione dentro la ripresa B

// Titoli (entrano seguendo la voce).
export type Title = { from: number; to: number; kind: 'hook' | 'lower' | 'end'; lines: string[] };
export const TITLES: Title[] = [
  { from: 0.45, to: 4.0, kind: 'hook', lines: ['Hai una struttura', 'ricettiva?'] },
  { from: 4.15, to: 8.45, kind: 'hook', lines: ['Valorizza i tuoi', 'servizi extra.'] },
  { from: 10.0, to: 13.45, kind: 'lower', lines: ['Il Rustico · Progetto realizzato'] },
  { from: 13.75, to: 17.5, kind: 'lower', lines: ['I tuoi extra.', 'Una pagina dedicata.'] },
  { from: 18.55, to: 21.3, kind: 'lower', lines: ['Da servizio extra', 'a opportunità di vendita.'] },
  { from: 24.9, to: 28.45, kind: 'end', lines: ['La prossima potrebbe', 'essere la tua.'] },
  { from: 28.6, to: TOTAL_SECONDS + 1, kind: 'end', lines: ['Scrivici EXTRA', 'in privato.'] },
];

// Sottotitoli della voce. L'ultima frase ("Scrivici extra in privato") non viene
// ripetuta: la mostra gia' il titolo finale, cosi' non ci sono doppioni.
export type Caption = { from: number; to: number; text: string };
export const CAPTIONS: Caption[] = [
  { from: 0.40, to: 3.75, text: 'Hai un B&B, una casa vacanze o un hotel?' },
  { from: 3.90, to: 5.62, text: 'Dai più valore al soggiorno,' },
  { from: 5.68, to: 8.75, text: 'con una pagina dedicata ai tuoi servizi extra.' },
  { from: 9.55, to: 12.45, text: 'Per Il Rustico abbiamo creato questa pagina:' },
  { from: 12.50, to: 14.10, text: 'un unico link per presentare' },
  { from: 14.12, to: 17.70, text: 'pacchetti romantici, sorprese e servizi aggiuntivi.' },
  { from: 18.40, to: 21.75, text: 'Fai scoprire agli ospiti cosa possono aggiungere al soggiorno' },
  { from: 21.80, to: 24.25, text: 'e rendi più semplice scegliere.' },
  { from: 24.84, to: 27.12, text: 'Vuoi una pagina così per la tua struttura?' },
  { from: 27.16, to: 28.55, text: 'La creiamo noi.' },
];
