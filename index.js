const play = require('play-dl')
const logger = require('./logging');
const dotenv = require('dotenv');
const natural = require('natural');
const command_list = require('./commands')

// Give command info to the client variable and initialize slash commands
const commandRegister = require("./commandRegister");

dotenv.config();
const token = process.env.BOT_TOKEN

play.authorization()

const { Client, GatewayIntentBits, Events} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent] });

// Give map for playlists in client
client.botMap = new Map();

commandRegister().then(result => {
    client.commands = result
})

const command_list_lowercase = {}
let available_commands = []
Object.keys(command_list).forEach((key) => {
    command_list_lowercase[key.toLowerCase()] = command_list[key];
    available_commands.push(key.toLowerCase())
});

// Function to find the best match
function matchCommand(input) {
    let bestMatch = "no command";
    let bestDistance = Infinity;
    const maxDistance = 3

    for (const command of available_commands) {
        const distance = natural.LevenshteinDistance(input, command);

        if (distance < bestDistance && distance < maxDistance) {
            bestMatch = command;
            bestDistance = distance;
        }
    }

    return bestMatch;
}


// Main logic for detecting changes in voice channel
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    //Checks and returns if the state change concerns the bot, otherwise continue
    if(newState.member.user.id !== process.env.Client_ID) return

    // Represents a mute/deafen update
    if(oldState.channelId === newState.channelId) return logger.debug('Mute/Deafen Update');

    // Some connection
    if(!oldState.channelId && newState.channelId) return logger.debug('Connection Update');

    // Disconnection
    if(oldState.channelId && !newState.channelId){
        // Bot was disconnected?
        if(client.botMap.has(newState.guild.id)) {
            client.botMap.get(newState.guild.id).leaveMusic()
        }

        if(newState.id === client.user.id) return logger.debug(`${client.user.username} was disconnected from "${newState.guild.name}" server!`);
    }
});

// Main interaction logic for slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    try {
        await command.execute(interaction, client);
    } catch (err) {
        logger.error(err);
    }
});

// Main interaction logic for ! commands
client.on(Events.MessageCreate, async message => {
    if(message.content.startsWith("!")) {
        logger.debug("Command received: " + message.content)
        
        let command_name = matchCommand(message.content.split("!")[1].split(" ")[0].toLowerCase())
        if(command_name in command_list_lowercase) command_list_lowercase[command_name](client, message)
    }

    //Left here as easter egg for the first command ever created
    if(message.content.startsWith("bot get him")) {
        command_list.botGetHim(client, message)
    } 
})

logger.info("Successfully logged in and running!")
client.login(token);