const { useQueue } = require('discord-player');
const { PermissionFlagsBits } = require('discord.js');
const { botReply } = require('./bot-reply');
const { createChatbot } = require('./chatbot');
const logger = require('./logging');
const controls = new Set(['play', 'pause', 'resume', 'skip', 'seek', 'loop', 'shuffle', 'clearqueue', 'leave']);

function parseClassic(content, commands) {
    if (!content.startsWith('!')) return null;
    const text = content.slice(1).trim();
    const name = [...commands.keys()].sort((a, b) => b.length - a.length)
        .find(key => text.toLowerCase() === key || text.toLowerCase().startsWith(`${key} `));
    return name ? { name, command: commands.get(name), args: text.slice(name.length).trim() } : null;
}
async function guard(name, member, channel) {
    if (name === 'clean' && !member.permissions.has(PermissionFlagsBits.ManageMessages)) throw new Error('You need Manage Messages permission to use clean.');
    if (!controls.has(name)) return;
    const voice = member.voice?.channel;
    if (!voice) throw new Error('Join a voice channel first.');
    const queue = useQueue();
    if (queue?.channel && queue.channel.id !== voice.id) throw new Error('Join the same voice channel as the bot to control playback.');
    if (name === 'play') {
        if (voice.isStageVoice?.()) throw new Error('Use a regular voice channel for music playback.');
        const permissions = voice.permissionsFor(member.guild.members.me);
        if (!permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) throw new Error('I need View Channel, Connect and Speak permissions in your voice channel.');
        if (!channel.permissionsFor(member.guild.members.me)?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks])) throw new Error('I need View Channel, Send Messages and Embed Links in this text channel.');
    }
}
function createHandlers(client, player, chat = createChatbot(client)) {
    const run = (guild, fn) => player.context.provide({ guild }, fn);
    async function report(error, channel, interaction) {
        logger.warn(`[Command] ${error.message}`);
        await botReply(error.message.slice(0, 1800), channel, interaction).catch(replyError => logger.warn(`[Reply] ${replyError.code || replyError.name}`));
    }
    return {
        shutdown: () => chat.close(),
        interaction: async interaction => {
            if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                // Acknowledge before any network calls or media extraction.
                await interaction.deferReply();
                await run(interaction.guild, async () => {
                    const member = await interaction.guild.members.fetch(interaction.user.id);
                    await guard(interaction.commandName, member, interaction.channel);
                    await command.execute(interaction);
                });
            } catch (error) { await report(error, interaction.channel, interaction); }
        },
        message: async message => {
            if (!message.guild || message.author.bot || message.webhookId) return;
            const parsed = parseClassic(message.content, client.commandsClassic);
            if (!parsed) return chat.handle(message);
            if (parsed.name === 'play' && message.channel.sendTyping) message.channel.sendTyping().catch(() => {});
            try {
                await run(message.guild, async () => {
                    await guard(parsed.name, message.member, message.channel);
                    // Normalize casing and whitespace for the existing command wrappers.
                    const normalized = Object.create(message);
                    Object.defineProperty(normalized, 'content', { value: `!${parsed.name} ${parsed.args}`.trim() });
                    await parsed.command.execute(client, normalized);
                });
            } catch (error) { await report(error, message.channel); }
        }
    };
}
module.exports = { createHandlers, parseClassic, guard };
