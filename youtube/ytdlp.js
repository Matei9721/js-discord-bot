const childProcess = require('node:child_process');
const { existsSync, mkdtempSync, copyFileSync, chmodSync, unlinkSync, rmdirSync } = require('node:fs');
const path = require('node:path');
const { tmpdir } = require('node:os');
const { PassThrough } = require('node:stream');
const { createInterface } = require('node:readline');
const stopping = new WeakMap();
const activeProcesses = new Set();
const mediaCache = new Map();
const preparing = new Map();
const infoProfiles = new WeakMap();
const streamInfo = new WeakMap();
function preferredProfile() {
    // The ad-playback-context option is documented only for non-premium use.
    // Keep authenticated cookie sessions on yt-dlp's normal client selection.
    return process.env.YOUTUBE_FAST_START === 'true' && !process.env.YOUTUBE_COOKIES_FILE ? 'fast' : 'default';
}
function mediaKey(url) {
    try {
        const parsed = new URL(url);
        return parsed.searchParams.get('v') || parsed.pathname.split('/').filter(Boolean).at(-1);
    } catch { return null; }
}
function cachedInfo(url) {
    const key = mediaKey(url);
    const entry = mediaCache.get(key);
    if (!entry) return null;
    if (entry.expires <= Date.now()) { mediaCache.delete(key); return null; }
    return entry.info;
}
function remember(info, profile) {
    if (!info?.id || !info.formats?.length || info.entries) return;
    mediaCache.delete(info.id);
    infoProfiles.set(info, profile);
    mediaCache.set(info.id, { info, expires: Date.now() + (info.is_live ? 15000 : 10 * 60 * 1000) });
    while (mediaCache.size > 24) mediaCache.delete(mediaCache.keys().next().value);
}
function prepare(url) {
    const cached = cachedInfo(url);
    if (cached) return Promise.resolve(cached);
    const key = mediaKey(url);
    if (preparing.has(key)) return preparing.get(key);
    const task = metadata(url).finally(() => preparing.delete(key));
    preparing.set(key, task);
    return task;
}
function stop(child) {
    if (stopping.has(child)) return stopping.get(child);
    const result = new Promise(resolve => {
        if (process.platform === 'win32' && child.pid && child.exitCode === null) {
            // The official Windows binary has a bootloader child process.
            childProcess.execFile('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true }, () => resolve());
        } else {
            // yt-dlp uses FFmpeg for live/HLS downloads; stop the whole group.
            if (process.platform !== 'win32' && child.pid && child.exitCode === null) {
                try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill(); }
            } else child.kill();
            resolve();
        }
    });
    stopping.set(child, result);
    return result;
}

// Node's pipe() does not destroy its source when FFmpeg closes. Tie their
// lifetimes together so skip, seek and disconnect cannot leave downloads alive.
class AudioStream extends PassThrough {
    pipe(destination, options) {
        destination.once('close', () => this.destroy());
        return super.pipe(destination, options);
    }
}

