const play = require('play-dl')
const command_list = require('./commands')

const dotenv = require('dotenv');
dotenv.config();
const token = process.env.BOT_TOKEN

play.authorization()
let bots = require('./botInstance')
let botMap = new Map()

const { Client, GatewayIntentBits, Events} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.MessageContent] });

//Give map for playlists in client
client.botMap = new Map();

//Give command info to the client variable and intialize slash commands
const func = require("./commandRegister");
func().then(result => {
    client.commands = result
})

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
        if(botMap.has(newState.guild.id)) {
            if (botMap.get(newState.guild.id).connection) {
                command_list.leave(botMap.get(newState.guild.id).connection)
            }
            botMap.get(newState.guild.id).connection = null;
            botMap.get(newState.guild.id).queue = [];
            botMap.get(newState.guild.id).setPLayer();
        }

        if(newState.id === client.user.id) return console.log(`${client.user.username} was disconnected from "${newState.guild.name}" server!`);
    }
});

//Main interaction logic for slash commands
client.on(Events.InteractionCreate, async interaction => {
    //Note: Webstorm might not see commandName, but when running it works
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
        if(!botMap.has(message.guild.id)) {
            let bot = new bots.botInstance();
            botMap.set(message.guild.id, bot);
        }
        try{
            botMap.get(message.guild.id).execute(message);
        } catch (err) {
            console.log("Error")
        }

    } else if(message.content.startsWith("bot get him")) {
        message.channel.send("you fell off + ratio + who asked + no u + deez nuts + radio + don't care + didn't ask +" +
            " caught in 4k + cope + seethe + GG + your mom's + the hood watches markiplier now + grow up + L +" +
            " L (part 2) + retweet + ligma + taco bell tortilla crunch + think outside the bun + ur benched + " +
            "ur a wrench + i own you + ur dad fell off + my dad could beat ur dad up + silver elite + tryhard +" +
            " boomer + ur beta + L (part 3) + ur sus + quote tweet + you're cringe + i did your mom +" +
            " you bought monkey nft + you're weirdchamp + you're a clown + my dad owns steam")

        // This is cursed
    } else if(message.content ==="!leave") {
        if(botMap.has(message.guild.id)) {
            if (botMap.get(message.guild.id).connection) {
                command_list.leave(botMap.get(message.guild.id).connection)
            }
            botMap.get(message.guild.id).connection = null;
            botMap.get(message.guild.id).queue = [];
            botMap.get(message.guild.id).setPLayer();
        }

    } else if(message.content.startsWith("!skip")) {
        if(botMap.has(message.guild.id)) {
            let currentBot = botMap.get(message.guild.id);
            if(currentBot.queue.length === 0) {
                currentBot.player.stop()
            } else {
                currentBot.playSong()
                //player.play(getNextResource())
            }
        }


    } else if(message.content.startsWith("!pause")) {
        if(botMap.has(message.guild.id)) {
            botMap.get(message.guild.id).player.pause()
        }

    } else if (message.content.startsWith("!resume")) {
        if(botMap.has(message.guild.id)){
            botMap.get(message.guild.id).player.unpause()
        }

    } else if(message.content.startsWith("!queue")) {
        botMap.get(message.guild.id).getQueue();
    } else if(message.content.startsWith("!clean")) {
        let [first, ...rest] = message.content.split(' ')
        rest = rest.join(' ')

        const amount = parseInt(rest,10)
        if(amount >= 100) {
            message.reply("Maximum input value is 99")
            return;
        }
        message.channel.bulkDelete(amount + 1)
    }
    else if(message.content.startsWith("!seek")) {
        if(botMap.has(message.guild.id)){
            console.log("seeking")
            botMap.get(message.guild.id).seekSong(message)
        }
    }

})


client.login(token);