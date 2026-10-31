const assert = require('node:assert/strict');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { Events } = require('discord.js');
const { main } = require('../index');
const { play } = require('../music_logic/play');
const { leave } = require('../music_logic/leave');
const { queue: showQueue } = require('../music_logic/queue');
const { stateFor } = require('../music_logic/enqueue');
const ytdlp = require('../youtube/ytdlp');
async function run() {
    if (!/^\d{17,20}$/.test(process.argv[2] || '')) throw new Error('Supply a voice channel ID.');
    const { client, player, shutdown } = await main();
    let release;
    const gate = new Promise(resolve => { release = resolve; });
    const original = ytdlp.playlistEntries;
    // Deliberately hold the rest of the real YouTube listing until audio starts.
    // This delay exists only in this verification script, never in the bot.
    ytdlp.playlistEntries = async function* (...args) {
        let first = true;
        for await (const entry of original(...args)) {
            yield entry;
            if (first) { first = false; await gate; }
        }
    };
    const timer = setTimeout(() => { release(); shutdown().finally(() => process.exit(1)); }, 90000);
    try {
        if (!client.isReady()) await once(client, Events.ClientReady);
        const channel = await client.channels.fetch(process.argv[2]);
        if (process.env.GUILD_ID) assert.equal(channel.guild.id, process.env.GUILD_ID);
        await player.context.provide({ guild: channel.guild }, async () => {
            const began = Date.now();
            const started = once(player.events, 'playerStart');
            const importing = play('https://www.youtube.com/watch?v=t98MPUJuSKw&list=PLk5JlUIlwWO1vjSTUpZXAeDOEIZco9SGy', channel, channel);
            importing.catch(() => {});
            const queue = player.nodes.get(channel.guild.id);
            const displays = [];
            const capture = { send: async body => displays.push(body) };
            await showQueue(capture);
            assert(displays.at(-1).embeds[0].toJSON().fields.some(field => field.name === 'Loading:'));
            // Wait until the first entry is dispatched for audio extraction.
            for (let i = 0; i < 200 && !stateFor(queue).loadingTrack; i++) await delay(50);
            await showQueue(capture);
            assert(displays.at(-1).embeds[0].toJSON().fields.some(field => ['Loading audio:', 'Now playing:'].includes(field.name)));
            await started;
            console.log('Real first audio ms:', Date.now() - began);
            assert.equal(stateFor(queue).imports.size, 1, 'Playlist tail must still be blocked');
            await delay(2000);
            assert(queue.dispatcher.audioResource.playbackDuration >= 1000);
            await showQueue(capture);
            assert.match(displays.at(-1).embeds[0].toJSON().description, /loading in the background/);
            console.log('PASS: real audio plays while the remaining YouTube playlist is blocked; queue is visible during lookup and startup');
            release();
            const result = await importing;
            assert.equal(result.searchResult.tracks.length, 5);
            assert.equal(queue.tracks.size, 4);
            console.log('PASS: remaining four entries appended after first-track playback began');
            await leave(channel);
        });
    } finally { release(); ytdlp.playlistEntries = original; clearTimeout(timer); await shutdown(); }
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
