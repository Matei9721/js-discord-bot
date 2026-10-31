const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const childProcess = require('node:child_process');
const { metadata } = require('../youtube/ytdlp');
function child() {
    const result = new EventEmitter(); result.stdout = new PassThrough(); result.stderr = new PassThrough();
    result.kill = () => true;
    return result;
}
test('fast client uses the documented ad context and falls back to default clients on lookup failure', async () => {
    const previous = process.env.YOUTUBE_FAST_START;
    process.env.YOUTUBE_FAST_START = 'true';
    const processes = [];
    const spy = mock.method(childProcess, 'spawn', () => { const process = child(); processes.push(process); return process; });
    try {
        const pending = metadata('https://www.youtube.com/watch?v=fffffffffff');
        assert(spy.mock.calls[0].arguments[1].includes('youtube:player_client=mweb;use_ad_playback_context=true'));
        processes[0].stderr.write('Requested format not available'); processes[0].emit('close', 1);
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(processes.length, 2);
        assert(!spy.mock.calls[1].arguments[1].includes('--extractor-args'));
        processes[1].stdout.write('{"id":"fffffffffff","title":"Fallback","formats":[{"format_id":"251"}]}');
        processes[1].emit('close', 0);
        assert.equal((await pending).title, 'Fallback');
    } finally {
        spy.mock.restore();
        if (previous === undefined) delete process.env.YOUTUBE_FAST_START; else process.env.YOUTUBE_FAST_START = previous;
    }
});
test('fast start can be disabled without editing secrets', async () => {
    const previous = process.env.YOUTUBE_FAST_START;
    process.env.YOUTUBE_FAST_START = 'false';
    const processHandle = child();
    const spy = mock.method(childProcess, 'spawn', () => processHandle);
    try {
        const pending = metadata('https://www.youtube.com/watch?v=ggggggggggg');
        assert(!spy.mock.calls[0].arguments[1].includes('--extractor-args'));
        processHandle.stdout.write('{"id":"ggggggggggg","title":"Default"}'); processHandle.emit('close', 0);
        await pending;
    } finally {
        spy.mock.restore();
        if (previous === undefined) delete process.env.YOUTUBE_FAST_START; else process.env.YOUTUBE_FAST_START = previous;
    }
});
test('quality is the default when fast start is not explicitly enabled', async () => {
    const previous = process.env.YOUTUBE_FAST_START;
    delete process.env.YOUTUBE_FAST_START;
    const processHandle = child();
    const spy = mock.method(childProcess, 'spawn', () => processHandle);
    try {
        const pending = metadata('https://www.youtube.com/watch?v=hhhhhhhhhhh');
        assert(!spy.mock.calls[0].arguments[1].includes('--extractor-args'));
        processHandle.stdout.write('{"id":"hhhhhhhhhhh","title":"Quality default"}'); processHandle.emit('close', 0);
        await pending;
    } finally {
        spy.mock.restore();
        if (previous === undefined) delete process.env.YOUTUBE_FAST_START; else process.env.YOUTUBE_FAST_START = previous;
    }
});
