const {SlashCommandBuilder} = require('discord.js');
const {play} = require("../music_logic/play");
const logger = require('../logging');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play a YouTube video, playlist or song name (also accepts Spotify links)')
        .addStringOption((option) => option
            .setName('song')
            .setDescription('The URL or name of the song')
            .setRequired(true)),


    async execute(interaction) {
        //Indicate that the command is being processed
        const input = interaction.options.get("song").value
        logger.debug(`[${interaction.guild.name}][Play] Play input: ${input}`)
        const voiceChannel = interaction.guild.members.cache.get(interaction.user.id)?.voice.channel
        await play(input, voiceChannel, interaction.channel, interaction)
    },
};
