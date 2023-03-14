const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const fs = require('fs');
// Initialize env file for BOT TOKEN
const dotenv = require('dotenv');
dotenv.config();

const token = process.env.BOT_TOKEN

const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
}

const rest = new REST({ version: '9' }).setToken(token);

module.exports = async function () {
    try {
        const guildID = process.env.GUILD_ID
        const CLIENT_ID = process.env.CLIENT_ID
        console.log('Started refreshing application (/) commands.');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
};