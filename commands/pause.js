const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Make the bot pause the current song'),
    async execute(interaction, client) {
        if(client.botMap.has(interaction.guild.id)) {
            client.botMap.get(interaction.guild.id).player.pause()
        }
        interaction.reply("Gusi?");
        interaction.deleteReply();
    },
};