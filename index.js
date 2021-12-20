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

const queue = new Map();

let connection;



const { Client, Intents } = require('discord.js');

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
    const serverQueue = queue.get((client.guilds.cache.get(guildID)));

    if(message.content.startsWith("!join")){
        execute(message, serverQueue);
        return;
    } else if(message.content === "bot get him") {
        message.channel.send("you fell off + ratio + who asked + no u + deez nuts + radio + don't care + didn't ask + caught in 4k + cope + seethe + GG + your mom's + the hood watches markiplier now + grow up + L + L (part 2) + retweet + ligma + taco bell tortilla crunch + think outside the bun + ur benched + ur a wrench + i own you + ur dad fell off + my dad could beat ur dad up + silver elite + tryhard + boomer + ur beta + L (part 3) + ur sus + quote tweet + you're cringe + i did your mom + you bought monkey nft + you're weirdchamp + you're a clown + my dad owns steam")
    } else if(message.content ==="!leave") {
        command_list.leave(connection)
    } else if(message.content.startsWith("!search")) {

        let [first, ...rest] = message.content.split(' ')
        rest = rest.join(' ')
        youtube.GetListByKeyword(rest,true,2).then(res=>{
            console.log("Page1");
            console.log(res.items[0]["id"]);

            youtube.NextPage(res.nextPage,true,2).then(result=>{
                console.log("Page2");
                console.log(result);
                youtube.NextPage(result.nextPage,true,2).then(result1=>{
                    console.log("Page3");
                    console.log(result1);
                }).catch(err=>{
                    console.log(err);
                })
            }).catch(err=>{
                console.log(err);
            });
        }).catch(err=>{
            console.log(err);
        });


    }
})

let player = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
    }
})

async function playSong(rest) {
    console.log(rest)
    let url;
    if (rest.includes("https")) {
        url = rest;
        console.log("link")
    } else {
        console.log("no link")
        await youtube.GetListByKeyword(rest, true, 2).then(res => {
            console.log("Page1");
            console.log(res.items[0]["id"]);
            url = "https://www.youtube.com/watch?v=".concat(res.items[0]["id"])

        }).catch(err => {
            console.log(err);
        });
        console.log(url)
    }

    console.log(url)
    let stream = await play.stream(url)
    let resource = createAudioResource(stream.stream, {
        inputType : stream.type
    })

    player.play(resource);


}


async function execute(message, serverQueue) {
    let [first, ...rest] = message.content.split(' ')
    rest = rest.join(' ')

    const voiceChannel = message.member.voice.channel;


    if (!voiceChannel)
        return message.channel.send(
            "I am an idiot bot and I don't know what to do if you are not in a voice room"
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "I need the permissions to join and speak in your voice channel!"
        );
    }
    await playSong(rest);
    console.log('Song is ready to play!');
    console.log(message.member.voice.channel.id)
    connection = joinVoiceChannel({
        channelId: message.member.voice.channel.id,
        guildId: message.guild.id,
        adapterCreator: message.guild.voiceAdapterCreator
    })

    await entersState(connection, VoiceConnectionStatus.Ready, 30e3);

    connection.subscribe(player);

}

player.on('error', error => {
    console.error(error);
});

client.login(token);