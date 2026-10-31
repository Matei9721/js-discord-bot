const assert = require('node:assert/strict');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { Events } = require('discord.js');
const { main } = require('../index');
const { play } = require('../music_logic/play');
const { leave } = require('../music_logic/leave');
const { seek } = require('../music_logic/seek');
const ytdlp = require('../youtube/ytdlp');
async function run() {
    if (!/^\d{17,20}$/.test(process.argv[2] || '')) throw new Error('Supply a voice channel ID.');
    const { client, player, shutdown } = await main();
    const timer = setTimeout(() => shutdown().finally(() => process.exit(1)), 180000);
    try {
        if (!client.isReady()) await once(client, Events.ClientReady);
        const channel = await client.channels.fetch(process.argv[2]);
        if (process.env.GUILD_ID) assert.equal(channel.guild.id, process.env.GUILD_ID);
        await player.context.provide({ guild: channel.guild }, async () => {
            for (const id of ['GMuLmqvONho', 'dQw4w9WgXcQ']) {
                const started = once(player.events, 'playerStart');
                const result = await play(`https://www.youtube.com/watch?v=${id}`, channel, channel);
                await started;
                const q = result.queue;
                const info = await ytdlp.prepare(result.track.url);
                assert.equal(info.acodec, 'opus');
                assert.equal(q.dispatcher.audioResource.encoder, undefined);
                let missed = 0;
                const polling = setInterval(() => { missed = Math.max(missed, q.dispatcher?.audioPlayer.state.missedFrames || 0); }, 10);
                const began = q.dispatcher.audioResource.playbackDuration;
                await delay(15000);
                clearInterval(polling);
                const resource = q.dispatcher.audioResource;
                const advanced = resource.playbackDuration - began;
                console.log(JSON.stringify({ id, sourceCodec: info.acodec, sourceBitrateKbps: info.abr, audioMs: advanced, maxMissedFrames: missed, path: resource.edges.map(edge => edge.type), hasAdditionalEncoder: Boolean(resource.encoder) }));
                assert(advanced >= 14500 && advanced <= 15500);
                assert.equal(missed, 0, 'Playback must not run short of Opus packets');
                if (id === 'dQw4w9WgXcQ') {
                    await seek(30, channel);
                    await delay(3000);
                    assert(q.node.isPlaying());
                    assert(!q.dispatcher.audioResource.encoder, 'Seek must use native FFmpeg encoding');
                    console.log('PASS: seek resumes through native libopus fallback');
                }
                await leave(channel);
            }
            console.log('PASS: two quality-first Opus sources, no extra lossy encoding, no missing audio frames');
        });
    } finally { clearTimeout(timer); await shutdown(); }
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
