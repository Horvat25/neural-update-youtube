@echo off
set YT_TOKENS_FILE=.yt-en-tokens.json
set YT_REDIRECT_URI=http://localhost:3001/oauth/callback
node youtube-login.js
