const play = require('play-dl')
const logger = require('./logging');
const dotenv = require('dotenv');
dotenv.config();
const token = process.env.BOT_TOKEN

play.authorization()

const { Client, GatewayIntentBits, Events} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent] });

// Give map for playlists in client
client.botMap = new Map();

// Give command info to the client variable and initialize slash commands
const commandRegister = require("./commandRegister");
commandRegister().then(result => {
    client.commands = result
})

const command_list = require('./commands')
const command_list_lowercase = {}
Object.keys(command_list).forEach((key) => {
    command_list_lowercase[key.toLowerCase()] = command_list[key];
});


// Main logic for detecting changes in voice channel
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    console.log("INside listener")
    //Checks and returns if the state change concerns the bot, otherwise continue
    if(newState.member.user.id !== process.env.Client_ID) return

    // Represents a mute/deafen update
    if(oldState.channelId === newState.channelId) return logger.debug('Mute/Deafen Update');

    // Some connection
    if(!oldState.channelId && newState.channelId) return logger.debug('Connection Update');

    console.log("Almost there")
    // Disconnection
    if(oldState.channelId && !newState.channelId){
        console.log("Inside first if")
        // Bot was disconnected?
        if(client.botMap.has(newState.guild.id)) {
            console.log("Got into inner if")
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
        
        let command_name = message.content.split("!")[1].split(" ")[0].toLowerCase()
        if(command_name in command_list_lowercase) command_list_lowercase[command_name](client, message)
    }

    Object.keys(command_list).forEach((key) => {
        command_list_lowercase[key.toLowerCase()] = command_list[key];
    });

    //Left here as easter egg for the first command ever created
    if(message.content.startsWith("bot get him")) {
        command_list.botGetHim(client, message)
    } 
})

logger.info("Successfully logged in and running!")
client.login(token);