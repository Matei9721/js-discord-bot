const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Make the bot loop the current or next song'),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Will be looping the next/current song..'});

        if(client.botMap.has(interaction.guild.id)) {
            client.botMap.get(interaction.guild.id).musicBot.startLoop()
        }
    },
};