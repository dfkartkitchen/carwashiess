#!/bin/sh
# Car Washiess – snímky scroll animace z videa (potřebuje ffmpeg s libaom-av1)
# Použití: sh tools/hero-frames.sh vstup.mp4 video/hero-N
# Pak v administraci (Úvod se scroll animací) nastavte „Snímky animace“ na /video/hero-N/.
# Nová složka (ne přepsání staré), protože prohlížeče si snímky dlouhodobě ukládají.
set -e
IN="$1"; OUT="$2"
[ -f "$IN" ] && [ -n "$OUT" ] || { echo "Použití: sh tools/hero-frames.sh vstup.mp4 video/hero-N"; exit 1; }
TMP=$(mktemp -d)
mkdir -p "$OUT/desktop" "$OUT/mobile" "$OUT/fallback"
# 181 snímků (každý druhý snímek videa); počet musí sedět s „Počet snímků“ v administraci
ffmpeg -v error -i "$IN" -vf "select='not(mod(n\,2))',scale=1920:-2" -fps_mode vfr -frames:v 181 -start_number 1 "$TMP/f_%03d.png"
for f in "$TMP"/f_*.png; do
  n=$(basename "$f" .png)
  # počítač: celý obraz 1920 px; mobil: výřez na střed 1480×1080, 1080 px
  ffmpeg -v error -y -i "$f" -c:v libaom-av1 -still-picture 1 -crf 33 -cpu-used 5 -pix_fmt yuv420p "$OUT/desktop/$n.avif"
  ffmpeg -v error -y -i "$f" -vf "crop=1480:1080:220:0,scale=1080:-2" -c:v libaom-av1 -still-picture 1 -crf 33 -cpu-used 5 -pix_fmt yuv420p "$OUT/mobile/$n.avif"
done
# záložní klíčové snímky pro prohlížeče bez AVIF
for k in 001 040 060 090 130 181; do
  ffmpeg -v error -y -i "$TMP/f_$k.png" -vf scale=1280:-2 -quality 80 "$OUT/fallback/f_$k.webp"
done
# mapa pohybu: rychlé pasáže videa dostanou víc délky posunu (načítá ji šablona, motion.json)
ffmpeg -v error -i "$TMP/f_%03d.png" -vf "scale=320:-2,format=gray,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=$TMP/yavg.txt" -f null -
awk '/YAVG=/ { sub(/.*YAVG=/, ""); d[++n] = $0 + 0 }
END {
  for (i = 1; i <= n; i++) { a = 0; c = 0; for (j = i - 2; j <= i + 2; j++) if (j >= 1 && j <= n) { a += d[j]; c++ } s[i] = a / c; S += s[i] }
  u = 0; printf "{\"u\":[0"
  for (i = 1; i <= n; i++) { u += 0.5 / n + 0.5 * s[i] / S; printf ",%.4f", (i == n ? 1 : u) }
  print "]}"
}' "$TMP/yavg.txt" > "$OUT/motion.json"
rm -rf "$TMP"
echo "Hotovo: $OUT ($(ls "$OUT/desktop" | wc -l) snímků)"
