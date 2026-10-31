const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Client, GatewayIntentBits } = require('discord.js');
const { Player, Track } = require('discord-player');
const { botReply } = require('../bot-reply');
const { createHandlers, parseClassic } = require('../handlers');
const { loadCommands, registerCommands } = require('../commandRegister');
const { pause } = require('../music_logic/pause');
const { resume } = require('../music_logic/resume');
const { clearQueue } = require('../music_logic/clearqueue');
const { seek } = require('../music_logic/seek');
const { queue: showQueue } = require('../music_logic/queue');

test('replies use initial, deferred and follow-up responses correctly', async () => {
    const calls = [];
    const interaction = Object.fromEntries(['reply', 'editReply', 'followUp'].map(name => [name, async body => calls.push([name, body])]));
    await botReply('one', null, interaction);
    interaction.deferred = true;
    await botReply('two', null, interaction);
    interaction.replied = true;
    await botReply('three', null, interaction);
    assert.deepEqual(calls.map(call => call[0]), ['reply', 'editReply', 'followUp']);
    assert.deepEqual(calls[0][1].allowedMentions, { parse: [] });
});
test('prefix parser handles casing, whitespace, URLs containing ! and multiword commands', () => {
    const commands = require('../commandClassicRegister')();
    assert.equal(parseClassic('!PLAY   https://youtu.be/abc!x', commands).args, 'https://youtu.be/abc!x');
    assert.equal(parseClassic('!bot get him', commands).name, 'bot get him');
    assert.equal(parseClassic('!unknown', commands), null);
    assert.equal(parseClassic('ordinary message', commands), null);
});
test('all slash commands serialize and registration uses the configured scope', async () => {
    const commands = loadCommands();
    for (const command of commands.values()) assert(command.data.toJSON().name);
    const previous = { guild: process.env.GUILD_ID, client: process.env.CLIENT_ID };
    const calls = [];
    const rest = { put: async (...args) => calls.push(args) };
    try {
        process.env.CLIENT_ID = '123456789012345678';
        process.env.GUILD_ID = '234567890123456789';
        await registerCommands(commands, rest);
        assert(calls[0][0].includes('/guilds/234567890123456789/commands'));
        delete process.env.GUILD_ID;
        await registerCommands(commands, rest);
        assert(!calls[1][0].includes('/guilds/'));
    } finally {
        for (const [key, value] of [['GUILD_ID', previous.guild], ['CLIENT_ID', previous.client]]) {
            if (value === undefined) delete process.env[key]; else process.env[key] = value;
        }
    }
});
test('real player context: pause/resume are idempotent, queue clearing preserves playback, seek validates', async () => {
    const client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] });
    const player = new Player(client);
    const guild = client.guilds._add({ id: '123456789012345678', name: 'Test' });
    const q = player.nodes.create(guild);
    const track = new Track(player, { title: 'Test song', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', duration: '3:00' });
    let paused = false;
    const counts = { pause: 0, resume: 0, seek: 0 };
    q.dispatcher = {
        audioResource: { metadata: track, ended: false },
        isPaused: () => paused,
        pause: () => { paused = true; counts.pause++; return true; },
        resume: () => { paused = false; counts.resume++; return true; },
        destroy: () => {}
    };
    q.node.seek = async () => { counts.seek++; return true; };
    q.tracks.add(track);
    const replies = [];
    const channel = { send: async body => replies.push(body) };
    try {
        await player.context.provide({ guild }, async () => {
            await pause(channel); await pause(channel);
            assert(paused); assert.equal(counts.pause, 1);
            await resume(channel); await resume(channel);
            assert(!paused); assert.equal(counts.resume, 1);
            await clearQueue(channel);
            assert.equal(q.tracks.size, 0); assert.equal(q.currentTrack, track);
            await assert.rejects(seek(-1, channel));
            await assert.rejects(seek(NaN, channel));
            await assert.rejects(seek(180, channel));
            await seek(15, channel); assert.equal(counts.seek, 1);
        });
    } finally { q.dispatcher = null; await player.destroy(); await client.destroy(); }
});
test('slash handler defers before work and returns errors; unknown commands and bot messages are ignored', async () => {
    const calls = [];
    const command = { execute: async () => { calls.push('execute'); throw new Error('Expected failure'); } };
    const client = { commands: new Map([['ping', command]]), commandsClassic: new Map() };
    const player = { context: { provide: async (ctx, fn) => { calls.push('context'); return fn(); } } };
    const handlers = createHandlers(client, player);
    const interaction = {
        isChatInputCommand: () => true, inGuild: () => true, commandName: 'ping',
        user: { id: 'user' }, guild: { members: { fetch: async () => ({}) } },
        deferReply: async function () { calls.push('defer'); this.deferred = true; },
        editReply: async body => calls.push(body.content)
    };
    await handlers.interaction(interaction);
    assert.deepEqual(calls, ['defer', 'context', 'execute', 'Expected failure']);
    await handlers.message({ guild: {}, author: { bot: true } });
    await handlers.message({ guild: null, author: { bot: false } });
});
test('empty queue replies through the deferred slash interaction', async () => {
    const client = new Client({ intents: [GatewayIntentBits.GuildVoiceStates] });
    const player = new Player(client);
    let response;
    try {
        await player.context.provide({ guild: { id: '123456789012345678' } }, () => showQueue(null, {
            deferred: true, editReply: async body => { response = body.content; }
        }));
        assert.match(response, /does not have an active/);
    } finally { await player.destroy(); await client.destroy(); }
});
