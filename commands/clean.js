const {SlashCommandBuilder} = require('discord.js');
const {botReply} = require("../bot-reply");
const logger = require("../logging");
const {PermissionFlagsBits} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clean')
        .setDescription('Cleans the last specified messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption(option => option
            .setName('number')
            .setMinValue(1)
            .setDescription('The number of messages you want to delete')
            .setRequired(true)
            .setMaxValue(99)),
    async execute(interaction) {
        const amount = interaction.options.getInteger('number')
        logger.debug(`[${interaction.guild.name}][Clean] Clean input: ${amount}`)

        const deleted = await interaction.channel.bulkDelete(amount, true)
        await botReply(`Deleted ${deleted.size} messages (messages older than 14 days are skipped).`, interaction.channel, interaction)
    },
};
