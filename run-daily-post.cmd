@echo off
REM Agendador de Tarefas do Windows aponta para este arquivo.
REM Gera 1 Short (formato rotacionado) e publica no YouTube.
cd /d "%~dp0"
node daily-post.js %*
