const { SlashCommandBuilder } = require('@discordjs/builders');
const sleepFunc = require('./sleep_function/sleepFunc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Make the bot pause the current song'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Paused the song for you..'}); 
                
        if(client.botMap.has(interaction.guild.id)) {
            client.botMap.get(interaction.guild.id).musicBot.pause()
        }
    },
};