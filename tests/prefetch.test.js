const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const ytdlp = require('../youtube/ytdlp');
const prefetch = require('../youtube/prefetch');
const tick = () => new Promise(resolve => setImmediate(resolve));
test('prefetched audio is handed to playback once; clearing a queue destroys unused audio', async () => {
    const first = { title: 'Next', url: 'https://www.youtube.com/watch?v=aaaaaaaaaaa', source: 'youtube' };
    const second = { title: 'Replacement', url: 'https://www.youtube.com/watch?v=bbbbbbbbbbb', source: 'youtube' };
    let upcoming = first;
    const queue = { tracks: { at: () => upcoming } };
    const streams = [];
    const preparing = mock.method(ytdlp, 'prepare', async () => ({ is_live: false }));
    const audio = mock.method(ytdlp, 'audio', async () => { const stream = new PassThrough(); streams.push(stream); return stream; });
    try {
        prefetch.prefetchNext(queue); await tick();
        assert(prefetch.status(queue).ready);
        prefetch.prefetchNext(queue); await tick();
        assert.equal(audio.mock.callCount(), 1);
        assert.equal(await prefetch.take(queue, first), streams[0]);
        assert.equal(await prefetch.take(queue, first), null);
        assert(!streams[0].destroyed);
        upcoming = second;
        prefetch.prefetchNext(queue); await tick();
        prefetch.forget(queue);
        assert(streams[1].destroyed);
        assert(!streams[0].destroyed, 'Playing stream is owned by the audio player');
    } finally { streams.forEach(stream => stream.destroy()); prefetch.clear(); preparing.mock.restore(); audio.mock.restore(); }
});
test('live broadcasts are never recorded ahead and cancelled lookups do not start downloads', async () => {
    const track = { title: 'Next', url: 'https://www.youtube.com/watch?v=ccccccccccc', source: 'youtube' };
    const queue = { tracks: { at: () => track } };
    let resolve;
    const preparing = mock.method(ytdlp, 'prepare', () => new Promise(r => { resolve = r; }));
    const audio = mock.method(ytdlp, 'audio', async () => new PassThrough());
    try {
        prefetch.prefetchNext(queue);
        prefetch.forget(queue);
        resolve({ is_live: false }); await tick();
        assert.equal(audio.mock.callCount(), 0);
        prefetch.prefetchNext(queue);
        resolve({ is_live: true }); await tick();
        assert.equal(audio.mock.callCount(), 0);
    } finally { prefetch.clear(); preparing.mock.restore(); audio.mock.restore(); }
});
