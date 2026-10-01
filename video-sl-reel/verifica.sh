#!/usr/bin/env bash
# Controlli automatici sul file esportato: formato, audio, prezzi/HOLDING via OCR, movimento petali.
set -uo pipefail
cd "$(dirname "$0")"
F=SL_Landing_Rustico_Reel.mp4
W=out/verifica; rm -rf "$W"; mkdir -p "$W"
echo "== formato"; ffprobe -v error -show_entries stream=codec_name,profile,width,height,r_frame_rate,pix_fmt,sample_rate,channels:format=duration,bit_rate -of default=nw=1 "$F"
echo "== loudness"; ffmpeg -i "$F" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | head -3
echo "== fotogrammi ogni 0,25 s + OCR"
ffmpeg -v error -i "$F" -vf fps=4 "$W/f_%03d.png"
hits=0
for p in "$W"/f_*.png; do
  txt=$(tesseract "$p" - -l ita+eng --psm 11 2>/dev/null | tr '\n' ' ')
  echo "$(basename "$p") $txt" >> "$W/ocr.txt"
  if echo "$txt" | grep -qiE '€|eur\b|[0-9]+,[0-9]{2}|holding|slholding|sconto|totale'; then echo "  !! $(basename "$p"): $txt" | cut -c1-200; hits=$((hits+1)); fi
done
echo "segnalazioni OCR: $hits"
echo "== movimento nei primi 9 s (differenza media fra fotogrammi consecutivi)"
ffmpeg -v error -i "$F" -t 9 -vf "tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$W/diff.txt" -f null -
awk -F= '/YAVG/{s+=$2;n++; if($2<0.05)z++} END{printf "frame con movimento: %d/%d, media %.3f\n", n-z, n, s/n}' "$W/diff.txt"
