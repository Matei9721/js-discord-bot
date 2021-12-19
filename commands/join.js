const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('Join a voice room!'),
	async execute(interaction, connection) {
    connection = 1;
		await interaction.reply('Pong!');
    console.log(connection)

    return connection;
	},
};