const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Make the bot pause the current song'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Paused the song for you..', ephemeral: true }); 
        sleep(3).then(() => { interaction.deleteReply() })
                
        if(client.botMap.has(interaction.guild.id)) {
            client.botMap.get(interaction.guild.id).player.pause()
        }
    },
};