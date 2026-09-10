#!/bin/sh
# Espera o lote de imagens terminar e monta o vídeo na sequência, sem intervalo.
#
# Duas condições de parada porque o Tee-Object às vezes segura a última linha
# no buffer: ou o log traz o "=== FIM ===", ou o número de imagens alcança o
# número de deixas. E um teto de 90 min pra nunca ficar preso.
DIR="exports/longo-aneis-terra"
ALVO=$(grep -c . "$DIR/cues.txt")
i=0
while [ $i -lt 270 ]; do
  n=$(ls "$DIR"/img*.png 2>/dev/null | wc -l)
  if grep -q "=== FIM ===" "$DIR/_gen.log" 2>/dev/null; then echo "log fechou o lote"; break; fi
  if [ "$n" -ge "$ALVO" ]; then echo "$n de $ALVO imagens — completo"; break; fi
  i=$((i+1)); sleep 20
done
echo "=== conciliando ($(ls $DIR/img*.png 2>/dev/null | wc -l) imagens para $ALVO deixas) ==="
node concilia-cenas.js longo-aneis-terra || exit 1
echo "=== montando o vídeo ==="
node make-longo.js "$DIR" "D:/Neural Update/estudio/exports/longo-aneis-terra/longo-aneis-terra.mp4" dark-some-amount-of-evil.mp3
