const { SlashCommandBuilder } = require('discord.js');
const {botReply} = require("../bot-reply");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pop')
        .setDescription('Replies with Pop!'),
    async execute(interaction) {
        await botReply('Pop!', interaction.channel, interaction);
    },
};
