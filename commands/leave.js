const { SlashCommandBuilder } = require('discord.js');
const {leave} = require("../music_logic/leave");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Make the bot leave from the voice channel'),
    async execute(interaction) {
        await leave(interaction.channel, interaction)
    },
};
