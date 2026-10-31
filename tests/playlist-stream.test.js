const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const childProcess = require('node:child_process');
const { playlistEntries } = require('../youtube/ytdlp');
test('playlist subprocess yields each JSON entry before the process finishes', async () => {
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.exitCode = null;
    child.kill = () => { child.exitCode = 0; child.stdout.end(); queueMicrotask(() => child.emit('close', 0)); return true; };
    const spawn = mock.method(childProcess, 'spawn', () => child);
    try {
        const iterator = playlistEntries('https://www.youtube.com/playlist?list=PL123');
        const first = iterator.next();
        child.stdout.write('{"id":"aaaaaaaaaaa","title":"First"}\n');
        assert.equal((await first).value.title, 'First');
        assert.equal(child.exitCode, null, 'The first entry is usable while extraction is running');
        const next = iterator.next();
        child.stdout.write('{"id":"bbbbbbbbbbb","title":"Second"}\n');
        assert.equal((await next).value.title, 'Second');
        child.exitCode = 0; child.stdout.end(); child.emit('close', 0);
        assert.equal((await iterator.next()).done, true);
        assert(spawn.mock.calls[0].arguments[1].includes('--lazy-playlist'));
        assert(spawn.mock.calls[0].arguments[1].includes('--yes-playlist'));
    } finally { spawn.mock.restore(); }
});
test('cancelling a Mix import releases a waiting line reader immediately', async () => {
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.exitCode = null;
    child.kill = mock.fn(() => { child.exitCode = 0; queueMicrotask(() => child.emit('close', 0)); return true; });
    const spawn = mock.method(childProcess, 'spawn', () => child);
    const controller = new AbortController();
    try {
        const iterator = playlistEntries('https://www.youtube.com/watch?v=GMuLmqvONho&list=RDGMuLmqvONho', { signal: controller.signal });
        const first = iterator.next();
        child.stdout.write('{"id":"GMuLmqvONho","title":"Seed"}\n');
        await first;
        const waiting = iterator.next();
        controller.abort();
        assert.equal((await waiting).done, true);
        assert.equal(child.kill.mock.callCount(), 1);
    } finally { spawn.mock.restore(); }
});
