// const express = require("express");
const { joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    StreamType,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus, } = require('@discordjs/voice');
const { REST } = require('@discordjs/rest');
const play = require('play-dl')
const { Routes } = require('discord-api-types/v9');
const command_list = require('./commands')
const youtube=require('youtube-search-api');
// const app = express();

const dotenv = require('dotenv');
dotenv.config();
const token = process.env.BOT_TOKEN
const prefix = "!"

//play.authorization()

const commands = [{
    name: 'ping',
    description: 'Replies with Pong!'
}];

const rest = new REST({ version: '9' }).setToken(token);

(async () => {
    try {
        const guildID = '400698493301424129'
        const CLIENT_ID = '916452158814175293'
        console.log('Started refreshing application (/) commands.');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, guildID),
            { body: commands },
        );

        console.log('Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error(error);
    }
})();

const queue = [];

let connection;
let channel;

let bots = require('./botInstance')

let botMap = new Map()


const { Client, Intents, MessageEmbed  } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const guildID = '400698493301424129'
    const guild = client.guilds.cache.get(guildID)

});

client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    if (interaction.commandName === 'ping') {
        await interaction.reply('Pong!');
    }
});

client.on('messageCreate', (message) => {
    const guildID = '400698493301424129'

    if(message.content.startsWith("!play")){

        if(!botMap.has(message.guild.id)) {
            let bot = new bots.botInstance();
            botMap.set(message.guild.id, bot);
        }

        botMap.get(message.guild.id).execute(message);

    } else if(message.content === "bot get him") {
        message.channel.send("you fell off + ratio + who asked + no u + deez nuts + radio + don't care + didn't ask + caught in 4k + cope + seethe + GG + your mom's + the hood watches markiplier now + grow up + L + L (part 2) + retweet + ligma + taco bell tortilla crunch + think outside the bun + ur benched + ur a wrench + i own you + ur dad fell off + my dad could beat ur dad up + silver elite + tryhard + boomer + ur beta + L (part 3) + ur sus + quote tweet + you're cringe + i did your mom + you bought monkey nft + you're weirdchamp + you're a clown + my dad owns steam")
    } else if(message.content ==="!leave") {
        if(botMap.has(message.guild.id)) {
            command_list.leave(botMap.get(message.guild.id).connection)
            botMap.get(message.guild.id).connection = null;
        }

    } else if(message.content.startsWith("!skip")) {
        if(botMap.has(message.guild.id)) {
            let currentBot = botMap.get(message.guild.id);
            if(currentBot.queue.length === 0) {
                currentBot.player.pause()
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

})


client.login(token);