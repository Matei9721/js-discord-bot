const { SlashCommandBuilder } = require('discord.js');
const {skip} = require("../music_logic/skip");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Make the bot skip the current song'),
    async execute(interaction) {
        await skip(interaction.channel, interaction);
    },
};