function executable() {
    const local = path.join(__dirname, '..', '.tools', process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    return process.env.YTDLP_PATH || (existsSync(local) ? local : 'yt-dlp');
}
function commonArgs(cookieFile, profile = preferredProfile()) {
    const args = ['--ignore-config', '--no-warnings', '--no-progress', '--cache-dir', path.join(tmpdir(), 'discord-ytdlp-cache'),
        '--js-runtimes', `node:${process.execPath}`, '--socket-timeout', '20', '--retries', '2'];
    if (cookieFile) args.push('--cookies', cookieFile);
    if (profile === 'fast') args.push('--extractor-args', 'youtube:player_client=mweb;use_ad_playback_context=true');
    return args;
}
function start(args, input, profile) {
    const env = { ...process.env };
    delete env.BOT_TOKEN;
    delete env.YOUTUBE_COOKIE;
    delete env.YOUTUBE_COOKIES_FILE;
    let directory, cookieFile;
    const cleanup = () => {
        if (cookieFile) { try { unlinkSync(cookieFile); } catch {} }
        if (directory) { try { rmdirSync(directory); } catch {} }
    };
    try {
        if (process.env.YOUTUBE_COOKIES_FILE) {
            directory = mkdtempSync(path.join(tmpdir(), 'discord-ytdlp-'));
            cookieFile = path.join(directory, 'cookies.txt');
            copyFileSync(process.env.YOUTUBE_COOKIES_FILE, cookieFile);
            chmodSync(cookieFile, 0o600);
        }
        const child = childProcess.spawn(executable(), [...commonArgs(cookieFile, profile), ...args], {
            windowsHide: true, shell: false, env, detached: process.platform !== 'win32',
            stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe']
        });
        if (input) {
            child.stdin.on('error', () => {});
            child.stdin.end(input);
        }
        activeProcesses.add(child);
        child.once('close', () => { activeProcesses.delete(child); cleanup(); });
        child.once('error', () => { activeProcesses.delete(child); cleanup(); });
        return child;
    } catch { cleanup(); throw new Error('Unable to start yt-dlp. Check its installation and YOUTUBE_COOKIES_FILE path.'); }
}
function processError(stderr) {
    if (/sign in|bot|cookies|403/i.test(stderr)) return new Error('YouTube refused this request. Try another public video; if needed, configure a fresh YOUTUBE_COOKIES_FILE for this host.');
    return new Error('YouTube could not load this video. It may be unavailable, private, or region restricted.');
}
function metadataAttempt(query, { limit = 100, timeout = 90000, profile } = {}) {
    const cached = cachedInfo(query);
    if (cached && !/[?&]list=/.test(query)) return Promise.resolve(cached);
    return new Promise((resolve, reject) => {
        const child = start(['--dump-single-json', '--flat-playlist', '-f', 'bestaudio/best', '--ignore-errors', '--playlist-end', String(limit), '--', query], undefined, profile);
        const chunks = [];
        let size = 0;
        let stderr = '';
        const timer = setTimeout(() => { stop(child); reject(Object.assign(new Error('YouTube lookup timed out. Please try again.'), { code: 'YTDLP_TIMEOUT' })); }, timeout);
        child.stdout.on('data', chunk => {
            size += chunk.length;
            if (size > 16 * 1024 * 1024) { stop(child); reject(new Error('YouTube returned too much metadata.')); }
            else chunks.push(chunk);
        });
        child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
        child.once('error', () => { clearTimeout(timer); reject(Object.assign(new Error('yt-dlp is missing or cannot start. Run npm run setup:youtube.'), { code: 'YTDLP_SPAWN' })); });
        child.once('close', code => {
            clearTimeout(timer);
            try {
                const data = JSON.parse(Buffer.concat(chunks).toString());
                if (data) { remember(data, profile); return resolve(data); }
            } catch { /* Avoid leaking cookies or signed URLs in errors. */ }
            reject(code === 0 ? new Error('No YouTube results found.') : processError(stderr));
        });
    });
}
function metadata(query, options = {}) {
    const profile = options.profile || preferredProfile();
    return metadataAttempt(query, { ...options, profile }).catch(error => {
        if (profile !== 'fast' || error.code === 'YTDLP_TIMEOUT' || error.code === 'YTDLP_SPAWN') throw error;
        return metadataAttempt(query, { ...options, profile: 'default' });
    });
}
async function* playlistEntries(query, { limit = 500, timeout = 90000, signal } = {}) {
    if (signal?.aborted) return;
    const child = start(['--dump-json', '--flat-playlist', '--lazy-playlist', '--yes-playlist', '--ignore-errors', '--playlist-end', String(limit + 1), '--', query]);
    let stderr = '', failure;
    const completion = new Promise(resolve => {
        child.once('close', code => resolve({ code }));
        child.once('error', () => resolve({ error: new Error('Unable to start yt-dlp. Run npm run setup:youtube.') }));
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
    const cancel = () => { stop(child); lines.close(); child.stdout.destroy(); };
    const timer = setTimeout(() => { failure = new Error('Playlist lookup timed out.'); cancel(); }, timeout);
    signal?.addEventListener('abort', cancel, { once: true });
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    try {
        for await (const line of lines) {
            if (signal?.aborted) break;
            if (!line.trim()) continue;
            if (line.length > 1024 * 1024) throw new Error('YouTube returned too much playlist metadata.');
            let entry;
            try { entry = JSON.parse(line); } catch { throw new Error('YouTube returned invalid playlist metadata.'); }
            yield entry;
        }
        if (signal?.aborted) return;
        const result = await completion;
        if (failure) throw failure;
        if (result.error) throw result.error;
        if (result.code !== 0) throw processError(stderr);
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', cancel);
        lines.close();
        if (child.exitCode === null || child.exitCode === undefined) stop(child);
    }
}
function audioAttempt(url, processes, { timeout = 90000 } = {}, info = cachedInfo(url)) {
    return new Promise((resolve, reject) => {
        // Reuse the fresh format lookup instead of extracting the same video twice.
        // Expired entries fall back to a fresh lookup; no signed URL is persisted.
        const args = ['--no-playlist', '--no-live-from-start', '-f', 'bestaudio/best', '-o', '-'];
        const child = info ? start([...args, '--load-info-json', '-'], JSON.stringify(info), infoProfiles.get(info)) : start([...args, '--', url]);
        processes.add(child);
        const output = new AudioStream({ highWaterMark: 1024 * 1024 });
        if (info) streamInfo.set(output, info);
        let stderr = '';
        let ready = false;
        const fail = error => { if (ready) output.destroy(error); else { reject(error); output.destroy(); } };
        const timer = setTimeout(() => { fail(new Error('YouTube audio startup timed out.')); stop(child); }, timeout);
        child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
        child.once('error', () => { clearTimeout(timer); fail(new Error('Unable to start yt-dlp. Run npm run setup:youtube.')); });
        child.stdout.once('data', () => { ready = true; clearTimeout(timer); resolve(output); });
        output.on('error', () => {});
        output.once('close', () => { clearTimeout(timer); child.stdout.unpipe(output); child.stdout.destroy(); stop(child); });
        child.once('close', code => {
            clearTimeout(timer);
            processes.delete(child);
            if (output.destroyed) return;
            if (code !== 0 || !ready) {
                const error = processError(stderr);
                error.refreshMetadata = !ready && code !== null && !stopping.has(child);
                fail(error);
            }
            else output.end();
        });
        child.stdout.pipe(output, { end: false });
    });
}
function audio(url, processes = new Set(), options) {
    const info = cachedInfo(url);
    return audioAttempt(url, processes, options, info).catch(async error => {
        if (!info || !error.refreshMetadata) throw error;
        mediaCache.delete(mediaKey(url));
        const fresh = await metadata(url, { profile: 'default' });
        return audioAttempt(url, processes, options, fresh);
    });
}
async function stopAll() { await Promise.all([...activeProcesses].map(stop)); }
module.exports = { executable, metadata, playlistEntries, audio, stop, stopAll, prepare, audioInfo: stream => streamInfo.get(stream) };
