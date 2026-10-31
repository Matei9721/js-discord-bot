const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { Client, GatewayIntentBits } = require('discord.js');
const { Player } = require('discord-player');
const { YtDlpExtractor } = require('../youtube/YtDlpExtractor');
const ytdlp = require('../youtube/ytdlp');
const { loadPlaylist } = require('../music_logic/loadPlaylist');
const { queue: showQueue } = require('../music_logic/queue');
const { clearQueue } = require('../music_logic/clearqueue');
const { stateFor } = require('../music_logic/enqueue');
const tick = () => new Promise(resolve => setImmediate(resolve));
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

test('queue remains visible through lookup and startup; first song plays before playlist tail arrives', async () => {
    const client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] });
    const player = new Player(client);
    const guild = client.guilds._add({ id: '123456789012345678', name: 'Test' });
    const voice = { guild, id: '234567890123456789' };
    const q = player.nodes.create(guild);
    const dispatcher = { channel: voice, audioResource: null, isPaused: () => false,
        isPlaying: () => Boolean(dispatcher.audioResource), destroy: () => {} };
    q.dispatcher = dispatcher;
    const head = deferred(), audio = deferred(), tail = deferred();
    let playing = false;
    q.node.play = async () => { const track = q.tracks.dispatch(); await audio.promise; dispatcher.audioResource = { metadata: track }; playing = true; };
    const extractor = await player.extractors.register(YtDlpExtractor, {});
    const spy = mock.method(ytdlp, 'playlistEntries', async function* () {
        await head.promise;
        yield { id: 'aaaaaaaaaaa', title: 'First', duration: 180, playlist_title: 'List' };
        await tail.promise;
        yield { id: 'bbbbbbbbbbb', title: 'Second', duration: 180 };
    });
    const replies = [];
    const channel = { send: async body => { replies.push(body); return { edit: async edit => replies.push(edit) }; } };
    try {
        await player.context.provide({ guild }, async () => {
            const importing = loadPlaylist(player, extractor, 'https://www.youtube.com/playlist?list=PL123', voice, channel, null, null, { metadata: { messageChannel: channel } });
            await tick();
            await showQueue(channel);
            assert(replies.at(-1).embeds[0].toJSON().fields.some(field => field.name === 'Loading:'));
            head.resolve(); await tick();
            assert(stateFor(q).loadingTrack);
            await showQueue(channel);
            assert(replies.at(-1).embeds[0].toJSON().fields.some(field => field.name === 'Loading audio:' && field.value.includes('First')));
            audio.resolve(); await tick();
            assert(playing, 'First audio starts with the playlist tail still blocked');
            assert.equal(stateFor(q).imports.size, 1);
            await showQueue(channel);
            const display = replies.at(-1).embeds[0].toJSON();
            assert.match(display.description, /loading in the background/);
            assert(display.fields.some(field => field.name === 'Now playing:' && field.value.includes('First')));
            tail.resolve();
            const result = await importing;
            assert.equal(result.searchResult.tracks.length, 2);
            assert.equal(q.tracks.at(0).title, 'Second');
        });
    } finally { head.resolve(); audio.resolve(); tail.resolve(); spy.mock.restore(); q.dispatcher = null; await player.destroy(); await client.destroy(); }
});
test('clearqueue cancels a background playlist import without removing the playing song', async () => {
    const client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] });
    const player = new Player(client);
    const guild = client.guilds._add({ id: '123456789012345678', name: 'Test' });
    const voice = { guild, id: '234567890123456789' };
    const q = player.nodes.create(guild);
    q.dispatcher = { channel: voice, audioResource: null };
    q.node.play = async () => { q.dispatcher.audioResource = { metadata: q.tracks.dispatch() }; };
    const extractor = await player.extractors.register(YtDlpExtractor, {});
    const spy = mock.method(ytdlp, 'playlistEntries', async function* (query, { signal }) {
        yield { id: 'aaaaaaaaaaa', title: 'First', duration: 180 };
        await new Promise(resolve => signal.addEventListener('abort', resolve, { once: true }));
        yield { id: 'bbbbbbbbbbb', title: 'Must not appear' };
    });
    const channel = { send: async () => ({ edit: async () => {} }) };
    try {
        await player.context.provide({ guild }, async () => {
            const importing = loadPlaylist(player, extractor, 'https://www.youtube.com/playlist?list=PL123', voice, channel, null, null, { metadata: {} });
            await tick();
            await clearQueue(channel);
            assert.equal(await importing, null);
            assert.equal(q.currentTrack.title, 'First');
            assert.equal(q.tracks.size, 0);
        });
    } finally { spy.mock.restore(); q.dispatcher = null; await player.destroy(); await client.destroy(); }
});
