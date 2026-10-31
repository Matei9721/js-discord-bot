const { SlashCommandBuilder } = require('discord.js');
const {resume} = require("../music_logic/resume");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the last song paused'),
    async execute(interaction) {
        await resume(interaction.channel, interaction);
    },
};
