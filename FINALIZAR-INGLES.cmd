@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo ============================================================
echo   FINALIZAR CANAL INGLES — sobe os Shorts EN que faltam
echo   (rode depois das ~4h da manha, quando a quota do YouTube
echo    do dia resetar). Ele so SOBE os videos ja prontos.
echo ============================================================
echo.
node sync-all-to-en.js
echo.
echo --- agora os 5 mais vistos (22h) ---
node sync-top5-to-en.js
echo.
echo ============================================================
echo   Se aparecer "aguardando upload: 0" nos dois, FECHOU! EN = BR.
echo   Se ainda der "quota", espere mais um pouco e rode de novo.
echo ============================================================
echo.
pause
