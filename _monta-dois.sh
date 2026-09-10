#!/bin/sh
cd "D:/Neural Update/estudio"
echo "########## LONGO 1 ##########"
node make-longo.js "exports/longo-aneis-terra" "D:/Neural Update/estudio/exports/longo-aneis-terra/longo-aneis-terra.mp4" dark-some-amount-of-evil.mp3 2>&1 | grep -av "^frame=" | grep -av "clipe .* ok"
echo "########## LONGO 2 ##########"
node make-longo.js "exports/longo-sobrevivencia" "D:/Neural Update/estudio/exports/longo-sobrevivencia/longo-sobrevivencia.mp4" dark-some-amount-of-evil.mp3 2>&1 | grep -av "^frame=" | grep -av "clipe .* ok"
echo "########## FIM ##########"
