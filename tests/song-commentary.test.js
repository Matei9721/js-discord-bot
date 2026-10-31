const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createSongCommentary, attachSongCommentary } = require('../song-commentary');

const env = { DEEPSEEK_API_KEY: 'test-secret', DEEPSEEK_MODEL: 'test-model' };
const requesterId = '123456789012345678';

function fixture() {
    const sent = [];
    const track = {
        title: 'K/DA - FIRESTARTER (Official Music Video)', author: 'K/DA',
        requestedBy: { id: requesterId, username: 'Original requester' }
    };
    const queue = {
        deleted: false, currentTrack: track,
        metadata: { messageChannel: { send: async body => { sent.push(body); } } }
    };
    return { track, queue, sent };
}

const tick = () => new Promise(resolve => setImmediate(resolve));

test('one of ten equally spaced random rolls selects a comment; the 0.1 boundary does not', async () => {
    let calls = 0;
    for (let bucket = 0; bucket < 10; bucket++) {
        const { queue, track, sent } = fixture();
        const commentary = createSongCommentary({ env, random: () => bucket / 10, complete: async function* () {
            calls++; yield 'Specific roast';
        } });
        await commentary.handle(queue, track);
        assert.equal(sent.length, bucket === 0 ? 1 : 0);
    }
    assert.equal(calls, 1);
    const { queue, track, sent } = fixture();
    await createSongCommentary({ env, random: () => 0.099999, complete: async function* () { yield 'Specific roast'; } }).handle(queue, track);
    assert.equal(sent.length, 1);
});

test('comments use only song metadata and tag the track requester, with every other mention disabled', async () => {
    const { queue, track, sent } = fixture();
    queue.metadata.requestedBy = { id: '234567890123456789' };
    const commentary = createSongCommentary({ env, random: () => 0, complete: async function* (messages, options) {
        assert.deepEqual(JSON.parse(messages[1].content), { title: track.title, artist: track.author, mode: 'roast' });
        assert.equal(messages.length, 2);
        assert(!JSON.stringify(messages).includes(requesterId));
        assert.equal(options.apiKey, 'test-secret');
        assert.equal(options.model, 'test-model');
        assert.equal(options.maxTokens, 160);
        assert.equal(options.signal.aborted, false);
        yield 'Your taste '; yield 'is a ranked lobby. @everyone <@234567890123456789> <@&345678901234567890>';
    } });
    await commentary.handle(queue, track);
    assert.equal(sent.length, 1);
    assert(sent[0].content.startsWith(`<@${requesterId}> Your taste`));
    assert.deepEqual(sent[0].allowedMentions, { parse: [], users: [requesterId], repliedUser: false });
});

test('selected comments occasionally request grudging respect instead of a roast', async () => {
    const { queue, track } = fixture();
    const rolls = [0.05, 0.95];
    await createSongCommentary({ env, random: () => rolls.shift(), complete: async function* (messages) {
        assert.equal(JSON.parse(messages[1].content).mode, 'grudging_respect');
        yield 'Fine, one decent song.';
    } }).handle(queue, track);
});

test('the same queue entry is never rerolled on loop or seek, including after a losing roll', async () => {
    for (const roll of [0, 0.5]) {
        const { queue, track, sent } = fixture();
        let rolls = 0;
        const commentary = createSongCommentary({ env, random: () => { rolls++; return roll; }, complete: async function* () { yield 'Roast'; } });
        await commentary.handle(queue, track);
        await commentary.handle(queue, track);
        await commentary.handle(queue, track);
        assert.equal(rolls, roll === 0 ? 2 : 1); // Selection roll and, if selected, tone roll.
        assert.equal(sent.length, roll === 0 ? 1 : 0);
    }
});

test('separate playlist entries each get a roll, even for the same title with different requesters', async () => {
    const { queue, track, sent } = fixture();
    const commentary = createSongCommentary({ env, random: () => 0, complete: async function* () { yield 'Roast'; } });
    await commentary.handle(queue, track);
    const next = { ...track, requestedBy: { id: '234567890123456789' } };
    queue.currentTrack = next;
    await commentary.handle(queue, next);
    assert.equal(sent.length, 2);
    assert(sent[1].content.startsWith('<@234567890123456789> '));
});

test('missing configuration, requester, title, channel or deleted queues never call DeepSeek', async () => {
    const cases = [
        f => { f.track.requestedBy = null; },
        f => { f.track.requestedBy.id = '@everyone'; },
        f => { f.track.title = ''; },
        f => { f.queue.metadata = {}; },
        f => { f.queue.deleted = true; }
    ];
    for (const change of cases) {
        const f = fixture(); change(f);
        await createSongCommentary({ env, random: () => 0, complete: () => assert.fail('Ineligible request') }).handle(f.queue, f.track);
        assert.equal(f.sent.length, 0);
    }
    const f = fixture();
    await createSongCommentary({ env: {}, random: () => 0, complete: () => assert.fail('No API key') }).handle(f.queue, f.track);
    assert.equal(f.sent.length, 0);
});

test('player event handling never blocks playback while a comment is being generated', async () => {
    const f = fixture();
    const player = { events: new EventEmitter() };
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    let continued = false;
    attachSongCommentary(player, { env, random: () => 0, complete: async function* () { await gate; yield 'Roast'; } });
    player.events.on('playerStart', () => { continued = true; });
    player.events.emit('playerStart', f.queue, f.track);
    assert.equal(continued, true);
    assert.equal(f.sent.length, 0);
    release(); await tick();
    assert.equal(f.sent.length, 1);
});

test('skip, finish, disconnect and queue deletion abort unfinished comments without posting errors', async () => {
    for (const event of ['playerSkip', 'playerFinish', 'connectionDestroyed', 'queueDelete']) {
        const f = fixture();
        const player = { events: new EventEmitter() };
        let signal;
        attachSongCommentary(player, { env, random: () => 0, complete: async function* (messages, options) {
            signal = options.signal;
            await new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
        } });
        player.events.emit('playerStart', f.queue, f.track);
        player.events.emit(event, f.queue, f.track);
        await tick();
        assert.equal(signal.aborted, true);
        assert.equal(f.sent.length, 0);
    }
});

test('stale results cannot post after the current song changes, even if the provider ignores cancellation', async () => {
    const { queue, track, sent } = fixture();
    const commentary = createSongCommentary({ env, random: () => 0, complete: async function* () {
        queue.currentTrack = { ...track, title: 'Different track' };
        yield 'Too late';
    } });
    await commentary.handle(queue, track);
    assert.equal(sent.length, 0);
});

test('provider errors, empty replies and Discord failures are quietly contained', async () => {
    for (const outcome of ['error', 'empty', 'send failure']) {
        const { queue, track, sent } = fixture();
        if (outcome === 'send failure') queue.metadata.messageChannel.send = async () => { throw new Error('Discord unavailable'); };
        const commentary = createSongCommentary({ env, random: () => 0, complete: async function* () {
            if (outcome === 'error') throw Object.assign(new Error('private-key'), { status: 429 });
            if (outcome !== 'empty') yield 'Roast';
        } });
        await commentary.handle(queue, track);
        assert.equal(sent.length, 0);
    }
});

test('song replies unwrap internal metadata and stay short', async () => {
    const { queue, track, sent } = fixture();
    await createSongCommentary({ env, random: () => 0, complete: async function* () {
        yield JSON.stringify({ speaker: 'Anime Slave', sent_at: null, age_seconds: 0, text: 'x'.repeat(1000) });
    } }).handle(queue, track);
    assert.equal(sent[0].content, `<@${requesterId}> ${'x'.repeat(500)}`);
});
