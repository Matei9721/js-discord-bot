const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pop')
        .setDescription('Replies with Pop!'),
    async execute(interaction, client) {
        await interaction.reply('Pop!');
    },
};