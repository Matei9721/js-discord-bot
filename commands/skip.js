const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Make the bot skip the current song'),
    async execute(interaction, client) {
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