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

let bots = require('./botInstance')

const axios = require("axios")

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

let queue = [];

let connection;
let channel;

let botMap = new Map()



const { Client, Intents, MessageEmbed  } = require('discord.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] });

function getAnime() {
    axios.get("https://www.toptal.com/developers/feed2json/convert?url=https://www.livechart.me/feeds/episodes").then(
        data => {
            console.log(data.data)
            for(let i = 0; i < data.data.items.length; i++) {
                //console.log(data.data.items[i])
                if(data.data.items[i]["title"].includes("Kimetsu no Yaiba") ||
                    data.data.items[i]["title"].includes("Platinum End") ||
                    data.data.items[i]["title"].includes("Genjitsu Shugi Yuusha")) {
                    let message = "Episode " + String(data.data.items[i]["title"]).split("#")[1] + " of " +
                        String(data.data.items[i]["title"]).split("#")[0] + " came out today!"
                    client.channels.cache.get("916458075995656252").send(message)
                }
            }
        }
    )
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);

    const guildID = '400698493301424129'
    const guild = client.guilds.cache.get(guildID)

    // setTimeout(getAnime, 10000)

    // Runs methods once a day
    // setInterval(myFunction, 1000 * 60 * 60 * 24);
    getAnime()
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
        let current_bot = botMap.get(message.guild.id)
        command_list.leave(current_bot.connection)
        current_bot.connection = null;
        current_bot.player.stop()
        current_bot.queue = []
    } else if(message.content.startsWith("!skip")) {
        let current_bot = botMap.get(message.guild.id)
        if(current_bot.queue.length === 0) {
            current_bot.player.pause()
        } else {
            playSong(message.guild.id)
            //player.play(getNextResource())
        }

    } else if(message.content.startsWith("!pause")) {
        let current_bot = botMap.get(message.guild.id)
        current_bot.player.pause()
    } else if (message.content.startsWith("!resume")) {
        let current_bot = botMap.get(message.guild.id)
        current_bot.player.unpause()
    } else if(message.content.startsWith("!queue")) {
        let current_bot = botMap.get(message.guild.id)
        let fields = []

        current_bot.queue.forEach(element => {
            let field = { name: element.metadata.title, value: element.metadata.url }
            fields.push(field)
        })

        const Embed = new MessageEmbed()
            .setColor('#0099ff')
            .setAuthor('Songs in queue:', 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
              )
            .setDescription('There are ' + current_bot.queue.length + ' more songs in the queue')
            .addFields(
                fields
            )

            .setTimestamp()

        current_bot.channel.send({ embeds: [Embed] });

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

async function addResource(rest, guildID) {
    let first_song = true;
    let current_bot = botMap.get(guildID)
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

            current_bot.queue.push(resource)

            if(first_song) {
                if (current_bot.player.state.status === "idle") {
                    playSong(guildID)
                }
                first_song = false
            }

        }
        first_song = true;
        console.log("finished loding all song")
        //console.log(songs_info.videos)
    } else{

        if (rest.includes("https")) {
            yt_info = await play.search(rest, {limit : 1})
            console.log(yt_info)
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

        current_bot.queue.push(resource)
    }

    first_song = true;


}

function getNextResource(guildID) {
    let current_bot = botMap.get(guildID)
    return current_bot.queue.shift()
}

function playSong(guildID) {
    let current_bot = botMap.get(guildID)

    const resource = getNextResource(guildID)
    let description;
    if (current_bot.queue.length > 0) {
        description = 'Next song in queue is ' + current_bot.queue[0].metadata.title
    } else if (current_bot.queue.length === 0) {
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

    current_bot.channel.send({ embeds: [Embed] });

    current_bot.player.play(resource)

}

async function addToQueue(rest, guildID) {
    let current_bot = botMap.get(guildID)

    await addResource(rest, guildID)

    const resource = current_bot.queue[current_bot.queue.length-1]

    const Embed = new MessageEmbed()
        .setColor('#0099ff')
        .setTitle(resource.metadata.title)
        .setURL(resource.metadata.url)
        .setAuthor('Queued song', 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
            resource.metadata.url)
        .setDescription('Remaining songs in queue until play: ' + String(current_bot.queue.length - 1))
        .setThumbnail(resource.metadata.thumbnail)
        .addFields(
            { name: 'Song duration', value: resource.metadata.duration },
        )

        .setTimestamp()

    current_bot.channel.send({ embeds: [Embed] });

}



async function execute(message) {

    if(!botMap.has(message.guild.id)) {
        let bot = new bots.botInstance();
        botMap.set(message.guild.id, bot);

        bot.player.on(AudioPlayerStatus.Idle, interaction => {

            bot.channel.send("Finished playing")

            if(bot.queue.length > 0) {
                bot.channel.send("Playing next song")
                // player.play(getNextResource())
                playSong(message.guild.id)

            }
        });
    }

    let currentBot = botMap.get(message.guild.id)


    let [first, ...rest] = message.content.split(' ')
    rest = rest.join(' ')

    currentBot.channel = message.channel
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

    if(!currentBot.connection) {
        console.log("here")

        currentBot.connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: message.guild.id,
            adapterCreator: message.guild.voiceAdapterCreator
        })

        await entersState(currentBot.connection, VoiceConnectionStatus.Ready, 30e3);

        currentBot.connection.subscribe(currentBot.player);

        await addResource(rest, message.guild.id)
        //currentBot.player.play(getNextResource(message.guild.id))
        if (currentBot.player.state.status === "idle") {
            console.log("im idle")
            playSong(message.guild.id)
        }




    } else {
        await addToQueue(rest, message.guild.id)
        if (currentBot.player.state.status === "idle") {
            console.log("im idle")
            playSong(message.guild.id)
        }
    }

}

player.on('error', error => {
    console.error(error);
});



client.login(token);