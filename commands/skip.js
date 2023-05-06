const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Make the bot skip the current song'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Skipping the song for you..', ephemeral: true }); 
        sleep(5).then(() => { interaction.deleteReply() })

        if(client.botMap.has(interaction.guild.id)) {
            let currentBot = client.botMap.get(interaction.guild.id);
            if(currentBot.queue.length === 0) {
                currentBot.player.stop()
            } else {
                currentBot.playSong()
            }
        }
        interaction.reply("Gusi?");
        interaction.deleteReply();
    },
};