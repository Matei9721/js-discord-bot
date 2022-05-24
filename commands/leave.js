const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Make the bot leave from the voice channel'),
    async execute(interaction, client) {
        if(client.botMap.has(interaction.guild.id)) {
            let connection = client.botMap.get(interaction.guild.id).connection
            connection.destroy();
            connection = null;
            client.botMap.get(interaction.guild.id).connection = null;
            client.botMap.get(interaction.guild.id).queue = [];
            client.botMap.get(interaction.guild.id).setPlayer();
        }
        interaction.reply("Gusi?");
        interaction.deleteReply();
    },
};