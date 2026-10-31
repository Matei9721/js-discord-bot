const { SlashCommandBuilder } = require('discord.js');
const { botReply } = require('../bot-reply');
const help = 'Use / or ! before a command:\n' +
    'play <YouTube URL, playlist or song name>\n' +
    'queue · skip · pause · resume · seek <seconds>\n' +
    'shuffle · clearqueue · loop <off|track|queue|autoplay> · leave\n' +
    'clean <1–99> requires Manage Messages.\n' +
    'Join the bot’s voice channel to control playback. Playlists support up to 500 entries.';
module.exports = {
    data: new SlashCommandBuilder().setName('help').setDescription('Show music commands'),
    execute: interaction => botReply(help, interaction.channel, interaction),
    help
};
