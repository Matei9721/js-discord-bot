const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter, once } = require('node:events');
const { PassThrough } = require('node:stream');
const childProcess = require('node:child_process');
const { audio, metadata } = require('../youtube/ytdlp');

function fakeProcess() {
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.kill = mock.fn(() => { queueMicrotask(() => child.emit('close', null)); return true; });
    return child;
}
test('closing FFmpeg also closes its source and kills the downloader', async () => {
    const child = fakeProcess();
    const spy = mock.method(childProcess, 'spawn', () => child);
    const processes = new Set();
    try {
        const pending = audio('https://www.youtube.com/watch?v=dQw4w9WgXcQ', processes);
        child.stdout.write(Buffer.from('audio bytes'));
        const stream = await pending;
        const ffmpeg = new PassThrough();
        stream.pipe(ffmpeg);
        const closed = once(stream, 'close');
        ffmpeg.destroy(); await closed;
        await new Promise(resolve => setImmediate(resolve));
        assert(child.kill.mock.callCount() >= 1);
        assert.equal(processes.size, 0);
        assert.equal(spy.mock.calls[0].arguments[2].shell, false);
        assert.equal(spy.mock.calls[0].arguments[2].env.BOT_TOKEN, undefined);
    } finally { spy.mock.restore(); }
});
test('failed audio startup rejects without leaving a subprocess', async () => {
    const child = fakeProcess();
    const spy = mock.method(childProcess, 'spawn', () => child);
    try {
        const pending = audio('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
        child.stderr.write('HTTP 403 Sign in to confirm you are not a bot');
        child.emit('close', 1);
        await assert.rejects(pending, /YouTube refused/);
    } finally { spy.mock.restore(); }
});
test('hung extraction times out and kills the process', async () => {
    const child = fakeProcess();
    const spy = mock.method(childProcess, 'spawn', () => child);
    try {
        await assert.rejects(metadata('ytsearch1:test', { timeout: 10 }), /timed out/);
        assert.equal(child.kill.mock.callCount(), 1);
    } finally { spy.mock.restore(); }
});
