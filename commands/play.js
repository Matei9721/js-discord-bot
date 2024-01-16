const { SlashCommandBuilder } = require('@discordjs/builders');
const botModel = require('../botModel');
const sleepFunc = require('./sleep_function/sleepFunc');
const logger = require('../logging');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song from YouTube or Spotify using link or name')
        .addStringOption((option) => option
            .setName('song')
            .setDescription('The URL or name of the song')
            .setRequired(true)),


    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Loading the song(s) for you..', ephemeral: true }); 
        sleepFunc(5).then(() => { interaction.deleteReply() })
        
        //If there is no player in the map, then add a new one
        if(!client.botMap.has(interaction.guild.id)) {
            client.botMap.set(interaction.guild.id, new botModel())
            logger.info("Created new instance for Guild " + interaction.guild.name)
        }
           
        try {
            const input = interaction.options.get("song").value
            const bot = client.botMap.get(interaction.guild.id)
            const voiceChannel = interaction.member.voice.channel
            await bot.musicBot.play(interaction.channel, voiceChannel, input);
        } catch (err) {
            console.error(err)
        }

    },
};