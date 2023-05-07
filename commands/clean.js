const { SlashCommandBuilder } = require('@discordjs/builders');
const sleepFunc = require('./sleep_function/sleepFunc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clean')
        .setDescription('Cleans the last specified messages')
        .addStringOption((option) => option
            .setName('number')
            .setDescription('The number of messages you want to delete')
            .setRequired(true)),
    async execute(interaction, client) {
        interaction.reply({ content: 'Deleting the messages..', ephemeral: true }); 
        sleepFunc(5).then(() => { interaction.deleteReply() })
        
        const amount = interaction.options.getInteger("number")
        if(amount >= 100) {
            interaction.reply("Maximum input value is 99")
            return;
        }
        interaction.channel.bulkDelete(amount + 1)
    },
};