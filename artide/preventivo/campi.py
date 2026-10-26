"""Appoggia i campi compilabili (testo e caselle) su base.pdf, nelle posizioni salvate da render.js.

Uso: node render.js aggiunte.html && python3 campi.py Artide-aggiunte.pdf
"""
import json
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import (ArrayObject, BooleanObject, DecodedStreamObject, DictionaryObject,
                           FloatObject, NameObject, NumberObject, TextStringObject)

DIR = Path(__file__).parent
FONT_SIZE = 9


def stream(writer, content, w, h, resources=None):
    s = DecodedStreamObject()
    s.set_data(content.encode("latin-1"))
    s.update({
        NameObject("/Type"): NameObject("/XObject"),
        NameObject("/Subtype"): NameObject("/Form"),
        NameObject("/BBox"): ArrayObject([FloatObject(0), FloatObject(0), FloatObject(w), FloatObject(h)]),
    })
    if resources is not None:
        s[NameObject("/Resources")] = resources
    return writer._add_object(s)


def text_appearance(writer, value, w, h, font_res, color):
    if not value:
        return stream(writer, "/Tx BMC EMC", w, h, font_res)
    y = (h - FONT_SIZE * 0.72) / 2
    safe = value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
    body = f"/Tx BMC q BT /Helv {FONT_SIZE} Tf {color} 2 {y:.2f} Td ({safe}) Tj ET Q EMC"
    return stream(writer, body, w, h, font_res)


def main():
    reader = PdfReader(DIR / "base.pdf")
    writer = PdfWriter()
    writer.append(reader)
    campi = json.loads((DIR / "campi.json").read_text())

    helv = writer._add_object(DictionaryObject({
        NameObject("/Type"): NameObject("/Font"),
        NameObject("/Subtype"): NameObject("/Type1"),
        NameObject("/BaseFont"): NameObject("/Helvetica"),
        NameObject("/Encoding"): NameObject("/WinAnsiEncoding"),
    }))
    zadb = writer._add_object(DictionaryObject({
        NameObject("/Type"): NameObject("/Font"),
        NameObject("/Subtype"): NameObject("/Type1"),
        NameObject("/BaseFont"): NameObject("/ZapfDingbats"),
    }))
    font_res = DictionaryObject({NameObject("/Font"): DictionaryObject({NameObject("/Helv"): helv})})

    # stesso nome su piu' pagine (incarico, data) = un solo campo con piu' riquadri
    parents, fields = {}, ArrayObject()
    for c in campi:
        page = writer.pages[c["page"]]
        ph = float(page.mediabox.height)
        x1, y2 = c["x"], ph - c["y"]
        w, h = c["w"], c["h"]
        rect = ArrayObject([FloatObject(x1), FloatObject(y2 - h), FloatObject(x1 + w), FloatObject(y2)])

        widget = DictionaryObject({
            NameObject("/Type"): NameObject("/Annot"),
            NameObject("/Subtype"): NameObject("/Widget"),
            NameObject("/Rect"): rect,
            NameObject("/F"): NumberObject(4),
            NameObject("/P"): page.indirect_reference,
        })

        if c["kind"] == "text":
            # sul fondo scuro (data-ink="light") si scrive in chiaro
            color = "1 1 1 rg" if c.get("light") else "0.11 0.11 0.12 rg"
            props = {
                NameObject("/FT"): NameObject("/Tx"),
                NameObject("/DA"): TextStringObject(f"/Helv {FONT_SIZE} Tf {color}"),
                NameObject("/Ff"): NumberObject(4096 if c["multi"] else 0),
            }
            if c["value"]:
                props[NameObject("/V")] = TextStringObject(c["value"])
            widget[NameObject("/AP")] = DictionaryObject({
                NameObject("/N"): text_appearance(writer, "" if c["multi"] else c["value"], w, h, font_res, color)})
        else:
            # segno di spunta disegnato come tratto, cosi' non dipende dai caratteri del lettore PDF
            ink = "0.89 0.79 0.58" if c.get("light") else "0.11 0.11 0.12"
            on = stream(writer, f"q {ink} RG 1.3 w 1 J 1 j {w * 0.2:.2f} {h * 0.52:.2f} m "
                                f"{w * 0.42:.2f} {h * 0.26:.2f} l {w * 0.82:.2f} {h * 0.8:.2f} l S Q", w, h)
            off = stream(writer, "", w, h)
            props = {
                NameObject("/FT"): NameObject("/Btn"),
                NameObject("/DA"): TextStringObject("/ZaDb 0 Tf 0 g"),
                NameObject("/V"): NameObject("/Off"),
            }
            widget[NameObject("/MK")] = DictionaryObject({NameObject("/CA"): TextStringObject("4")})
            widget[NameObject("/AS")] = NameObject("/Off")
            widget[NameObject("/AP")] = DictionaryObject({
                NameObject("/N"): DictionaryObject({NameObject("/Yes"): on, NameObject("/Off"): off}),
                NameObject("/D"): DictionaryObject({NameObject("/Yes"): on, NameObject("/Off"): off}),
            })

        name = c["name"]
        if name in parents:
            parent = parents[name]
            widget[NameObject("/Parent")] = parent.indirect_reference
            ref = writer._add_object(widget)
            parent[NameObject("/Kids")].append(ref)
        elif sum(1 for o in campi if o["name"] == name) > 1:
            parent = DictionaryObject({NameObject("/T"): TextStringObject(name), NameObject("/Kids"): ArrayObject()})
            parent.update(props)
            writer._add_object(parent)
            parents[name] = parent
            widget[NameObject("/Parent")] = parent.indirect_reference
            ref = writer._add_object(widget)
            parent[NameObject("/Kids")].append(ref)
            fields.append(parent.indirect_reference)
        else:
            widget[NameObject("/T")] = TextStringObject(name)
            widget.update(props)
            ref = writer._add_object(widget)
            fields.append(ref)

        if "/Annots" not in page:
            page[NameObject("/Annots")] = ArrayObject()
        page["/Annots"].append(ref)

    writer._root_object[NameObject("/AcroForm")] = DictionaryObject({
        NameObject("/Fields"): fields,
        NameObject("/NeedAppearances"): BooleanObject(True),
        NameObject("/DA"): TextStringObject(f"/Helv {FONT_SIZE} Tf 0 g"),
        NameObject("/DR"): DictionaryObject({NameObject("/Font"): DictionaryObject({
            NameObject("/Helv"): helv, NameObject("/ZaDb"): zadb})}),
    })
    writer.add_metadata({"/Title": "Artide · Le aggiunte al sito · SL Innova", "/Author": "SL Innova"})

    out = DIR / (sys.argv[1] if len(sys.argv) > 1 else "campi.pdf")
    with open(out, "wb") as fh:
        writer.write(fh)
    print(out.name, "·", len(campi), "riquadri,", len(fields), "campi")


if __name__ == "__main__":
    main()
