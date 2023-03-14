const { SlashCommandBuilder } = require('@discordjs/builders');

function sleep(s) {
    return new Promise(resolve => setTimeout(resolve, s * 1000));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sleep')
        .setDescription('Sleeps for the given amount of seconds')
        .addIntegerOption((option) => option
            .setName('seconds')
            .setDescription('The amound of seconds you want the bot to sleep')
            .setRequired(true)),
    async execute(interaction) {
        try {
            const seconds = interaction.options.getInteger("seconds")
            console.log(seconds)
            // do something here
            await interaction.reply({ content: 'ZzZzZzZ...', ephemeral: true }); // indicate that the command is being processed
            sleep(seconds).then(() => { interaction.deleteReply() });

            // no need to send any response back to the user
        } catch (error) {
            console.error(error);
        }
    },
};