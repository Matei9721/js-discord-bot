const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Prints the song queue'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Getting the queue for you..', ephemeral: true }); 
        sleep(5).then(() => { interaction.deleteReply() })
        
        client.botMap.get(interaction.guild.id).getQueue();
    },
};