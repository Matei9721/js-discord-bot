const { SlashCommandBuilder } = require('@discordjs/builders');
const sleepFunc = require('./sleep_function/sleepFunc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dequeue')
        .setDescription('Removes a specific song from the queue')
        .addIntegerOption((option) => option
            .setName('position')
            .setDescription('The position of the song in queue')
            .setRequired(true)),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Removing the song from the queue for you..'});
        const position = interaction.options.getInteger("position")
        if(client.botMap.has(interaction.guild.id)) {
            client.botMap.get(interaction.guild.id).musicBot.removeSongAt(position, interaction.channel)
        }
    },
};