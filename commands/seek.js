const { SlashCommandBuilder } = require('@discordjs/builders');
const sleepFunc = require('./sleep_function/sleepFunc');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Make the bot seek to a certain second in the song')
        .addIntegerOption((option) => option
            .setName('second')
            .setDescription('The second you want the bot to skip to')
            .setRequired(true)),
    async execute(interaction, client) {
        //Indicate that the command is being processed
        //TODO: Implement to be able to give minute and second
        const second = interaction.options.getInteger("second")
        interaction.reply({ content: `Seeking into the song for you at second ${second}..`}); 
        
        if(client.botMap.has(interaction.guild.id)){
            try{
                client.botMap.get(message.guild.id).musicBot.seek(second)
            } catch (e) {
                interaction.editReply("Your input exceeds the time limit of the video!")
            }
        }
    },
};