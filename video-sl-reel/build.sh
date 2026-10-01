#!/usr/bin/env bash
# Esporta il reel finale: video (Remotion, muto) + voce + musica -> SL_Landing_Rustico_Reel.mp4
# Prerequisiti: riprese in remotion/public/footage (vedi capture/), npm install in remotion/.
set -euo pipefail
cd "$(dirname "$0")"
BROWSER="${REMOTION_BROWSER:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}"
mkdir -p out

# 1) video muto 1080x1920, 30 fps
( cd remotion && npx remotion render src/index.ts SLReel ../out/video_muto.mp4 \
    --codec=h264 --crf=14 --muted --concurrency=4 --browser-executable="$BROWSER" --log=error )

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 out/video_muto.mp4)

# 2) mix: voce dal secondo 0.40, musica bassa con ducking sotto la voce, chiusura in dissolvenza
ffmpeg -v error -y \
  -i assets/audio/voce.mp3 -i assets/audio/musica.mp3 \
  -filter_complex "\
[0:a]aresample=48000,aformat=channel_layouts=stereo,adelay=400:all=1,apad,atrim=0:${DUR},highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=120:makeup=2dB,asplit=2[v][vkey];\
[1:a]aresample=48000,aformat=channel_layouts=stereo,atrim=start=1.04,asetpts=PTS-STARTPTS,apad,atrim=0:${DUR},volume=-10dB,afade=t=in:st=0:d=0.8,afade=t=out:st=$(echo "$DUR - 1.4" | bc):d=1.4[m];\
[m][vkey]sidechaincompress=threshold=0.03:ratio=4:attack=30:release=450[md];\
[v][md]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]" \
  -map "[a]" -c:a pcm_s16le out/mix.wav

# 3) file finale H.264 + AAC
ffmpeg -v error -y -i out/video_muto.mp4 -i out/mix.wav \
  -map 0:v -map 1:a -c:v libx264 -preset slow -crf 17 -profile:v high -pix_fmt yuv420p \
  -color_range tv -colorspace bt709 -color_primaries bt709 -color_trc bt709 -r 30 \
  -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart \
  SL_Landing_Rustico_Reel.mp4
ffprobe -v error -show_entries stream=codec_name,width,height,r_frame_rate,sample_rate:format=duration -of compact SL_Landing_Rustico_Reel.mp4
