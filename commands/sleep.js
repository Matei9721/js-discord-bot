const { SlashCommandBuilder } = require('@discordjs/builders');
const sleepFunc = require('./sleep_function/sleepFunc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sleep')
        .setDescription('Sleeps for the given amount of seconds')
        .addIntegerOption((option) => option
            .setName('seconds')
            .setDescription('The number of seconds you want the bot to sleep')
            .setRequired(true)),
    async execute(interaction) {
        try {
            const seconds = interaction.options.getInteger("seconds")
            // do something here
            await interaction.reply({ content: 'ZzZzZzZ...', ephemeral: true }); // indicate that the command is being processed
            sleepFunc(seconds).then(() => { interaction.deleteReply() })
            // no need to send any response back to the user
        } catch (error) {
            logger.error(error);
        }
    },
};