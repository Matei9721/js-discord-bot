const { SlashCommandBuilder } = require('discord.js');
const sleepFunc = require('./sleep_function/sleepFunc');
const logger = require("../logging");
const {botReply} = require('../bot-reply');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sleep')
        .setDescription('Sleeps for the given amount of seconds')
        .addIntegerOption((option) => option
            .setName('seconds')
            .setMinValue(1)
            .setMaxValue(60)
            .setDescription('The number of seconds you want the bot to sleep')
            .setRequired(true)),
    async execute(interaction) {
        const seconds = interaction.options.getInteger("seconds")
        logger.debug(`[${interaction.guild.name}][Sleep] Sleep input: ${seconds}`)
        await botReply('ZzZzZzZ...', interaction.channel, interaction);
        await sleepFunc(seconds);
        await interaction.deleteReply();
    },
};
