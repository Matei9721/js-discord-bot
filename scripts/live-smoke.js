// Explicit live test: posts playback notifications in the selected voice channel.
// Usage: node scripts/live-smoke.js <voice-channel-id>
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { Events } = require('discord.js');
const { main } = require('../index');
const { play } = require('../music_logic/play');
const { pause } = require('../music_logic/pause');
const { resume } = require('../music_logic/resume');
const { clearQueue } = require('../music_logic/clearqueue');
const { seek } = require('../music_logic/seek');
const { leave } = require('../music_logic/leave');

async function test() {
    if (!/^\d{17,20}$/.test(process.argv[2] || '')) throw new Error('Supply a voice channel ID.');
    const runtime = await main();
    const { client, player, shutdown } = runtime;
    const timer = setTimeout(() => { console.error('Live test timed out'); shutdown().finally(() => process.exit(1)); }, 180000);
    try {
        if (!client.isReady()) await once(client, Events.ClientReady);
        const channel = await client.channels.fetch(process.argv[2]);
        assert(channel?.isVoiceBased(), 'Channel must be a voice channel');
        if (process.env.GUILD_ID) assert.equal(channel.guild.id, process.env.GUILD_ID);
        await player.context.provide({ guild: channel.guild }, async () => {
            const started = once(player.events, 'playerStart');
            const result = await play('https://www.youtube.com/watch?v=dQw4w9WgXcQ', channel, channel);
            await started;
            const queue = result.queue;
            await delay(5000);
            const resource = queue.dispatcher.audioResource;
            const connection = queue.dispatcher.voiceConnection;
            console.log(JSON.stringify({ voiceStatus: connection.state.status, audioMilliseconds: resource?.playbackDuration,
                daveSession: Boolean(connection.state.networking?.state.dave), title: queue.currentTrack?.title }));
            assert(resource?.playbackDuration >= 2000, 'Audio must continue playing');
            assert.equal(connection.state.status, 'ready');
            assert(connection.state.networking?.state.dave, 'DAVE session must be established');
            await pause(channel);
            await pause(channel);
            assert(queue.node.isPaused());
            await resume(channel);
            await resume(channel);
            assert(!queue.node.isPaused());
            await play('Rick Astley Together Forever', channel, channel);
            assert(queue.tracks.size >= 1, 'Search result must be queued');
            await clearQueue(channel);
            assert.equal(queue.tracks.size, 0);
            assert(queue.currentTrack, 'Clearing the queue preserves current playback');
            await seek(15, channel);
            await delay(3000);
            assert(queue.node.isPlaying(), 'Playback must continue after seek');
            console.log('PASS: real voice playback, DAVE, URL, search, queue, repeated pause/resume, clearqueue and seek');
            await leave(channel);
        });
    } finally { clearTimeout(timer); await shutdown(); }
}
test().catch(error => { console.error(error.message); process.exitCode = 1; });
