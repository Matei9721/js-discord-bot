const { SlashCommandBuilder } = require('@discordjs/builders');
const sleepFunc = require('./sleep_function/sleepFunc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Prints the song queue'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Getting the queue for you..'});
        
        if(client.botMap.has(interaction.guild.id)){
            client.botMap.get(interaction.guild.id).musicBot.getQueue();
        }
    },
};