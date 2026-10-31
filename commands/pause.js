const { SlashCommandBuilder } = require('discord.js')
const {pause} = require("../music_logic/pause");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Make the bot pause the current song'),
    async execute(interaction) {
        await pause(interaction.channel, interaction)
    },
};
