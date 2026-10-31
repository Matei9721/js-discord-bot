const { SlashCommandBuilder } = require('discord.js');
const {botReply} = require("../bot-reply");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('beep')
		.setDescription('Replies with boop!'),
	async execute(interaction) {
		await botReply('boop!', interaction.channel, interaction);
	},
};
