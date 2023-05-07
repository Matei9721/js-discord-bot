const play = require('play-dl')
const command_list = require('./commands')

const dotenv = require('dotenv');
dotenv.config();
const token = process.env.BOT_TOKEN

play.authorization()

const { Client, GatewayIntentBits, Events} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent] });

//Give map for playlists in client
client.botMap = new Map();

//Give command info to the client variable and intialize slash commands
const commandRegister = require("./commandRegister");
commandRegister().then(result => {
    client.commands = result
})

//Main logic for detecting changes in voice channel
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
    //Checks and returns if the state change concerns the bot, otherwise continue
    if(newState.member.user.id != process.env.Client_ID) return console.log("Voice update does not concern me")

    // Represents a mute/deafen update
    if(oldState.channelId === newState.channelId) return console.log('Mute/Deafen Update');

    // Some connection
    if(!oldState.channelId && newState.channelId) return console.log('Connection Update');

    // Disconnection
    if(oldState.channelId && !newState.channelId){
        // Bot was disconnected?
        if(client.botMap.has(newState.guild.id)) {
            client.botMap.get(newState.guild.id).leaveMusic()
        }

        if(newState.id === client.user.id) return console.log(`${client.user.username} was disconnected from "${newState.guild.name}" server!`);
    }
});

//Main interaction logic for slash commands
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isCommand()) return;
    const command = client.commands.get(interaction.commandName);
    try {
        await command.execute(interaction, client);
    } catch (err) {
        console.error(err);
    }
});

client.on(Events.MessageCreate, async message => {
    console.log("I got the message " + message.content)
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


client.login(token);