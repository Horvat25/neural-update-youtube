#!/bin/sh
cd "D:/Neural Update/estudio"
echo "===== LONGO 1: anéis da Terra -> 13/08 20h BRT ====="
node post-long.js \
  "exports/longo-aneis-terra/longo-aneis-terra.mp4" \
  "exports/longo-aneis-terra/meta.json" \
  "exports/longo-aneis-terra/_thumb/capa.jpg" \
  "2026-08-13T23:00:00.000Z"
echo "===== LONGO 2: sobrevivência -> 16/08 20h BRT ====="
node post-long.js \
  "exports/longo-sobrevivencia/longo-sobrevivencia.mp4" \
  "exports/longo-sobrevivencia/meta.json" \
  "exports/longo-sobrevivencia/_thumb/capa.jpg" \
  "2026-08-16T23:00:00.000Z"
echo "===== FIM DOS UPLOADS ====="
