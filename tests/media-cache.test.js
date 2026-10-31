const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const childProcess = require('node:child_process');
const ytdlp = require('../youtube/ytdlp');
function child() {
    const result = new EventEmitter();
    result.stdin = new PassThrough(); result.stdout = new PassThrough(); result.stderr = new PassThrough();
    result.kill = () => { queueMicrotask(() => result.emit('close', null)); return true; };
    return result;
}
test('a resolved video is downloaded from its info JSON without another YouTube extraction', async () => {
    const processes = [];
    const spawn = mock.method(childProcess, 'spawn', () => { const process = child(); processes.push(process); return process; });
    const url = 'https://www.youtube.com/watch?v=aaaaaaaaaaa';
    try {
        const metadata = ytdlp.metadata(url);
        processes[0].stdout.write(JSON.stringify({ id: 'aaaaaaaaaaa', title: 'Prepared', formats: [{ format_id: '251' }], url: 'https://media.invalid/audio' }));
        processes[0].emit('close', 0);
        await metadata;
        await ytdlp.prepare(url);
        assert.equal(spawn.mock.callCount(), 1, 'Prepare reuses the format lookup');
        const pending = ytdlp.audio(url);
        const args = spawn.mock.calls[1].arguments[1];
        assert(args.includes('--load-info-json'));
        assert(!args.includes(url));
        assert(args.includes('--no-live-from-start'));
        processes[1].stdout.write('audio');
        const stream = await pending;
        stream.destroy();
    } finally { spawn.mock.restore(); }
});
test('a rejected cached URL is refreshed once before retrying playback', async () => {
    const processes = [];
    const spawn = mock.method(childProcess, 'spawn', () => { const process = child(); processes.push(process); return process; });
    const url = 'https://www.youtube.com/watch?v=bbbbbbbbbbb';
    const info = { id: 'bbbbbbbbbbb', title: 'Refresh', formats: [{ format_id: '251' }], url: 'https://media.invalid/audio' };
    try {
        const initial = ytdlp.metadata(url);
        processes[0].stdout.write(JSON.stringify(info)); processes[0].emit('close', 0);
        await initial;
        const pending = ytdlp.audio(url);
        processes[1].stderr.write('HTTP Error 403'); processes[1].emit('close', 1);
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(processes.length, 3, 'A new metadata lookup is requested');
        assert(!spawn.mock.calls[2].arguments[1].includes('--extractor-args'), 'Rejected fast streams fall back to normal clients');
        processes[2].stdout.write(JSON.stringify(info)); processes[2].emit('close', 0);
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(processes.length, 4);
        processes[3].stdout.write('audio');
        const stream = await pending;
        stream.destroy();
    } finally { spawn.mock.restore(); }
});
