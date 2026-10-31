const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
function loadCommands() {
    const result = new Map();
    for (const file of fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js')).sort()) {
        const command = require(path.join(__dirname, 'commands', file));
        result.set(command.data.name, command);
    }
    return result;
}
async function registerCommands(commands = loadCommands(), rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN)) {
    const route = process.env.GUILD_ID
        ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
        : Routes.applicationCommands(process.env.CLIENT_ID);
    await rest.put(route, { body: [...commands.values()].map(command => command.data.toJSON()) });
    return commands;
}
module.exports = { loadCommands, registerCommands };
