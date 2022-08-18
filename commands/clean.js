const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clean')
        .setDescription('Cleans the last specified messages')
        .addStringOption((option) => option
            .setName('number')
            .setDescription('The number of messages you want to delete')
            .setRequired(true)),
    async execute(interaction, client) {
        let n = interaction.options.getString("number")

        const amount = parseInt(n,10)
        if(amount >= 100) {
            interaction.reply("Maximum input value is 99")
            return;
        }
        interaction.channel.bulkDelete(amount + 1)
        interaction.reply("Gusi?");
        interaction.deleteReply();
    },
};