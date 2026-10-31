const { SlashCommandBuilder } = require('discord.js');
const { clearQueue } = require("../music_logic/clearqueue");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearqueue')
        .setDescription('Make the bot clear the entire queue'),
    async execute(interaction) {
        await clearQueue(interaction.channel, interaction)
    },
};
