const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Client, GatewayIntentBits, VoiceChannel } = require('discord.js');
const { Player, Track, SearchResult } = require('discord-player');
const { enqueue, stateFor } = require('../music_logic/enqueue');
const { skip } = require('../music_logic/skip');
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
async function fixture() {
    const client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] });
    const player = new Player(client);
    const guild = client.guilds._add({ id: '123456789012345678', name: 'Test' });
    const voice = new VoiceChannel(guild, { id: '234567890123456789', name: 'Voice', type: 2, bitrate: 64000 }, client);
    client.channels.cache.set(voice.id, voice);
    const queue = player.nodes.create(guild, { leaveOnEnd: false });
    const dispatcher = new EventEmitter();
    dispatcher.channel = voice;
    dispatcher.voiceConnection = {};
    dispatcher.audioResource = null;
    dispatcher.isPlaying = () => Boolean(dispatcher.audioResource && !dispatcher.audioResource.ended);
    dispatcher.isPaused = () => false;
    dispatcher.end = () => {
        if (!dispatcher.audioResource) return;
        const old = dispatcher.audioResource; old.ended = true;
        dispatcher.audioResource = null;
        dispatcher.emit('finish', old);
    };
    player.voiceUtils.connect = async () => dispatcher;
    await queue.connect(voice);
    const track = title => new Track(player, { title, duration: '3:00', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    const result = song => new SearchResult(player, { query: song.title, tracks: [song] });
    const close = async () => { queue.dispatcher = null; await player.destroy(); await client.destroy(); };
    return { client, player, guild, voice, queue, dispatcher, track, result, close };
}
test('skip then enqueue during automatic extraction does not start a second song', async () => {
    const f = await fixture();
    const [a, b, c] = ['Playing', 'Loading next', 'Newly queued'].map(f.track);
    const pending = deferred();
    const attempts = [];
    f.dispatcher.audioResource = { metadata: a, ended: false };
    f.queue.tracks.add(b);
    f.queue.node.play = async track => { attempts.push(track); await pending.promise; f.dispatcher.audioResource = { metadata: track, ended: false }; };
    const channel = { send: async () => {} };
    try {
        await f.player.context.provide({ guild: f.guild }, async () => {
            await skip(channel);
            assert.equal(f.queue.currentTrack, b);
            await enqueue(f.player, f.voice, f.result(c), { metadata: { messageChannel: channel } });
            assert.deepEqual(attempts, [b]);
            assert.deepEqual(f.queue.tracks.toArray(), [c]);
            await skip(channel); // repeated skip while B loads must not consume C
            assert.deepEqual(attempts, [b]);
            assert.deepEqual(f.queue.tracks.toArray(), [c]);
        });
    } finally { pending.resolve(); await new Promise(r => setImmediate(r)); await f.close(); }
});
test('initial loading does not block queue additions or start concurrent players', async () => {
    const f = await fixture();
    const pending = deferred();
    const attempts = [];
    f.queue.node.play = async () => { attempts.push(f.queue.tracks.dispatch()); await pending.promise; };
    try {
        const first = f.track('First'), second = f.track('Second');
        await enqueue(f.player, f.voice, f.result(first), { metadata: {} });
        assert(stateFor(f.queue).starting);
        await enqueue(f.player, f.voice, f.result(second), { metadata: {} });
        assert.deepEqual(attempts, [first]);
        assert.deepEqual(f.queue.tracks.toArray(), [second]);
    } finally { pending.resolve(); await stateFor(f.queue).starting; await f.close(); }
});
