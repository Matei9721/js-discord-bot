const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
const logger = require('./logging');

// Initialize env file for BOT TOKEN
const dotenv = require('dotenv');
dotenv.config();

const token = process.env.BOT_TOKEN

const commands = []
const commandsRet = new Map();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
    commandsRet.set(command.data.name, command);
}

const rest = new REST({ version: '9' }).setToken(token);

/**
 * Registers all slash commands to the server
 * @returns {Array} List of slash commands
 */
module.exports = async function () {
    try {
        //Note: uncomment this in if you want to register commands only to a specific server
        //const guildID = process.env.GUILD_ID
        const clientID = process.env.CLIENT_ID
        logger.info('Started refreshing application (/) commands.');
        await rest.put(
            //This version is for testing, by adding the commands only to a given guild
            //Routes.applicationGuildCommands(clientID, guildID),
            Routes.applicationCommands(clientID),
            { body: commands },
        );

        logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
        logger.error(error);
    }
    return commandsRet
};