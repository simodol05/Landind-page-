"""Inserisce le due pagine del contratto (compilabili) tra la slide della firma e il QR del bonifico.

Uso: python3 assembla.py slide.pdf contratto.pdf Artide-aggiunte-e-contratto.pdf
"""
import sys

from pypdf import PdfReader, PdfWriter

# il contratto va dopo la slide 9 (firma), prima della slide del QR
DOPO_SLIDE = 9


def main():
    slide, contratto, out = sys.argv[1:4]
    s = PdfReader(slide)
    c = PdfReader(contratto)
    writer = PdfWriter()
    writer.append(s, pages=(0, DOPO_SLIDE))
    writer.append(c, pages=(0, len(c.pages)))
    writer.append(s, pages=(DOPO_SLIDE, len(s.pages)))
    writer.add_metadata({"/Title": "Artide · Le aggiunte al sito e il contratto · SL Innova", "/Author": "SL Innova"})
    with open(out, "wb") as fh:
        writer.write(fh)
    print(out, "·", len(writer.pages), "pagine ·", len(PdfReader(out).get_fields() or {}), "campi")


if __name__ == "__main__":
    main()
