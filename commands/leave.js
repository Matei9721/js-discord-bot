const { SlashCommandBuilder } = require('@discordjs/builders');
const sleep = require('../sleepFunc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Make the bot leave from the voice channel'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Loading the song(s) for you..', ephemeral: true }); 
        sleep(5).then(() => { interaction.deleteReply() })
        
        if(client.botMap.has(interaction.channel.guild.id)) {
            if (client.botMap.get(interaction.channel.guild.id).connection) {
                let connection = client.botMap.get(interaction.channel.guild.id).connection
                connection.destroy()
                connection = null;
            }
            client.botMap.get(interaction.channel.guild.id).connection = null;
            client.botMap.get(interaction.channel.guild.id).queue = [];
            client.botMap.get(interaction.channel.guild.id).setPLayer();
        }
    },
};