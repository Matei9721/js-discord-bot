const assert = require('node:assert/strict');
const { once } = require('node:events');
const { setTimeout: delay } = require('node:timers/promises');
const { Events } = require('discord.js');
const { main } = require('../index');
const { play } = require('../music_logic/play');
const { leave } = require('../music_logic/leave');
async function run() {
    if (!/^\d{17,20}$/.test(process.argv[2] || '')) throw new Error('Supply a voice channel ID.');
    const { client, player, shutdown } = await main();
    const timer = setTimeout(() => shutdown().finally(() => process.exit(1)), 90000);
    try {
        if (!client.isReady()) await once(client, Events.ClientReady);
        const channel = await client.channels.fetch(process.argv[2]);
        if (process.env.GUILD_ID) assert.equal(channel.guild.id, process.env.GUILD_ID);
        await player.context.provide({ guild: channel.guild }, async () => {
            const began = Date.now();
            const started = once(player.events, 'playerStart');
            const importing = play('https://www.youtube.com/watch?v=GMuLmqvONho&list=RDGMuLmqvONho&start_radio=1', channel, channel);
            importing.catch(() => {});
            const [queue, track] = await started;
            console.log('Mix first audio ms:', Date.now() - began);
            assert.equal(new URL(track.url).searchParams.get('v'), 'GMuLmqvONho');
            await delay(3000);
            assert(queue.dispatcher.audioResource.playbackDuration >= 2000);
            assert(queue.tracks.size > 0, 'Related mix entries must be queued');
            console.log(JSON.stringify({ title: track.title, upcoming: queue.tracks.size, audioMilliseconds: queue.dispatcher.audioResource.playbackDuration }));
            await leave(channel);
            await importing;
            console.log('PASS: exact YouTube radio link plays its seed video and queues related videos');
        });
    } finally { clearTimeout(timer); await shutdown(); }
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; });
