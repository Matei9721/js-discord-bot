const { joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    entersState,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnectionStatus, } = require('@discordjs/voice');
const play = require('play-dl')
const {EmbedBuilder} = require("discord.js");

/*
index.js -> initializare bot, listenerii pt comenzi
botInstance.js -> Per server functionality
MusicQueue.js class -> Music functionality
AnimeSerach.js


*/
class botInstance {

    constructor() {
        this.queue = [];
        this.connection = null;
        this.channel = null;
        this.player = null;
        // TODO: Add loop functionality
        this.loop = false
        this.currentResource = null;

        this.setPLayer();
    }

    setPLayer() {
        this.player = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play
            }
        })

        this.player.on(AudioPlayerStatus.Idle, interaction => {

            //this.channel.send("Finished playing")

            if(this.queue.length > 0) {
                //this.channel.send("Playing next song")
                this.playSong()

            }
        });
    }

    async addResource(rest) {
        let url;
        let yt_info
        let first_song = true;

        if(rest.includes("playlist")) {
            let songs_info


            songs_info = await play.playlist_info(rest, {incomplete : true})



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

                this.queue.push(resource)

                if(first_song) {
                    if (this.player.state.status === "idle") {
                        this.playSong()
                    }
                    first_song = false
                }

            }
            first_song = true;
            console.log("finished loading all songs")
        } else{

            if (rest.includes("https")) {
                rest = rest.split("&")[0];
                yt_info = await play.search(rest, {limit : 1})
                console.log(yt_info)
                url = rest;
            } else {
                yt_info = await play.search(rest, { limit : 1 })
                url = yt_info[0].url
            }
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

            this.queue.push(resource)
        }


    }


    getQueue() {
        let fields = []

        this.queue.forEach(element => {
            let field = { name: element.metadata.title, value: element.metadata.url }
            fields.push(field)
        })

        const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setAuthor({name : 'Songs in queue:', iconURL: 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png'})
            .setDescription('There are ' + this.queue.length + ' more songs in the queue')
            .addFields(
                fields
            )

            .setTimestamp()

        this.channel.send({ embeds: [Embed] });
    }

    getNextResource() {
        let currentResource = this.queue.shift()
        this.currentResource = currentResource.metadata.url
        return currentResource
    }

    playSong() {
        const resource = this.getNextResource()
        let description;
        if (this.queue.length > 0) {
            description = 'Next song in queue is ' + this.queue[0].metadata.title
        } else if (this.queue.length === 0) {
            description = 'Queue is empty'
        }
        console.log(resource.metadata.url)
        const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(resource.metadata.title)
            .setURL(resource.metadata.url)
            .setAuthor({name: 'Now playing', inconURL: 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
                url: resource.metadata.url})
            .setDescription(description)
            .setThumbnail(resource.metadata.thumbnail)
            .addFields(
                { name: 'Song duration', value: resource.metadata.duration },
            )

            .setTimestamp()

        this.channel.send({ embeds: [Embed] });

        this.player.play(resource)
    }

    async addToQueue(rest) {
        if(this.player.state.status === "idle") {
            await this.addResource(rest)
            return
        }

        await this.addResource(rest)

        const resource = this.queue[this.queue.length-1]

        const Embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle(resource.metadata.title)
            .setURL(resource.metadata.url)
            .setAuthor({name: 'Queued song', iconURL: 'https://images.emojiterra.com/twitter/v13.1/512px/1f972.png',
                url:resource.metadata.url})
            .setDescription('Remaining songs in queue until play: ' + String(this.queue.length - 1))
            .setThumbnail(resource.metadata.thumbnail)
            .addFields(
                { name: 'Song duration', value: resource.metadata.duration },
            )

            .setTimestamp()

        this.channel.send({ embeds: [Embed] });

    }

    errorMessage(channel) {
        const Error = new EmbedBuilder()
            .setColor('#ff0000')
            .setTitle("Error while loading resource or playlist")
            .setDescription('Check the link of the resource or unavailable videos')
            .setTimestamp()

        channel.send({ embeds: [Error] });
    }

    async seekSong(message) {
        let seekTime = message.content.split(' ')[1]
        console.log(parseInt(seekTime))

        // Get the current resource being played by the AudioPlayer
        const url = this.currentResource
        try {
            let stream = await play.stream(url, { seek : parseInt(seekTime) })
            let shortResource = createAudioResource(stream.stream, {
                inputType : stream.type,
                metadata : {
                    url : url,
                }
            })
            this.player.stop()
            this.player.play(shortResource)
        } catch (err) {
            message.reply("Seek value exceeds limits!")
        }
    }

    async execute(message) {
        //Remove the message command and split the rest into words
        const arr = message.content.split(' ');
        arr.shift()

        //If the input is a url split on '&', otherwise join all the other words
        var input
        if(arr[0].includes("&")) input = arr[0].split("&")[0]
        else input = arr.join(' ')

        this.channel = message.channel
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

        if(!this.connection) {

            this.connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator
            })
            this.connection.on('stateChange', (old_state, new_state) => {
                if (old_state.status === VoiceConnectionStatus.Ready && new_state.status === VoiceConnectionStatus.Connecting) {
                    this.connection.configureNetworking();
                }
            })

            await entersState(this.connection, VoiceConnectionStatus.Ready, 30e3);

            this.connection.subscribe(this.player);

            try{
                await this.addResource(input)
            } catch (err) {
                console.log(err)
                //this.errorMessage(this.channel)
            }

            if (this.player.state.status === "idle") {
                console.log("im idle")
                try {
                    this.playSong()
                } catch (err) {
                    this.errorMessage(this.channel)
                    console.log(err)

                }

            }

        } else {
            try {
                await this.addToQueue(input)
                if (this.player.state.status === "idle") {
                    console.log("im idle")

                    this.playSong()
                }
            } catch (err) {
                this.errorMessage(this.channel)
                console.log(err)
            }

        }

    }
}



module.exports = {
    botInstance: botInstance
}
