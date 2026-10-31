const {SlashCommandBuilder} = require('discord.js');
const {seek} = require("../music_logic/seek");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seek to a specific time in the song')
        .addIntegerOption(option => option
            .setName('seconds')
            .setMinValue(0)
            .setDescription('The second you want to jump to.')
            .setRequired(true)),
    async execute(interaction) {
        await seek(interaction.options.getInteger('seconds'), interaction.channel, interaction)
    },
};
