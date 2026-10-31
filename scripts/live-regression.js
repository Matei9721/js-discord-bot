const assert = require('node:assert/strict');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { performance } = require('node:perf_hooks');
const { Events } = require('discord.js');
const { main } = require('../index');
const { play } = require('../music_logic/play');
const { skip } = require('../music_logic/skip');
const { leave } = require('../music_logic/leave');
const prefetch = require('../youtube/prefetch');
const PLAYLIST = 'https://www.youtube.com/watch?v=t98MPUJuSKw&list=PLk5JlUIlwWO1vjSTUpZXAeDOEIZco9SGy';
async function until(test, timeout = 30000) {
    const start = performance.now();
    while (!test()) { if (performance.now() - start > timeout) throw new Error('Timed out waiting for playback'); await delay(100); }
}
async function run() {
    if (!/^\d{17,20}$/.test(process.argv[2] || '') || !/^[\w-]{11}$/.test(process.argv[3] || '')) throw new Error('Usage: node scripts/live-regression.js <voice-id> <live-video-id>');
    const { client, player, shutdown } = await main();
    const timer = setTimeout(() => shutdown().finally(() => process.exit(1)), 180000);
    try {
        if (!client.isReady()) await once(client, Events.ClientReady);
        const channel = await client.channels.fetch(process.argv[2]);
        if (process.env.GUILD_ID) assert.equal(channel.guild.id, process.env.GUILD_ID);
        await player.context.provide({ guild: channel.guild }, async () => {
            const starts = [];
            player.events.on('playerStart', (queue, track) => starts.push(track));
            const begin = performance.now();
            const result = await play(PLAYLIST, channel, channel);
            console.log('Playlist acknowledgement ms:', Math.round(performance.now() - begin));
            assert.equal(result.searchResult.tracks.length, 5);
            await until(() => starts.length > 0);
            console.log('Playlist first audio ms:', Math.round(performance.now() - begin));
            const queue = result.queue;
            const second = queue.tracks.at(0);
            await until(() => prefetch.status(queue).ready);
            const startSkip = performance.now();
            await skip(channel);
            // Force a new play request into the next-track extraction gap.
            const adding = play('https://www.youtube.com/watch?v=dQw4w9WgXcQ', channel, channel);
            await until(() => starts.length >= 2);
            console.log('Prepared skip to audio ms:', Math.round(performance.now() - startSkip));
            await adding;
            await delay(2000);
            assert.equal(starts.length, 2, 'Enqueue during skip must not start a second song');
            assert.equal(starts[1], second);
            assert.equal(queue.tracks.size, 4);
            console.log('PASS: five-track watch playlist, prepared skip, concurrent enqueue, no double advance');
            await leave(channel);
            const liveStarted = once(player.events, 'playerStart');
            const liveBegin = performance.now();
            const liveResult = await play(`https://www.youtube.com/watch?v=${process.argv[3]}`, channel, channel);
            await liveStarted;
            await delay(5000);
            assert.equal(liveResult.queue.currentTrack.live, true);
            assert(liveResult.queue.dispatcher.audioResource.playbackDuration >= 3000);
            console.log('PASS: livestream audio continuing; initial startup ms:', Math.round(performance.now() - liveBegin - 5000));
            await leave(channel);
        });
    } finally { clearTimeout(timer); await shutdown(); }
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
