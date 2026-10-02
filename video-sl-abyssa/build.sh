#!/usr/bin/env bash
# Esporta il video finale: Remotion (muto) + traccia audio della serie SL.
# Prerequisiti: riprese in remotion/public/ (vedi capture/), npm install in remotion/.
# uso: ./build.sh          -> SL_INNOVA_Abyssa_26s_4x5.mp4  1080x1350, 30 fps, 26 s
#      ./build.sh prova    -> anteprima veloce a meta' risoluzione in out/prova.mp4
set -euo pipefail
cd "$(dirname "$0")"
BROWSER="${REMOTION_BROWSER:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"
OUT="SL_INNOVA_Abyssa_26s_4x5.mp4"
mkdir -p out

if [ "${1:-}" = "prova" ]; then
  ( cd remotion && npx remotion render src/index.ts SLAbyssa ../out/prova.mp4 \
      --codec=h264 --crf=26 --scale=0.5 --muted --concurrency=4 --browser-executable="$BROWSER" --log=error )
  exit 0
fi

# 1) video muto, 30 fps
( cd remotion && npx remotion render src/index.ts SLAbyssa ../out/video_muto.mp4 \
    --codec=h264 --crf=12 --muted --concurrency=4 --browser-executable="$BROWSER" --log=error )

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/video_muto.mp4)

# 2) audio: la stessa traccia del video SL di riferimento, tagliata alla durata con chiusura in dissolvenza
ffmpeg -v error -y -i assets/audio/traccia-riferimento.m4a -filter_complex "\
[0:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:${DUR},asetpts=PTS-STARTPTS,\
afade=t=out:st=$(echo "$DUR - 1.8" | bc):d=1.8,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[a]" -c:a pcm_s16le out/audio.wav

# 3) file finale H.264 High + AAC, faststart (compatibile Instagram e TikTok)
ffmpeg -v error -y -i out/video_muto.mp4 -i out/audio.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -maxrate 12M -bufsize 24M -profile:v high -level 4.1 -pix_fmt yuv420p \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -r 30 -g 60 \
  -c:a aac -b:a 192k -ar 48000 -t "$DUR" -movflags +faststart \
  "$OUT"
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,nb_frames,sample_rate:format=duration,bit_rate -of compact "$OUT"
