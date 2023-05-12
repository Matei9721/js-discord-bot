const play = require('play-dl')
const command_list = require('./commands')
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

// Main logic for detecting changes in voice channel
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    //Checks and returns if the state change concerns the bot, otherwise continue
    if(newState.member.user.id !== process.env.Client_ID) return logger.debug("Voice update does not concern me")

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

    if(message.content.startsWith("!")) logger.debug("Command received: " + message.content)

    if(message.content.startsWith("!play")){
        command_list.play(client, message)
    } else if(message.content.startsWith("bot get him")) {
        command_list.botGetHim(client, message)
    } else if(message.content.startsWith("!leave")) {
        command_list.leave(client, message)
    } else if(message.content.startsWith("!skip")) {
        command_list.skip(client, message)
    } else if(message.content.startsWith("!pause")) {
        command_list.pause(client, message)
    } else if (message.content.startsWith("!resume")) {
        command_list.resume(client, message)
    } else if(message.content.startsWith("!queue")) {
        command_list.queue(client, message)
    } else if(message.content.startsWith("!clean")) {
        command_list.clean(client, message)
    } else if(message.content.startsWith("!seek")) {
        command_list.seek(client, message)
    }
})

logger.info("Successfully logged in and running!")
client.login(token);