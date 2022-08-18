const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Prints the song queue'),
    async execute(interaction, client) {
        client.botMap.get(interaction.guild.id).getQueue();
        interaction.reply("Gusi?");
        interaction.deleteReply();
    },
};