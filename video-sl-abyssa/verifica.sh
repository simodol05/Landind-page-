#!/usr/bin/env bash
# Controlli sul file esportato: formato, durata, loudness e un provino (un fotogramma ogni 0,5 s)
# per controllare a occhio che nessuna scritta sia tagliata o sovrapposta.
set -uo pipefail
cd "$(dirname "$0")"
F="${1:-SL_INNOVA_Abyssa_26s_4x5.mp4}"
W=out/verifica; rm -rf "$W"; mkdir -p "$W"
echo "== formato"; ffprobe -v error -count_frames -show_entries stream=codec_name,profile,width,height,r_frame_rate,nb_read_frames,pix_fmt,sample_rate,channels:format=duration,bit_rate -of default=nw=1 "$F"
echo "== loudness"; ffmpeg -i "$F" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" | head -3
echo "== provino"
ffmpeg -v error -i "$F" -vf "fps=2,scale=270:-2,drawtext=text='%{pts\:hms}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.6,tile=8x7" -frames:v 1 "$W/provino.jpg"
echo "provino: $W/provino.jpg"
