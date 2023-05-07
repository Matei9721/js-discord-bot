const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Make the bot leave from the voice channel'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Leaving the voice channel..'}); 
        
        if(client.botMap.has(interaction.channel.guild.id)) {
            client.botMap.get(interaction.channel.guild.id).leaveMusic()
        }
    },
};