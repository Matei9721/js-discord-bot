require('dotenv').config({ quiet: true });
const { spawnSync } = require('node:child_process');
const { FFmpeg } = require('@discord-player/ffmpeg');
const { executable } = require('../youtube/ytdlp');
const { validateConfig } = require('../index');
function check() {
    validateConfig();
    const yt = spawnSync(executable(), ['--version'], { encoding: 'utf8', windowsHide: true });
    if (yt.status !== 0) throw new Error('yt-dlp is missing. Run npm run setup:youtube.');
    require('@snazzah/davey');
    if (process.env.FFMPEG_PATH) FFmpeg.addSource({ name: process.env.FFMPEG_PATH, module: false });
    const ffmpeg = FFmpeg.resolve();
    console.log(`Node ${process.version}; yt-dlp ${yt.stdout.trim()}; DAVE loaded; FFmpeg: ${ffmpeg.command}`);
    console.log('Configuration is present. This check does not log in or play audio.');
}
try { check(); } catch (error) { console.error(error.message); process.exitCode = 1; }
