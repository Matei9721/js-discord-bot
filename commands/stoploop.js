const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stoploop')
        .setDescription('Make the bot stop looping songs'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Will no longer loop songs..'});

        if(client.botMap.has(interaction.guild.id)) {
            client.botMap.get(interaction.guild.id).musicBot.stopLoop()
        }
    },
};