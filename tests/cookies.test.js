const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PassThrough } = require('node:stream');
const { mkdtempSync, writeFileSync, readFileSync, existsSync, unlinkSync, rmdirSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');
const childProcess = require('node:child_process');
const { metadata } = require('../youtube/ytdlp');
test('read-only cookie sources use independent temporary copies which are cleaned up', async () => {
    const folder = mkdtempSync(path.join(tmpdir(), 'discord-cookie-test-'));
    const original = path.join(folder, 'source.txt');
    const contents = '# Netscape HTTP Cookie File\n';
    writeFileSync(original, contents);
    const previous = process.env.YOUTUBE_COOKIES_FILE;
    process.env.YOUTUBE_COOKIES_FILE = original;
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.kill = () => true;
    let temporary;
    const spy = mock.method(childProcess, 'spawn', (command, args) => {
        assert(!args.includes('--extractor-args'), 'Authenticated cookie sessions use normal clients');
        temporary = args[args.indexOf('--cookies') + 1];
        assert.notEqual(temporary, original);
        assert.equal(readFileSync(temporary, 'utf8'), contents);
        return child;
    });
    try {
        const pending = metadata('ytsearch1:test');
        child.stdout.write('{"id":"test"}');
        child.emit('close', 0);
        await pending;
        assert.equal(existsSync(temporary), false);
        assert.equal(readFileSync(original, 'utf8'), contents);
    } finally {
        spy.mock.restore();
        if (previous === undefined) delete process.env.YOUTUBE_COOKIES_FILE; else process.env.YOUTUBE_COOKIES_FILE = previous;
        unlinkSync(original); rmdirSync(folder);
    }
});
