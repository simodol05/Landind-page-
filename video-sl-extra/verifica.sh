#!/usr/bin/env bash
# Controlli automatici sul file esportato: formato, loudness, OCR anti-prezzi / "HOLDING" / "KnowledgeDesk".
set -uo pipefail
cd "$(dirname "$0")"
F="${1:-SL_Extra_Rustico_26s_4x5.mp4}"
W=out/verifica; rm -rf "$W"; mkdir -p "$W"
echo "== formato"; ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate,channels:format=duration,bit_rate -of default=nw=1 "$F"
echo "== loudness"; ffmpeg -i "$F" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | head -3
echo "== fotogrammi ogni 0,25 s + OCR"
ffmpeg -v error -i "$F" -vf "fps=4,scale=2160:-1" "$W/f_%03d.png"
hits=0
for p in "$W"/f_*.png; do
  txt=$(tesseract "$p" - -l ita+eng --psm 11 2>/dev/null | tr '\n' ' ')
  echo "$(basename "$p") $txt" >> "$W/ocr.txt"
  if echo "$txt" | grep -qiE '€|eur\b|[0-9]+,[0-9]{2}|holding|knowledge|sconto|totale|pagat|prenotazione confermata'; then
    echo "  !! $(basename "$p"): $txt" | cut -c1-220; hits=$((hits+1)); fi
done
echo "segnalazioni OCR: $hits"
