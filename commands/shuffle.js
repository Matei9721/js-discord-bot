const { SlashCommandBuilder } = require('discord.js');
const {shuffle} = require("../music_logic/shuffle");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffle the songs in the queue'),
    async execute(interaction) {
        await shuffle(interaction.channel, interaction);
    },
};
