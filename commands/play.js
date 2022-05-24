const { SlashCommandBuilder } = require('@discordjs/builders');

// <:weeb:814805991002210315>
let bots = require('../botInstance')

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song from youtube using link or name')
        .addStringOption((option) => option
            .setName('song')
            .setDescription('The url or name of the song')
            .setRequired(true)),


    async execute(interaction, client) {
        if(!client.botMap.has(interaction.guild.id)) {
            let bot = new bots.botInstance();
            client.botMap.set(interaction.guild.id, bot);
        }
        try {
            await client.botMap.get(interaction.guild.id).execute(interaction, interaction.options.getString("song"));
            interaction.reply("᲼᲼")
        } catch (err) {
            console.log(err)
        }
    },
};