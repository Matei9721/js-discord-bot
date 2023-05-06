const { SlashCommandBuilder } = require('@discordjs/builders');
const botInstanceSlash = require('../botInstanceSlash');
const sleep = require('../sleepFunc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song from youtube using link or name')
        .addStringOption((option) => option
            .setName('song')
            .setDescription('The url or name of the song')
            .setRequired(true)),


    async execute(interaction, client) {
        //Indicate that the command is being processed
        interaction.reply({ content: 'Loading the song(s) for you..', ephemeral: true }); 
        sleep(5).then(() => { interaction.deleteReply() })
        
        //If there is no player in the map, then add a new one
        if(!client.botMap.has(interaction.guild.id)) {
            let bot = new botInstanceSlash;
            client.botMap.set(interaction.guild.id, bot);
        }
           
        try {
            const input = interaction.options.get("song").value
            const bot = client.botMap.get(interaction.guild.id)
            const voiceChannel = interaction.member.voice.channel
            await bot.executeSong(interaction.channel, voiceChannel, input);
        } catch (err) {
            console.error(err)
        }

    },
};