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

const queue = [];

let connection;
let channel;



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
        execute(message);
    } else if(message.content === "bot get him") {
        message.channel.send("you fell off + ratio + who asked + no u + deez nuts + radio + don't care + didn't ask + caught in 4k + cope + seethe + GG + your mom's + the hood watches markiplier now + grow up + L + L (part 2) + retweet + ligma + taco bell tortilla crunch + think outside the bun + ur benched + ur a wrench + i own you + ur dad fell off + my dad could beat ur dad up + silver elite + tryhard + boomer + ur beta + L (part 3) + ur sus + quote tweet + you're cringe + i did your mom + you bought monkey nft + you're weirdchamp + you're a clown + my dad owns steam")
    } else if(message.content ==="!leave") {
        command_list.leave(connection)
        connection = null;
    } else if(message.content.startsWith("!skip")) {
        if(queue.length === 0) {
            player.pause()
        } else {
            playSong()
            //player.play(getNextResource())
        }

    } else if(message.content.startsWith("!pause")) {
        player.pause()
    } else if (message.content.startsWith("!resume")) {
        player.unpause()
    } else if(message.content.startsWith("!queue")) {

        let fields = []

        queue.forEach(element => {
            let field = { name: element.metadata.title, value: element.metadata.url }
            fields.push(field)
        })

        const Embed = new MessageEmbed()
            .setColor('#0099ff')
            .setAuthor('Songs in queue:', 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
              )
            .setDescription('There are ' + queue.length + ' more songs in the queue')
            .addFields(
                fields
            )

            .setTimestamp()

        channel.send({ embeds: [Embed] });

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

let player = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Play
    }
})

async function addResource(rest) {
    let url;
    let yt_info

    if(rest.includes("playlist")) {
        let songs_info = await play.playlist_info(rest)

        for(let i=0; i<songs_info.videos.length;i++) {

            let stream = await play.stream(songs_info.videos[i].url)
            let resource = createAudioResource(stream.stream, {
                inputType : stream.type,
                metadata : {
                    url : songs_info.videos[i].url,
                    title : songs_info.videos[i].title,
                    duration : songs_info.videos[i].durationRaw,
                    thumbnail : songs_info.videos[i].thumbnails[0].url
                }
            })

            queue.push(resource)

        }
        console.log(songs_info.videos)
    } else{

        if (rest.includes("https")) {
            yt_info = await play.search(rest, {limit : 1})
            url = rest;
        } else {
            yt_info = await play.search(rest, { limit : 1 })
            url = yt_info[0].url
        }

        console.log(url)
        let stream = await play.stream(url)
        let resource = createAudioResource(stream.stream, {
            inputType : stream.type,
            metadata : {
                url : url,
                title : yt_info[0].title,
                duration : yt_info[0].durationRaw,
                thumbnail : yt_info[0].thumbnails[0].url
            }
        })

        queue.push(resource)
    }


}

function getNextResource() {
    return queue.shift()
}

function playSong() {
    const resource = getNextResource()
    let description;
    if (queue.length > 0) {
        description = 'Next song in queue is ' + queue[0].metadata.title
    } else if (queue.length === 0) {
        description = 'Queue is empty'
    }

    const Embed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(resource.metadata.title)
        .setURL(resource.metadata.url)
        .setAuthor('Now playing', 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
            resource.metadata.url)
        .setDescription(description)
        .setThumbnail(resource.metadata.thumbnail)
        .addFields(
            { name: 'Song duration', value: resource.metadata.duration },
        )

        .setTimestamp()

    channel.send({ embeds: [Embed] });

    player.play(resource)
}

async function addToQueue(rest) {
    await addResource(rest)

    const resource = queue[queue.length-1]

    const Embed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(resource.metadata.title)
        .setURL(resource.metadata.url)
        .setAuthor('Queued song', 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
            resource.metadata.url)
        .setDescription('Remaining songs in queue until play: ' + String(queue.length - 1))
        .setThumbnail(resource.metadata.thumbnail)
        .addFields(
            { name: 'Song duration', value: resource.metadata.duration },
        )

        .setTimestamp()

    channel.send({ embeds: [Embed] });

}



async function execute(message) {
    let [first, ...rest] = message.content.split(' ')
    rest = rest.join(' ')

    channel = message.channel
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

    if(!connection) {
        console.log("here")
        await addResource(rest)
        // player.play(getNextResource())
        playSong()

        connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator
        })



        await entersState(connection, VoiceConnectionStatus.Ready, 30e3);

        connection.subscribe(player);


    } else {
        addToQueue(rest)
        if (player.state.status === "idle") {
            console.log("im idle")
            playSong()
        }
    }

}

player.on(AudioPlayerStatus.Idle, interaction => {

    channel.send("Finished playing")

    if(queue.length > 0) {
        channel.send("Playing next song")
        // player.play(getNextResource())
        playSong()

    }
});

player.on('error', error => {
    console.error(error);
});


client.login(token);