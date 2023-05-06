const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the last song paused'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Resuming the song for you..', ephemeral: true }); 
        sleep(5).then(() => { interaction.deleteReply() })
        

        if(client.botMap.has(interaction.guild.id)){
            client.botMap.get(interaction.guild.id).player.unpause()
        }
    },
};