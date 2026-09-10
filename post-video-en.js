'use strict';
/**
 * Upload helper for the English YouTube channel.
 * Uses .yt-en-tokens.json so the BR channel token remains untouched.
 *
 * Usage:
 *   node post-video-en.js <video.mp4> <meta.json>
 */
process.env.YT_TOKENS_FILE = process.env.YT_TOKENS_FILE || '.yt-en-tokens.json';
require('./post-video');
