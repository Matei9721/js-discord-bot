const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resume the last song paused'),
    async execute(interaction, client) {
        if(client.botMap.has(interaction.guild.id)){
            client.botMap.get(interaction.guild.id).player.unpause()
        }
        interaction.reply("Gusi?");
        interaction.deleteReply();
    },
};