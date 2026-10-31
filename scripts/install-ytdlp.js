// Download only official release assets and verify their published checksum.
const { mkdir, writeFile, chmod, rename } = require('node:fs/promises');
const { createHash } = require('node:crypto');
const path = require('node:path');

const VERSION = '2026.10.26';
async function download(url) {
    const response = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`Download failed (${response.status}): ${url}`);
    return Buffer.from(await response.arrayBuffer());
}
async function install() {
    const asset = process.platform === 'win32' ? 'yt-dlp.exe'
        : process.platform === 'darwin' ? 'yt-dlp_macos'
        : process.arch === 'arm64' ? 'yt-dlp_linux_aarch64' : 'yt-dlp_linux';
    const base = `https://github.com/yt-dlp/yt-dlp/releases/download/${VERSION}`;
    const [binary, sums] = await Promise.all([download(`${base}/${asset}`), download(`${base}/SHA2-256SUMS`)]);
    const expected = sums.toString().split(/\r?\n/).find(line => line.trim().split(/\s+/)[1] === asset)?.split(/\s+/)[0];
    if (!expected || createHash('sha256').update(binary).digest('hex') !== expected) throw new Error('yt-dlp checksum mismatch');
    const directory = path.join(__dirname, '..', '.tools');
    await mkdir(directory, { recursive: true });
    const destination = path.join(directory, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    await writeFile(`${destination}.tmp`, binary);
    await chmod(`${destination}.tmp`, 0o755);
    await rename(`${destination}.tmp`, destination);
    console.log(`Installed yt-dlp ${VERSION}: ${destination}`);
}
if (require.main === module) install().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { VERSION, install };
